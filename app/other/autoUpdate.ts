import { autoUpdater } from "electron-updater";

export function checkForApplicationUpdate(): Promise<any> {
  return new Promise((succeed, reject) => {
    autoUpdater.on("checking-for-update", () => {
      console.log("Checking for update...");
    });
    autoUpdater.on("update-available", (info) => {
      succeed(info);
    });
    autoUpdater.on("update-not-available", (info) => {
      succeed(false);
    });
    autoUpdater.on("error", (err) => {
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
    autoUpdater.allowPrerelease = true;
    //autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.checkForUpdates();
  });
}
