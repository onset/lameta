import { autoUpdater, UpdateInfo } from "electron-updater";
import log, { LogMessage, PathVariables } from "electron-log";
import Path from "path";

export function checkForApplicationUpdate(): Promise<any> {
  log.transports.file.level = "debug";
  autoUpdater.logger = log;
  const current = require("../package.json");

  // Currently github only has a concept of prerelease or not; it doesn't have a full channel system.
  // Because of this, electron updater does not allow a full "channels" system when you're serving from github releases.
  // https://github.com/electron-userland/electron-builder/issues/1722
  autoUpdater.allowPrerelease =
    ["alpha", "beta"].indexOf(current.channel.toLowerCase()) > -1;

  return new Promise((succeed, reject) => {
    autoUpdater.on("checking-for-update", () => {
      console.log("**** Checking for update...");
    });
    autoUpdater.on("update-available", (info: UpdateInfo) => {
      console.log("**** update-available");
      succeed(info);
    });
    autoUpdater.on("update-not-available", (info) => {
      console.log("**** update-not-available");
      succeed(false);
    });
    autoUpdater.on("error", (err) => {
      console.log(
        "**** error in check-for-application-update:",
        JSON.stringify(err)
      );
      reject(err);
    });
    // autoUpdater.on("download-progress", (progressObj) => {
    //   let msg = "Download speed: " + progressObj.bytesPerSecond;
    //   msg = msg + " - Downloaded " + progressObj.percent + "%";
    //   msg =
    //     msg + " (" + progressObj.transferred + "/" + progressObj.total + ")";
    //   status(msg);
    // });
    // autoUpdater.on("update-downloaded", (info) => {
    //   status("Update downloaded");
    // });

    autoUpdater.autoDownload = false;
    autoUpdater.allowPrerelease = true; //<-- TODO figure out if we're already in prerelease
    //autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.checkForUpdates();
  });
}
