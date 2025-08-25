import { ipcRenderer, webUtils } from "electron";

// For smoke testing: if this env var is set, deliberately throw to simulate a preload failure
if (process?.env?.SMOKE_THROW_IN_PRELOAD === "1") {
  throw new Error("SMOKE: forced preload throw");
}

// something about preload causes our playwright runs to hit a "noaccess" error.
// see test-launch.ts && https://linear.app/lameta/issue/LAM-27
// So currently, main.ts only uses preload if we're not in e2e test mode.
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
