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
  DiagnosticSeverity
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
}

function removeSuggestionsAtLine({ uri, line }) {
  if (suggestions[uri] == null) return;
  suggestions[uri] = suggestions[uri].filter(
    suggestion => suggestion.range.start.line !== line
  );
  if (suggestions[uri].length === 0) suggestions[uri] = undefined;
}

function removeSuggestionsFromFile({ uri }) {
  suggestions[uri] = undefined;
}

function clearAllSuggestions() {
  suggestions = {};
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

setInterval(
  () => console.log(documents.all().map(d => [d.uri, d.lineCount])),
  3000
);

connection.listen();
