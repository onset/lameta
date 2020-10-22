// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import { showInExplorer } from "../other/crossPlatformUtilities";
//import { store } from "react-notifications-component";
import * as React from "react";
import ButterToast, { Cinnamon, POS_BOTTOM, POS_RIGHT } from "butter-toast";
import userSettings from "../other/UserSettings";
import { sentryException } from "../other/errorHandling";
import { translateMessage } from "../other/localization";

const electron = require("electron");

export function NotifyError(message: string, details?: string) {
  ButterToast.raise({
    content: (
      <Cinnamon.Crunch
        title={translateMessage(/*i18n*/ { id: "Error" })}
        content={
          <React.Fragment>
            <div>{message}</div>
            <div
              css={css`
                font-size: 8pt;
                margin-top: 1em;
              `}
            >
              {details}
            </div>
          </React.Fragment>
        }
        scheme={Cinnamon.Crunch.SCHEME_RED}
      />
    ),
    timeout: 60 * 1000,
  });
}
export function NotifyException(
  err: Error,
  message?: string,
  details?: string
) {
  const errWas = ` Error was: ${err.message}`;
  NotifyError(message ? message : errWas, details + errWas);
  sentryException(err);
}
export function NotifyNoBigDeal(message: string, onClick?: () => void) {
  ButterToast.raise({
    onClick,
    content: (
      <Cinnamon.Crunch content={message} scheme={Cinnamon.Crunch.SCHEME_GREY} />
    ),
  });
}

export function NotifyWarning(message: string, onClick?: () => void) {
  ButterToast.raise({
    onClick,
    content: (
      <Cinnamon.Crunch
        title={translateMessage(/*i18n*/ { id: "Warning" })}
        content={message}
        scheme={Cinnamon.Crunch.SCHEME_ORANGE}
      />
    ),
  });
}
export function NotifySuccess(message: string, onClick?: () => void) {
  ButterToast.raise({
    content: (
      <Cinnamon.Crunch
        //title={translateMessage(/*i18n*/ { id: "" })}
        content={message}
        scheme={Cinnamon.Crunch.SCHEME_GREEN}
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
            if (!userSettings.DeveloperMode) {
              window.setTimeout(() => electron.remote.app.quit(), 1000);
            }
          }
        });
    }
  );
}
