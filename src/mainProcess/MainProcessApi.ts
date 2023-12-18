import call from "electron-call";
import * as fs from "fs-extra";
import { app, shell } from "electron";
import { XMLValidationResult } from "xmllint-wasm";

import { validateImdiAsyncInternal } from "./validateImdi";

if (process.env.VITEST_POOL_ID && process.env.VITEST_WORKER_ID) {
  throw new Error(
    "MainProcessApiAccess should not be imported in unit tests. Mocking should have prevented this."
  );
}

// Put things here that y[ou want to run on the main process. You can then access them with:
// This is is using `electron-call` to produce type-safe wrappers that hide the IPC stuff.
// See MainProcessApiAccess for instructions on using this from the Render process.
export class MainProcessApi {
  // electron's trashItem not working in render process, so we provide this here
  // see https://github.com/electron/electron/issues/29598
  public trashItem(path: string): Promise<boolean> {
    return shell.trashItem(path).then(
      () => !fs.existsSync(path), // returned true but let's double-check
      () => false // reject
    );
  }

  // We're doing this in the main process because I didn't get xmllint-wasm to work in the render process.
  // It has a browser build, but I couldn't get it loaded in vite. Could try again later.
  public async validateImdiAsync(
    imdiContents: string
  ): Promise<XMLValidationResult> {
    return await validateImdiAsyncInternal(app.getAppPath(), imdiContents);
  }
}

const mainProcessInstance = new MainProcessApi();
call.provide("MainProcessApi", mainProcessInstance);
