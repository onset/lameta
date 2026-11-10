// Renderer side of installing updates. The main-process side is src/mainProcess/updater.ts.

import type { IpcRenderer } from "electron";

function ipc(): IpcRenderer {
  return require("electron").ipcRenderer;
}

// False in development, in end-to-end tests, and on Linux.
export function canInstallUpdates(): Promise<boolean> {
  return ipc().invoke("updater.canInstall");
}

// Downloads the installer of a GitHub release, such as v3.0.26-beta, and resolves with its
// version. onProgress gets the percentage downloaded.
export async function downloadRelease(
  tag: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  const listener = (_event: unknown, percent: number) => onProgress(percent);
  ipc().on("updater.progress", listener);
  try {
    return await ipc().invoke("updater.downloadRelease", tag);
  } finally {
    ipc().removeListener("updater.progress", listener);
  }
}

export function installNow(): Promise<void> {
  return ipc().invoke("updater.installNow");
}

// Installs the downloaded update when lameta quits.
export function installOnQuit(): Promise<void> {
  return ipc().invoke("updater.installOnQuit");
}

// In an alpha, checks for a newer alpha and starts downloading it. Resolves with its version and
// whether it has already finished downloading, or null when there is none (and always null
// outside an alpha).
export function checkForAlphaUpdate(): Promise<{ version: string; downloaded: boolean } | null> {
  return ipc().invoke("updater.checkAlpha");
}

// An alpha downloads its updates by itself; this tells the user that one will install.
export function onAlphaUpdateDownloaded(handler: (version: string) => void) {
  ipc().on("updater.alphaDownloaded", (_event, version: string) => handler(version));
}
