import { webUtils } from "electron";

// something about preload causes our playwright runs to hit a "noaccess" error.
// see https://linear.app/lameta/issue/LAM-27
// So currently, main.ts only uses preload if we're not in e2e test mode.

try {
  // need for drag n' drop of files.
  (window as any).electronAPI = {
    getPathForFile: (file: File) => webUtils.getPathForFile(file)
  };
} catch (error) {
  console.error("[Preload] Failed to set window.electronAPI:", error);
  throw error;
}

export {};
