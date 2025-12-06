import * as fs from "fs-extra";
import * as Path from "path";
import { app, shell, ipcMain } from "electron";
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
    await shell.showItemInFolder(path);
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

const mainProcessInstance = new MainProcessApi();

// =============================================================================
// Native Electron IPC handlers
// =============================================================================
// Using ipcMain.handle() instead of electron-call because:
// 1. No race conditions - ipcMain is always available
// 2. Works with Playwright E2E tests
// 3. Simpler, no magic preload injection
// =============================================================================

ipcMain.handle("MainProcessApi.trashItem", async (_event, path: string) => {
  return mainProcessInstance.trashItem(path);
});

ipcMain.handle(
  "MainProcessApi.validateImdiAsync",
  async (_event, imdiContents: string) => {
    return mainProcessInstance.validateImdiAsync(imdiContents);
  }
);

ipcMain.handle("MainProcessApi.findInPage", async (_event, pattern: string) => {
  return mainProcessInstance.findInPage(pattern);
});

ipcMain.handle(
  "MainProcessApi.stopFindInPage",
  async (
    _event,
    action: "clearSelection" | "keepSelection" | "activateSelection"
  ) => {
    return mainProcessInstance.stopFindInPage(action);
  }
);

ipcMain.handle(
  "MainProcessApi.prepareImdiExportDirectory",
  async (_event, rootDirectory: string) => {
    return mainProcessInstance.prepareImdiExportDirectory(rootDirectory);
  }
);

ipcMain.handle(
  "MainProcessApi.writeImdiSessionData",
  async (_event, data: ExportSessionData) => {
    return mainProcessInstance.writeImdiSessionData(data);
  }
);

ipcMain.handle(
  "MainProcessApi.writeImdiCorpusData",
  async (_event, data: ExportCorpusData) => {
    return mainProcessInstance.writeImdiCorpusData(data);
  }
);

ipcMain.handle(
  "MainProcessApi.cleanupImdiExportDirectory",
  async (_event, rootDirectory: string) => {
    return mainProcessInstance.cleanupImdiExportDirectory(rootDirectory);
  }
);

ipcMain.handle(
  "MainProcessApi.cancelImdiExportCopyOperations",
  async (_event) => {
    return mainProcessInstance.cancelImdiExportCopyOperations();
  }
);

ipcMain.handle("MainProcessApi.hasActiveImdiCopyOperations", async (_event) => {
  return mainProcessInstance.hasActiveImdiCopyOperations();
});

ipcMain.handle(
  "MainProcessApi.revealInFolder",
  async (_event, path: string) => {
    return mainProcessInstance.revealInFolder(path);
  }
);
