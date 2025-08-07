import { XMLValidationResult } from "xmllint-wasm";

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

  public revealInFolder(path: string) {
    // Mock implementation - noop
  }
}
