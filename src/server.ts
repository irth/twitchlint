"use strict";

import {
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
  IConnection,
  TextDocuments,
  InitializeResult,
  TextDocumentSyncKind,
  Diagnostic,
  DiagnosticSeverity,
  TextDocument
} from "vscode-languageserver";

let connection: IConnection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);

let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

let suggestions: { [uri: string]: Diagnostic[] } = {};

function addSuggestion(uri, line, author, text) {
  if (suggestions[uri] == null) suggestions[uri] = [];
  suggestions[uri].push({
    severity: DiagnosticSeverity.Information,
    range: {
      start: { line, character: 0 },
      end: { line, character: Number.MAX_VALUE }
    },
    message: text,
    source: `Twitch: ${author}`
  });
  sendSuggestions(uri);
}

function removeSuggestionsAtLine({ uri, line }) {
  if (suggestions[uri] == null) return;
  suggestions[uri] = suggestions[uri].filter(
    suggestion => suggestion.range.start.line !== line
  );
  if (suggestions[uri].length === 0) suggestions[uri] = undefined;
  sendSuggestions(uri);
}

function removeSuggestionsFromFile({ uri }) {
  suggestions[uri] = undefined;
  sendSuggestions(uri);
}

function clearAllSuggestions() {
  suggestions = {};
  documents.keys().forEach(uri => sendSuggestions(uri));
}

function sendSuggestions(uri) {
  connection.sendDiagnostics({ uri, diagnostics: suggestions[uri] || [] });
}

connection.onNotification("removeSuggestionsAtLine", removeSuggestionsAtLine);

connection.onNotification(
  "removeSuggestionsFromFile",
  removeSuggestionsFromFile
);

connection.onNotification("clearAllSuggestions", clearAllSuggestions);

let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
  connection.sendNotification("connected");
  workspaceRoot = params.rootPath;

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.None
    }
  };
});

documents.onDidChangeContent(e => {
  if (suggestions[e.document.uri] == null) return;
  suggestions[e.document.uri] = suggestions[e.document.uri].filter(
    suggestion => suggestion.range.start.line < e.document.lineCount
  );
  sendSuggestions(e.document.uri);
});

connection.listen();

const irc = require("irc");

interface Settings {
  twitchlint: TwitchlintSettings;
}

// These are the example settings we defined in the client's package.json
// file
interface TwitchlintSettings {
  connect: boolean;
  server: string;
  nickname: string;
  channel: string;
  password: string;
  command: string;
  port: number;
}

function connectIRC(config: TwitchlintSettings) {
  if (!config.connect) return () => {};

  let ircConfig = {
    channels: [config.channel],
    port: config.port
  };

  if (config.password.length !== 0) ircConfig["password"] = config.password;

  var client = new irc.Client(config.server, config.nickname, ircConfig);

  client.addListener("error", function(message) {
    console.log("error: ", message);
  });

  client.addListener("message", function(from, to, message) {
    if (to[0] !== "#") return;
    const parts = message.split(" ");
    if (parts[0] !== config.command) return;
    if (parts.length < 4) {
      client.say(
        to,
        `Not enough arguments, use "${config.command} <filepath> <line number> <suggestion...>"`
      );
      return;
    }

    const filepath = parts[1];
    const matches = documents.keys().filter(uri => uri.indexOf(filepath) != -1);
    if (matches.length > 1) {
      client.say(
        to,
        `More than one file found: ${matches
          .slice(0, 3)
          .join(", ")}${matches.length > 3 ? "..." : "."} Be more specific.`
      );
      return;
    }
    if (matches.length < 0) {
      client.say(to, `No files found.`);
      return;
    }
    const match = matches[0];
    const lineNo = Number.parseInt(parts[2]);

    if (Number.isNaN(lineNo)) {
      client.say(to, `The line number you provided is not a number.`);
      return;
    }

    let document: TextDocument = documents.get(match);
    if (lineNo > document.lineCount || lineNo < 1) {
      client.say(
        to,
        `The line with the number you provided doesn't exist in this file.`
      );
      return;
    }

    const suggestion = parts.slice(3).join(" ");
    addSuggestion(match, lineNo - 1, from, suggestion);
    client.say(to, "Thank you for your suggestion.");
  });

  return () => client.disconnect();
}

let settings: TwitchlintSettings = {
  connect: false,
  server: "irc.chat.twitch.tv",
  port: 6667,
  password: "",
  nickname: "TwitchUsername",
  channel: "#ChannelName",
  command: ":lint"
};

let disconnect = connectIRC(settings);

connection.onDidChangeConfiguration(change => {
  settings = (<Settings>change.settings).twitchlint;
  console.log("Configuration change detected. Reconnecting...");
  disconnect();
  disconnect = connectIRC(settings);
});
