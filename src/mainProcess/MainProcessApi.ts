import call from "electron-call";
import * as fs from "fs-extra";
import * as Path from "path";
import { app, dialog, shell } from "electron";
import { XMLValidationResult } from "xmllint-wasm";

import { validateImdiAsyncInternal } from "./validateImdi";
import { mainWindow } from "./main";
import { MainProcessImdiExport } from "./MainProcessImdiExport";
import {
  ExportSessionData,
  ExportCorpusData,
  FileCopyRequest
} from "../export/ExportBundleTypes";

if (process.env.VITEST_POOL_ID && process.env.VITEST_WORKER_ID) {
  throw new Error(
    "MainProcessApiAccess should not be imported in unit tests. Mocking should have prevented this."
  );
}

// Put things here that y[ou want to run on the main process. You can then access them with:
// This is is using `electron-call` to produce type-safe wrappers that hide the IPC stuff.
// See MainProcessApiAccess for instructions on using this from the Render process.
export class MainProcessApi {
  private imdiExportHandler = new MainProcessImdiExport(() => mainWindow);

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

  private isFirstSearch: boolean = true;
  private currentSearchText: string = "";

  public findInPage(pattern: string) {
    if (pattern.trim() === "") {
      this.currentSearchText = "";
      mainWindow!.webContents.stopFindInPage("clearSelection");
      return;
    }
    if (this.currentSearchText !== pattern) {
      // New search term, start from the beginning
      this.isFirstSearch = true;
      this.currentSearchText = pattern;
    }

    mainWindow!.webContents.findInPage(pattern, {
      forward: true,
      findNext: !this.isFirstSearch
    });

    this.isFirstSearch = false;
  }

  public stopFindInPage(
    action: "clearSelection" | "keepSelection" | "activateSelection"
  ) {
    mainWindow!.webContents.stopFindInPage(action);
  }

  // On macOS, calling shell.showItemInFolder from a renderer can delay Finder until app quits.
  // So we need to do it in the Main Process
  public async revealInFolder(path: string) {
    await dialog.showMessageBox({ message: "reveal in folder" });

    const error = await shell.openPath("/Applications");

    await shell.showItemInFolder(path);
    await dialog.showMessageBox({
      type: error ? "error" : "info",
      message: `${path} ${
        error ? "Failed to open folder" : "Folder opened successfully"
      }`,
      detail: error || "Finder should now be showing /Applications"
    });

    //shell.openPath(path);
  }

  // ============================================================================
  // IMDI Export file I/O methods - delegated to MainProcessImdiExport
  // ============================================================================

  public async prepareImdiExportDirectory(
    rootDirectory: string
  ): Promise<void> {
    return this.imdiExportHandler.prepareImdiExportDirectory(rootDirectory);
  }

  public async writeImdiSessionData(
    data: ExportSessionData
  ): Promise<{ filesWritten: number; errors: string[] }> {
    return this.imdiExportHandler.writeImdiSessionData(data);
  }

  public async writeImdiCorpusData(data: ExportCorpusData): Promise<void> {
    return this.imdiExportHandler.writeImdiCorpusData(data);
  }

  public async cleanupImdiExportDirectory(
    rootDirectory: string
  ): Promise<void> {
    return this.imdiExportHandler.cleanupImdiExportDirectory(rootDirectory);
  }

  public cancelImdiExportCopyOperations(): void {
    return this.imdiExportHandler.cancelImdiExportCopyOperations();
  }

  public hasActiveImdiCopyOperations(): boolean {
    return this.imdiExportHandler.hasActiveImdiCopyOperations();
  }
}

// Note: call.initialize() was previously completely commented out because it caused
// Initialize electron-call for IPC bridge between renderer and main process.
// NOTE: Skipped for E2E tests due to "noaccess" race condition (LAM-27).
// This causes E2E tests that need mainProcessApi to fail - including hybrid export tests.
// See https://linear.app/lameta/issue/LAM-27
if (!process.env.E2E) {
  call.initialize();
}

const mainProcessInstance = new MainProcessApi();
call.provide("MainProcessApi", mainProcessInstance);
