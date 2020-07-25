import { showInExplorer } from "../crossPlatformUtilities";
//import { store } from "react-notifications-component";
import * as React from "react";
import ButterToast, { Cinnamon, POS_BOTTOM, POS_RIGHT } from "butter-toast";
import userSettings from "../UserSettings";

const electron = require("electron");
export function NotifyError(message: string) {
  ButterToast.raise({
    content: (
      <Cinnamon.Crunch
        title="Error"
        content={message}
        scheme={Cinnamon.Crunch.SCHEME_RED}
      />
    ),
    timeout: 60 * 1000,
  });
}
export function NotifyWarning(message: string, onClick?: () => void) {
  ButterToast.raise({
    onClick,
    content: (
      <Cinnamon.Crunch
        title="Warning"
        content={message}
        scheme={Cinnamon.Crunch.SCHEME_ORANGE}
      />
    ),
  });
}

export function NotifyMultipleProjectFiles(
  displayName: string,
  projectType: string,
  name: string,
  folder: string
) {
  NotifyWarning(
    `There is a problem with ${displayName}. Click for more information.`,
    () => {
      electron.ipcRenderer
        .invoke("showMessageBox", {
          buttons: ["Cancel", "Let me fix this"],
          title: "Something is wrong here...",
          message: `There are more than one files of type ${projectType} in this folder.`,
          detail: `lameta will now open this folder on your hard disk and then exit. You should open these ${projectType} files in a text editor and decide which one you want, and delete the others. The one you choose should be named ${name}.`,
        })
        .then((response) => {
          if (response.response > 0) {
            showInExplorer(folder);
            if (!userSettings.DeveloperMode) electron.remote.app.quit();
          }
        });
    }
  );
}
