// From any code in the Render process,
// import { mainProcessApi } from "../MainProcessApiAccess";
// mainProcessApi.someFunction(someArg).then()...

// notice, we're importing type info only. The code won't be loaded in the render process, won't be available in browser debugger
import type { MainProcessApi } from "./MainProcessApi";

// Define the public API interface
type MainProcessApiPublic = Pick<
  MainProcessApi,
  | "trashItem"
  | "validateImdiAsync"
  | "findInPage"
  | "stopFindInPage"
  | "prepareImdiExportDirectory"
  | "cleanupImdiExportDirectory"
  | "writeImdiSessionData"
  | "writeImdiCorpusData"
  | "cancelImdiExportCopyOperations"
  | "hasActiveImdiCopyOperations"
  | "revealInFolder"
>;

// =============================================================================
// Native Electron IPC Implementation
// =============================================================================
// Previously used electron-call, but it caused race conditions (LAM-27) due to
// dynamic preload injection that conflicted with Playwright E2E tests.
// Native ipcRenderer.invoke() is simpler, more reliable, and always works.
// =============================================================================

let _cachedApi: MainProcessApiPublic | null = null;
let _mockApi: MainProcessApiPublic | null = null;

// This shouldn't be needed, since there is a mock in __mocks__. But that isn't working at the moment.
if (process.env.VITEST_POOL_ID && process.env.VITEST_WORKER_ID) {
  import("./__mocks__/MainProcessApiAccess").then((m) => {
    // NB: don't try to use await here, it is currently breaking vite build
    _mockApi = m as unknown as MainProcessApiPublic;
  });
}

/**
 * Create native IPC implementation using ipcRenderer.invoke().
 */
function createNativeIpcApi(): MainProcessApiPublic {
  const { ipcRenderer } = require("electron");

  return {
    trashItem: (path: string) =>
      ipcRenderer.invoke("MainProcessApi.trashItem", path),
    validateImdiAsync: (imdiContents: string) =>
      ipcRenderer.invoke("MainProcessApi.validateImdiAsync", imdiContents),
    findInPage: (pattern: string) =>
      ipcRenderer.invoke("MainProcessApi.findInPage", pattern),
    stopFindInPage: (
      action: "clearSelection" | "keepSelection" | "activateSelection"
    ) => ipcRenderer.invoke("MainProcessApi.stopFindInPage", action),
    prepareImdiExportDirectory: (rootDirectory: string) =>
      ipcRenderer.invoke(
        "MainProcessApi.prepareImdiExportDirectory",
        rootDirectory
      ),
    writeImdiSessionData: (data: any) =>
      ipcRenderer.invoke("MainProcessApi.writeImdiSessionData", data),
    writeImdiCorpusData: (data: any) =>
      ipcRenderer.invoke("MainProcessApi.writeImdiCorpusData", data),
    cleanupImdiExportDirectory: (rootDirectory: string) =>
      ipcRenderer.invoke(
        "MainProcessApi.cleanupImdiExportDirectory",
        rootDirectory
      ),
    cancelImdiExportCopyOperations: () =>
      ipcRenderer.invoke("MainProcessApi.cancelImdiExportCopyOperations"),
    hasActiveImdiCopyOperations: () =>
      ipcRenderer.invoke("MainProcessApi.hasActiveImdiCopyOperations"),
    revealInFolder: (path: string) =>
      ipcRenderer.invoke("MainProcessApi.revealInFolder", path)
  };
}

function getMainProcessApiImpl(): MainProcessApiPublic {
  if (_mockApi) return _mockApi;
  if (!_cachedApi) {
    _cachedApi = createNativeIpcApi();
  }
  return _cachedApi;
}

// Create a proxy that lazily forwards all method calls
const mainProcessApi: MainProcessApiPublic = new Proxy(
  {} as MainProcessApiPublic,
  {
    get(_target, prop: keyof MainProcessApiPublic) {
      const impl = getMainProcessApiImpl();
      return impl[prop];
    }
  }
);

export { mainProcessApi };
