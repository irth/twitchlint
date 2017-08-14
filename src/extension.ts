"use strict";
import * as vscode from "vscode";

import * as path from "path";
import {
  LanguageClient,
  LanguageClientOptions,
  SettingMonitor,
  ServerOptions,
  TransportKind
} from "vscode-languageclient";

let languageClient: LanguageClient = null;

function registerCommand(context, name, handler) {
  let disposable = vscode.commands.registerCommand(name, handler);
  context.subscriptions.push(disposable);
}

export function activate(context: vscode.ExtensionContext) {
  // set up the language server
  let serverModule = context.asAbsolutePath(
    path.join("out", "src", "server.js")
  );
  let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
  let serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  let clientOptions: LanguageClientOptions = {
    // Register the server for everything
    documentSelector: ["*"],
    synchronize: {
      // Synchronize the setting section to the server
      configurationSection: "twitchlint"
    }
  };

  languageClient = new LanguageClient(
    "twitchlint",
    "Twitchlint",
    serverOptions,
    clientOptions
  );

  languageClient.onReady().then(() => {
    languageClient.onNotification("connected", () => {
      vscode.window.showInformationMessage("Twitchlint: Connected.");
    });
  });

  registerCommand(context, "twitchlint.start", () => {
    vscode.window.showInformationMessage("Twitchlint: Starting...");
    languageClient.start();
  });

  registerCommand(context, "twitchlint.stop", () => {
    vscode.window.showInformationMessage("Twitchlint: Stopping...");
    languageClient.stop();
  });

  registerCommand(context, "twitchlint.removeSuggestionsAtLine", () => {
    const activeEditor = vscode.window.activeTextEditor;
    const params = {
      uri: activeEditor.document.uri.toString(),
      line: activeEditor.selection.start.line
    };
    languageClient.sendNotification("removeSuggestionsAtLine", params);
  });

  registerCommand(context, "twitchlint.removeSuggestionsFromFile", () => {
    const activeEditor = vscode.window.activeTextEditor;
    const params = {
      uri: activeEditor.document.uri.toString()
    };
    languageClient.sendNotification("removeSuggestionsFromFile", params);
  });

  registerCommand(context, "twitchlint.clearAllSuggestions", () => {
    languageClient.sendNotification("clearAllSuggestions");
  });
}

export function deactivate() {}
