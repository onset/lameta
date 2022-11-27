import * as React from "react";
import { render } from "react-dom";
import { ipcRenderer } from "electron";
const { app } = require("@electron/remote");
const { process } = require("@electron/remote");
import "./app.global.scss";
import App from "./containers/App";
import { setConfig } from "react-hot-loader";
import { initializeAnalytics, analyticsEvent } from "./other/analytics";
import { initializeSentry as initializeErrorReporting } from "./other/errorHandling";
import { i18n, initializeLocalization } from "./other/localization";
import { CopyManager } from "./other/CopyManager";
import { t } from "@lingui/macro";
import { PatientFS } from "./other/patientFile";
import * as ReactModal from "react-modal";
import { configure } from "mobx";

// when I upgraded to mobx 6, I added this becuase I was getting "Since
// strict-mode is enabled, changing (observed) observable values without using
// an action is not allowed." Enhance: figure out what it would mean to wrap
// everything in actions. Migration guide says After finishing the entire
// migration process and validating that your project works as expected,
// consider enabling the flags computedRequiresReaction,
// reactionRequiresObservable and observableRequiresReaction and enforceActions:
// "observed" to write more idiomatic MobX code.
configure({
  enforceActions: "never",
});

app.whenReady().then(() => {
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
  document.body.setAttribute("class", process.platform);
  const container = document.getElementById("root");
  ReactModal.default.setAppElement(container!);
  render(<App />, container);
});

window.onbeforeunload = (e: BeforeUnloadEvent) => {
  if (CopyManager.filesAreStillCopying()) {
    ipcRenderer
      .invoke(
        "confirm-quit",
        t`One or more files are still being copied into your project.`,
        t`Do not quit`,
        t`Abandon files that are still copying`
      )
      .then((result) => {
        if (result.response === 1) {
          CopyManager.abandonCopying(true);
          app.quit(); // this time it will go through
        }
      });
    return "this is ignored but prevents quitting";
  }
  return; // just quit
};
