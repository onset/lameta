import { webUtils } from "electron";

console.log("[Preload] Starting preload script execution");

// Since contextIsolation is false, we can directly attach to window
try {
  // need for DropZone
  (window as any).electronAPI = {
    getPathForFile: (file: File) => webUtils.getPathForFile(file)
  };
  console.log("[Preload] Successfully set window.electronAPI");
} catch (error) {
  console.error("[Preload] Failed to set window.electronAPI:", error);
}

export {};
