import call from "electron-call";
import * as fs from "fs-extra";
import * as Path from "path";
import { app, dialog, shell } from "electron";
import { XMLValidationResult } from "xmllint-wasm";

import { validateImdiAsyncInternal } from "./validateImdi";
import { mainWindow } from "./main";
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
  // Export file I/O methods
  // These handle all file operations for export, keeping renderer responsive
  // ============================================================================

  /**
   * Prepare the export root directory (remove if exists, create fresh)
   */
  public async prepareExportDirectory(rootDirectory: string): Promise<void> {
    if (fs.existsSync(rootDirectory)) {
      await fs.remove(rootDirectory);
    }
    await fs.ensureDir(rootDirectory);
  }

  /**
   * Write a session's export data (IMDI XML and copy files)
   * Returns the number of files successfully copied.
   * Emits 'export-file-progress' events to renderer for each file.
   */
  public async writeExportSessionData(
    data: ExportSessionData
  ): Promise<{ filesWritten: number; errors: string[] }> {
    const errors: string[] = [];
    let filesWritten = 0;
    const totalFiles = data.filesToCopy.length;

    try {
      // Create required directories
      for (const dir of data.directoriesToCreate) {
        await fs.ensureDir(dir);
      }

      // Write IMDI XML file
      await fs.writeFile(data.imdiPath, data.imdiXml, "utf8");

      // Copy files with progress events
      for (let i = 0; i < data.filesToCopy.length; i++) {
        const copyReq = data.filesToCopy[i];
        const fileName = Path.basename(copyReq.source);

        // Emit progress event before copying
        mainWindow?.webContents.send("export-file-progress", {
          sessionName: data.displayName,
          currentFile: fileName,
          currentFileIndex: i + 1,
          totalFiles
        });

        try {
          await this.copyFileForExport(copyReq.source, copyReq.destination);
          filesWritten++;
        } catch (err) {
          const msg = `Failed to copy ${fileName}: ${err.message}`;
          errors.push(msg);
          console.error(msg);
        }
      }
    } catch (err) {
      errors.push(`Failed to write session data: ${err.message}`);
    }

    return { filesWritten, errors };
  }

  /**
   * Write the corpus IMDI file
   */
  public async writeExportCorpusData(data: ExportCorpusData): Promise<void> {
    const dir = Path.dirname(data.imdiPath);
    await fs.ensureDir(dir);
    await fs.writeFile(data.imdiPath, data.imdiXml, "utf8");
  }

  /**
   * Clean up a partial export directory (e.g., when export is cancelled)
   */
  public async cleanupExportDirectory(rootDirectory: string): Promise<void> {
    if (fs.existsSync(rootDirectory)) {
      await fs.remove(rootDirectory);
    }
  }

  /**
   * Cancel any active export copy operations
   * Currently a no-op since we use fs.copyFile which is not cancellable
   */
  public cancelExportCopyOperations(): void {
    // Currently using fs.copyFile which completes atomically
    // If we need cancellable copies in the future, we could use streams
  }

  /**
   * Check if there are any active copy operations
   */
  public hasActiveCopyOperations(): boolean {
    // Currently no tracking of active operations
    return false;
  }

  /**
   * Copy a single file for export, preserving timestamps
   * Uses async fs operations for better performance
   */
  private async copyFileForExport(
    source: string,
    destination: string
  ): Promise<void> {
    // Ensure destination directory exists
    await fs.ensureDir(Path.dirname(destination));

    // Copy the file
    await fs.copyFile(source, destination);

    // Preserve modification time
    const stat = await fs.stat(source);
    await fs.utimes(destination, stat.atime, stat.mtime);
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
