import * as React from "react";
import { render } from "react-dom";
import { ipcRenderer, remote } from "electron";
import "./app.global.scss";
import App from "./containers/App";
import { setConfig } from "react-hot-loader";
import { initializeAnalytics, analyticsEvent } from "./other/analytics";
import { initializeSentry as initializeErrorReporting } from "./other/errorHandling";
import { i18n, initializeLocalization } from "./other/localization";
import { CopyManager } from "./other/CopyManager";
import { t } from "@lingui/macro";
import { PatientFS } from "./other/PatientFile";
import {
  NotifyNoBigDeal,
  NotifySuccess,
  NotifyUpdateAvailable,
  NotifyWarning,
} from "./components/Notify";
import { UpdateInfo } from "electron-updater";

PatientFS.init();
//if (!process.env.HOT) {
// sentry kills hot reloading with react-hot-loader
// possibly it's trying to report some RHL error... you do see them if you turn on
// "Pause on caught exceptions" in the chrome debug tools
// (note: it is possible to work around this by going away from the screen being modified)
initializeErrorReporting(false);
//}

initializeLocalization();
initializeAnalytics(); //nb: this will report the current language, so should follow initializeLocalization()
analyticsEvent("Launch", "Launch");

setConfig({ logLevel: "debug" });

document.body.setAttribute("class", remote.process.platform);

window.onbeforeunload = (e: BeforeUnloadEvent) => {
  if (CopyManager.filesAreStillCopying()) {
    ipcRenderer
      .invoke(
        "confirm-quit",
        i18n._(t`One or more files are still being copied into your project.`),
        i18n._(t`Do not quit`),
        i18n._(t`Abandon files that are still copying`)
      )
      .then((result) => {
        if (result.response === 1) {
          CopyManager.abandonCopying(true);
          remote.app.quit(); // this time it will go through
        }
      });
    return "this is ignored but prevents quitting";
  }
  return; // just quit
};
render(<App />, document.getElementById("root"));

ipcRenderer
  .invoke("checkForApplicationUpdate")
  .then((updateInfo: UpdateInfo) => {
    if (updateInfo) {
      NotifyUpdateAvailable(updateInfo);
    } else {
      //NotifyNoBigDeal("No update available");
    }
  })
  .catch((err) => {
    //NotifyWarning("There was an error checking for an application update.");
    console.error(err);
    console.error(
      "See Terminal for more error info on the Application update, coming from the main process."
    );
  });
