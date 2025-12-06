import { XMLValidationResult } from "xmllint-wasm";
import {
  ExportSessionData,
  ExportCorpusData
} from "../../export/ExportBundleTypes";

/**
 * MOCK VERSION of MainProcessApi
 *
 * This is a mock implementation used during Vitest testing. It provides safe,
 * predictable implementations of electron main process functions that don't
 * rely on the actual Electron environment during testing.
 *
 * This mock is automatically loaded when tests run due to environment detection
 * in the main MainProcessApiAccess.ts file (checking for VITEST_POOL_ID and
 * VITEST_WORKER_ID environment variables).
 */
export class MainProcessApi {
  public trashItem(path: string): Promise<boolean> {
    // just always return true
    return Promise.resolve(true);
  }

  // We're doing this in the main process because I didn't get xmllint-wasm to work in the render process.
  // It has a browser build, but I couldn't get it loaded in vite. Could try again later.
  public async validateImdiAsync(
    imdiContents: string
  ): Promise<XMLValidationResult> {
    const r: XMLValidationResult = {
      valid: true,
      normalized: "",
      rawOutput: "",
      errors: [
        {
          loc: null,
          message: "",
          rawMessage: ""
        }
      ]
    };
    return r;
  }

  public findInPage(pattern: string) {
    // Mock implementation - simplified without tracking state
  }

  public stopFindInPage(
    action: "clearSelection" | "keepSelection" | "activateSelection"
  ) {
    // Mock implementation
  }

  // IMDI Export file I/O methods - mock implementations for testing
  public async prepareImdiExportDirectory(
    rootDirectory: string
  ): Promise<void> {
    // Mock - do nothing in tests
  }

  public async cleanupImdiExportDirectory(
    rootDirectory: string
  ): Promise<void> {
    // Mock - do nothing in tests
  }

  public async writeImdiSessionData(
    data: ExportSessionData
  ): Promise<{ filesWritten: number; errors: string[] }> {
    // Mock - pretend all files were written successfully
    return { filesWritten: data.filesToCopy.length, errors: [] };
  }

  public async writeImdiCorpusData(data: ExportCorpusData): Promise<void> {
    // Mock - do nothing in tests
  }

  public cancelImdiExportCopyOperations(): void {
    // Mock implementation - nothing to cancel in tests
  }

  public hasActiveImdiCopyOperations(): boolean {
    // Mock implementation - no active operations in tests
    return false;
  }

  public async revealInFolder(path: string): Promise<void> {
    // Mock implementation - do nothing in tests
  }
}
