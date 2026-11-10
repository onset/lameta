// Downloads and installs new versions of lameta with electron-updater.
//
// electron-updater reads latest.yml (Windows) or latest-mac.yml (Mac) from a folder, downloads
// the installer it names, checks its sha512, and installs it: silently with the NSIS installer
// on Windows, through Squirrel.Mac on the Mac. electron-builder makes those files for every
// release.
//
// - An alpha updates itself with no question asked. It reads the R2 alpha folder that the
//   share-lameta-alpha skill fills, because alpha releases on GitHub stay drafts, which only
//   the maintainers can see. The update installs when lameta quits.
// - A beta or full release asks first. ReleasesDialog picks the GitHub release to install and
//   calls downloadRelease, and then installNow when the user agrees to restart.
//
// The renderer side is src/other/updaterIpc.ts.

import { app, autoUpdater as electronAutoUpdater, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import { writeFileSync } from "fs";
import { join } from "path";
import { getTestEnvironment } from "../getTestEnvironment";

function canUpdate(): boolean {
  return (
    app.isPackaged &&
    !getTestEnvironment().E2E &&
    (process.platform === "win32" || process.platform === "darwin")
  );
}

let configured = false;
function configure() {
  if (configured) return;
  configured = true;
  // electron-updater takes the name of its download folder from app-update.yml in the app's
  // resources, which some lameta builds lack. Without the file it throws before downloading.
  // This file also leaves out the publisherName of app-update.yml, so electron-updater does
  // not check the Windows installer's signature against it; the sha512 check still runs.
  const configPath = join(app.getPath("userData"), "lameta-update.yml");
  writeFileSync(configPath, `updaterCacheDirName: ${app.getName().replace(/ /g, "-")}-updater\n`);
  autoUpdater.updateConfigPath = configPath;
  autoUpdater.autoDownload = false;
  // A beta or release update installs on quit only when the user chooses that (installOnQuit).
  // On the Mac this must be off while the update downloads: electron-updater then hands it to
  // Squirrel.Mac, which installs it on quit whatever the user chose.
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.logger = console;
}

function sendToWindows(channel: string, ...args: unknown[]) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.webContents.isDestroyed()) w.webContents.send(channel, ...args);
  }
}

function isAlpha() {
  return app.getVersion().includes("alpha");
}

let alphaConfigured = false;
let downloadedAlpha: string | undefined;
// Checks the R2 alpha folder and downloads a newer alpha if there is one. Resolves with that
// alpha's version and whether it has finished downloading, or null when this is the newest.
async function checkAlpha(): Promise<{ version: string; downloaded: boolean } | null> {
  if (!canUpdate() || !isAlpha()) return null;
  // checking again would only download it again
  if (downloadedAlpha) return { version: downloadedAlpha, downloaded: true };
  configure();
  if (!alphaConfigured) {
    alphaConfigured = true;
    autoUpdater.setFeedURL({
      provider: "generic",
      url: getTestEnvironment().LAMETA_ALPHA_UPDATE_URL,
    });
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("update-downloaded", (info) => {
      downloadedAlpha = info.version;
      sendToWindows("updater.alphaDownloaded", info.version);
    });
  }
  const result = await autoUpdater.checkForUpdates();
  return result?.isUpdateAvailable
    ? { version: result.updateInfo.version, downloaded: false }
    : null;
}

// Called once at startup. Does nothing unless this is an alpha.
export function startAlphaUpdates() {
  checkAlpha().catch((err) => console.error("Alpha update failed:", err));
}

// Help > Check for Updates, in an alpha
ipcMain.handle("updater.checkAlpha", () => checkAlpha());

ipcMain.handle("updater.canInstall", () => canUpdate());

// Downloads the installer of a GitHub release, such as v3.0.26-beta.
ipcMain.handle("updater.downloadRelease", async (_event, tag: string) => {
  if (!canUpdate()) throw new Error("This copy of lameta cannot install updates.");
  configure();
  autoUpdater.setFeedURL({
    provider: "generic",
    url: `https://github.com/${getTestEnvironment().LAMETA_RELEASES_REPO}/releases/download/${tag}/`,
  });
  const onProgress = (p: { percent: number }) => sendToWindows("updater.progress", p.percent);
  autoUpdater.on("download-progress", onProgress);
  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result?.isUpdateAvailable) {
      throw new Error(`${tag} is not newer than the running lameta.`);
    }
    await autoUpdater.downloadUpdate();
    return result.updateInfo.version;
  } finally {
    autoUpdater.off("download-progress", onProgress);
  }
});

// Quits, installs the downloaded update, and starts the new version.
ipcMain.handle("updater.installNow", () => {
  autoUpdater.quitAndInstall(true, true);
});

// Installs the downloaded update when lameta quits, without starting it again. Resolves once
// quitting will install it.
ipcMain.handle("updater.installOnQuit", async () => {
  autoUpdater.autoInstallOnAppQuit = true;
  if (process.platform === "darwin") {
    // Squirrel.Mac installs an update on quit once it has fetched it. electron-updater serves
    // the download to Squirrel and set Squirrel's feed to it; this asks Squirrel to fetch it,
    // which is what electron-updater's own quitAndInstall does in this situation. Until
    // Squirrel has it, quitting would leave lameta as it is.
    await new Promise<void>((resolve, reject) => {
      const stopListening = () => {
        electronAutoUpdater.off("update-downloaded", done);
        electronAutoUpdater.off("error", failed);
        electronAutoUpdater.off("update-not-available", notAvailable);
      };
      const done = () => {
        stopListening();
        resolve();
      };
      const failed = (error: Error) => {
        stopListening();
        reject(error);
      };
      const notAvailable = () =>
        failed(new Error("Squirrel.Mac found no update to install from the download."));
      electronAutoUpdater.on("update-downloaded", done);
      electronAutoUpdater.on("error", failed);
      electronAutoUpdater.on("update-not-available", notAvailable);
      electronAutoUpdater.checkForUpdates();
    });
  } else {
    // electron-updater adds its install-on-quit handler only if autoInstallOnAppQuit was on
    // when the download finished, which it was not.
    (autoUpdater as unknown as { addQuitHandler(): void }).addQuitHandler();
  }
});
