import { render } from "react-dom";
import { ipcRenderer } from "electron";
import { app, process } from "@electron/remote";
import "./app.global.scss";
import { App } from "./containers/App";
import { initializeAnalytics, analyticsEvent } from "./other/analytics";
import { initializeSentry as initializeErrorReporting } from "./other/errorHandling";
import { i18n, initializeLocalization } from "./other/localization";
import { CopyManager } from "./other/CopyManager";
import { t } from "@lingui/macro";
import { PatientFS } from "./other/patientFile";
import ReactModal from "react-modal";
import * as mobx from "mobx";

type TestEnvironment = {
  E2E: boolean;
  E2E_USER_SETTINGS_STORE_NAME: string;
  E2ERoot: string;
};

export function getTestEnvironment(): TestEnvironment {
  // Indexing instead of, e.g., `process.env` because vite replaces that with ({}). Bad vite!
  const e = {
    E2E: process["env"]["E2E"],
    E2E_USER_SETTINGS_STORE_NAME:
      process["env"]["E2E_USER_SETTINGS_STORE_NAME"],
    E2ERoot: process["env"]["E2ERoot"]
  };
  //console.log("getTestEnvironment() = ", JSON.stringify(e, null, 2));
  return e;
}

// when I upgraded to mobx 6, I added this becuase I was getting "Since
// strict-mode is enabled, changing (observed) observable values without using
// an action is not allowed." Enhance: figure out what it would mean to wrap
// everything in actions. Migration guide says After finishing the entire
// migration process and validating that your project works as expected,
// consider enabling the flags computedRequiresReaction,
// reactionRequiresObservable and observableRequiresReaction and enforceActions:
// "observed" to write more idiomatic MobX code.
mobx.configure({
  enforceActions: "never",
  useProxies: "always"
});

app.whenReady().then(async () => {
  PatientFS.init();

  initializeErrorReporting(false);

  initializeLocalization();
  initializeAnalytics(); //nb: this will report the current language, so should follow initializeLocalization()
  analyticsEvent("Launch", "Launch");

  document.body.setAttribute("class", process.platform);
  const container = document.getElementById("root");
  ReactModal.setAppElement(container!);

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
