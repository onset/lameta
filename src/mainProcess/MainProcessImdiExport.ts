import * as fs from "fs-extra";
import * as Path from "path";
import { BrowserWindow } from "electron";
import {
  ExportSessionData,
  ExportCorpusData,
  FileCopyRequest
} from "../export/ExportBundleTypes";

/**
 * IMDI export file I/O methods for the main process.
 * These handle all file operations for IMDI export, keeping renderer responsive.
 */
export class MainProcessImdiExport {
  constructor(private getMainWindow: () => BrowserWindow | null) {}

  /**
   * Prepare the IMDI export root directory (remove if exists, create fresh)
   */
  public async prepareImdiExportDirectory(
    rootDirectory: string
  ): Promise<void> {
    if (fs.existsSync(rootDirectory)) {
      await fs.remove(rootDirectory);
    }
    await fs.ensureDir(rootDirectory);
  }

  /**
   * Write a session's IMDI export data (IMDI XML and copy files)
   * Returns the number of files successfully copied.
   * Emits 'export-file-progress' events to renderer for each file.
   */
  public async writeImdiSessionData(
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
        this.getMainWindow()?.webContents.send("export-file-progress", {
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
  public async writeImdiCorpusData(data: ExportCorpusData): Promise<void> {
    const dir = Path.dirname(data.imdiPath);
    await fs.ensureDir(dir);
    await fs.writeFile(data.imdiPath, data.imdiXml, "utf8");
  }

  /**
   * Clean up a partial IMDI export directory (e.g., when export is cancelled)
   */
  public async cleanupImdiExportDirectory(
    rootDirectory: string
  ): Promise<void> {
    if (fs.existsSync(rootDirectory)) {
      await fs.remove(rootDirectory);
    }
  }

  /**
   * Cancel any active IMDI export copy operations
   * Currently a no-op since we use fs.copyFile which is not cancellable
   */
  public cancelImdiExportCopyOperations(): void {
    // Currently using fs.copyFile which completes atomically
    // If we need cancellable copies in the future, we could use streams
  }

  /**
   * Check if there are any active IMDI export copy operations
   */
  public hasActiveImdiCopyOperations(): boolean {
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
