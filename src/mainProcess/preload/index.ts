import { ipcRenderer, webUtils } from "electron";

// For smoke testing: if this env var is set, deliberately throw to simulate a preload failure
if (process?.env?.SMOKE_THROW_IN_PRELOAD === "1") {
  throw new Error("SMOKE: forced preload throw");
}

// Preload with nodeIntegration:true + contextIsolation:false is incompatible with
// Playwright's Electron automation (causes "no access" errors in fs.realpathSync).
// So main.ts only uses preload if we're not in E2E test mode.
// For E2E tests, lametaE2ERunner.ts injects an equivalent electronAPI via page.evaluate().
try {
  // need for drag n' drop of files.
  (window as any).electronAPI = {
    getPathForFile: (file: File) => webUtils.getPathForFile(file)
  };
  try {
    ipcRenderer.send("preload-ready");
  } catch (e) {
    // If ipcRenderer is unavailable for some reason, surface but don't mask
    console.error("[Preload] Failed to send preload-ready:", e);
  }
} catch (error) {
  console.error("[Preload] Failed to set window.electronAPI:", error);
  throw error;
}

export {};
