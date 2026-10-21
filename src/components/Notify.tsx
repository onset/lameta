import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import { revealInFolder } from "../other/crossPlatformUtilities";
//import { store } from "react-notifications-component";
import * as React from "react";
import userSettings from "../other/UserSettings";
import { sentryException } from "../other/errorHandling";
import { t } from "@lingui/core/macro";
import { quitApp } from "../other/windowIpc";
import { ipcRenderer } from "electron";
import log from "../other/log";

import { Theme, ToastOptions, toast } from "react-toastify";
const activeToasts: string[] = [];

const errorToastProps: ToastOptions = {
  type: "error",
  theme: "colored" as Theme,
  autoClose: 10000,
};

function notify(message: string, details?: string | React.ReactNode, options?: ToastOptions) {
  // what the user saw, in lameta.log, with where it came from
  if (options?.type === "error" || options?.type === "warning") {
    try {
      const text = [message, typeof details === "string" ? details : ""]
        .filter((x) => x)
        .join(" | ");
      const stack = (new Error().stack ?? "").split("\n").slice(2).join("\n");
      log.log(options.type === "error" ? "error" : "warn", `${text}\n${stack}`);
    } catch {}
  }
  // the delay helps with messages that we wouldn't see on startup becuase the react window isn't ready for it
  window.setTimeout(() => {
    const key = typeof details === "string" ? message + details : message;
    // don't show a message again if it's still showing
    if (activeToasts.indexOf(key) < 0) {
      activeToasts.push(key);
      toast(
        <React.Fragment>
          <div>{message}</div>
          <div
            css={css`
              font-size: 8pt;
              margin-top: 1em;
              overflow-wrap: anywhere;
              * {
                overflow-wrap: anywhere;
              }
            `}
          >
            {details}
          </div>
        </React.Fragment>,
        {
          draggable: false, // makes it possible to select text in the message
          ...options,

          onClose: () => {
            activeToasts.splice(activeToasts.indexOf(key), 1);
          },
        },
      );
    }
  }, 0);
}
export function NotifyError(message: string, details?: string) {
  // Always mirror to console with a stack for diagnostics
  try {
    const stack = new Error("NotifyError stack").stack;
    console.error("[NotifyError]", message, details ?? "", { stack });
  } catch {}
  notify(message, details, errorToastProps);
}
export function getCannotRenameFileMsg() {
  return t`lameta  was not able to rename that file.`;
}
export function NotifyRenameProblem(err: any) {
  const msg = getCannotRenameFileMsg();
  if (err.code === "EPERM" || err.code === "EACCES" || err.code === "EBUSY") {
    NotifyFileAccessProblem(msg, err);
  } else {
    NotifyException(err, msg);
  }
}
export function NotifyFileAccessProblem(message: string, err: any) {
  notify(message, err.toString(), errorToastProps);
}

export function NotifyException(err: Error, message?: string, details?: string) {
  const errWas = ` Error was: ${err.message}`;
  NotifyError(message ? message : errWas, details ?? "" + errWas);
  sentryException(err);
}
export function NotifyNoBigDeal(message: string) {
  notify(message, "", {
    type: "warning",
    autoClose: 2000,
    hideProgressBar: true,
    closeButton: false,
  });
}

export function NotifyErrorWithClick(message: string, onClick: () => void) {
  notify(message, "", { ...errorToastProps, onClick: onClick });
}
export function NotifyWarning(message: string) {
  // Always mirror to console with a stack for diagnostics
  try {
    const stack = new Error("NotifyWarning stack").stack;
    console.warn("[NotifyWarning]", message, { stack });
  } catch {}
  notify(message, "", { type: "warning" });
}
export function NotifySuccess(message: string, onClick?: () => void) {
  notify(message, "", {
    type: "success",
    onClick: onClick,
    autoClose: 2000,
    hideProgressBar: true,
  });
}
export function NotifyUpdateAvailable(
  open: () => void,
  //download: DownloadFunction
) {
  notify(t`Update available`, <a onClick={open}>{t`View Release Notes`}</a>);
}

export function NotifyMultipleProjectFiles(
  displayName: string,
  projectType: string,
  name: string,
  folder: string,
) {
  NotifyErrorWithClick(
    t`There is a problem with the files in the folder for ${displayName}. Click for more information.`,
    () => {
      ipcRenderer
        .invoke("showMessageBox", {
          buttons: [t`Cancel`, t`Show me the folder with the problem`],
          title: t`Something is wrong here...`,
          message: t`There are more than one files of type "${projectType}" in this folder, and there can only be one.`,
          detail: t`lameta will now open this folder on your hard disk and then exit. You should open these ${projectType} files in a text editor and decide which one you want, and delete the others. The one you choose should be named ${name}.`,
        })
        .then((response) => {
          if (response > 0) {
            revealInFolder(folder);
            if (!userSettings.DeveloperMode) {
              window.setTimeout(() => quitApp(), 1000);
            }
          }
        })
        .catch((err) => NotifyException(err as Error));
    },
  );
}
