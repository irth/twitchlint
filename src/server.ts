"use strict";

import {
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
  IConnection,
  TextDocuments,
  InitializeResult,
  TextDocumentSyncKind
} from "vscode-languageserver";

let connection: IConnection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);

let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

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
