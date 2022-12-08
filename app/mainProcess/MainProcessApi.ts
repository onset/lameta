import call from "electron-call";
import * as fs from "fs-extra";
const electron = require("electron");
import * as os from "os";
// Put things here that y[ou want to run on the main process. You can then access them with:
// This is is using `electron-call` to produce type-safe wrappers that hide the IPC stuff.
// See MainProcessApiAccess for instructions on using this from the Render process.

export class MainProcessApi {
  // electron's trashItem not working in render process, so we provide this here
  // see https://github.com/electron/electron/issues/29598
  public trashItem(path: string): Promise<boolean> {
    return electron.shell.trashItem(path).then(
      () => !fs.existsSync(path), // returned true but let's double-check
      () => false // reject
    );
  }
  public test(): string {
    return "hello";
  }
}

const mainProcessInstance = new MainProcessApi();
call.provide("MainProcessApi", mainProcessInstance);
