import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import { showInExplorer } from "../other/crossPlatformUtilities";
//import { store } from "react-notifications-component";
import * as React from "react";
import userSettings from "../other/UserSettings";
import { sentryException } from "../other/errorHandling";
import { t } from "@lingui/macro";
import * as remote from "@electron/remote";
const electron = require("electron");
import { Theme, ToastOptions, toast } from "react-toastify";
export const kred = "#E53935";
const activeToasts: string[] = [];

const errorToastProps: ToastOptions = {
  type: "error",
  theme: "colored" as Theme,
  autoClose: 10000
};

function notify(
  message: string,
  details?: string | React.ReactNode,
  options?: ToastOptions
) {
  // the delay helps with messages that we wouldn't see on startup becuase the react window isn't ready for it
  window.setTimeout(() => {
    const key = message + details;
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
          ...options,
          onClose: () => {
            activeToasts.splice(activeToasts.indexOf(key), 1);
          }
        }
      );
    }
  }, 0);
}
export function NotifyError(message: string, details?: string) {
  notify(message, details, errorToastProps);
}
export function getCannotRenameFileMsg() {
  return t`lameta  was not able to rename that file.`;
}
export function NotifyRenameProblem(err: any, path: string) {
  const msg = getCannotRenameFileMsg();
  if (err.code === "EPERM" || err.code === "EACCES" || err.code === "EBUSY") {
    NotifyFileAccessProblem(msg, err);
  } else {
    NotifyException(err, msg);
  }
}
function getEBUSYProblemsTips(): JSX.Element {
  return (
    <ul>
      <li>
        Are your files managed by a synchronization software like OneDrive or
        Dropbox? These programs can grab onto lameta files and interfere.
      </li>
      <li>
        Is the file open in another program? If not, try restarting your
        computer.
      </li>
      <li>
        Is your anti-virus interfering with lameta? Normally there is a way to
        tell it that lameta is safe.
      </li>
    </ul>
  );
}

// I haven't figured out the difference between eacces and eperm, or at least not enough to customize the tips yet.
function getEACCESProblemsTips(): JSX.Element {
  return (
    <ul>
      {/* I get this error with file meddler grabbing, thus this message */}
      <li>
        Are your files managed by a synchronization software like OneDrive or
        Dropbox? These programs can grab onto lameta files and interfere.
      </li>
      <li>
        Is your anti-virus interfering with lameta? Normally there is a way to
        tell it that lameta is safe.
      </li>
      <li>
        Is the file marked as 'read-only' in Finder/File Explorer? You can
        change that.
      </li>
      <li>
        Are you on a computer network where an administrator may have limited
        lameta's write permissions? Look at the permissions in Finder/File
        Explorer. Ask a network administrator for help.
      </li>
    </ul>
  );
}
// translateMessage(
//     /*i18n*/ {
//       id:
//         "Troubleshooting tips: Is the file open in another program -- try restarting your computer. Does your anti-virus software trust lameta -- you can tell it to. Are your files managed by a synchronization software like Dropbox -- just try again. Is the file marked as 'read-only' in Finder/File Explorer? Are you on a computer network where an administrator may have limited lameta's write permissions -- ask a network administrator for help.",
//     }

export function NotifyFileAccessProblem(message: string, err: any) {
  const x = [];
  x["EACCESS"] = getEACCESProblemsTips();
  x["EPERM"] = getEACCESProblemsTips();
  x["EBUSY"] = getEBUSYProblemsTips();
  const tips = (
    <div>
      <div>Troubleshooting tips:</div>
      {x[err.code]
        ? x[err.code]
        : t`We don't have specific tips for this error. If you cannot solve it by
          restarting your computer, please report the problem to
          https://github.com/onset/lameta/issues.`}
    </div>
  );

  notify(message, err.toString(), errorToastProps);
  //     toast.error(
  //       <div>
  //         <p>{message}</p>

  //         {/* Enhance: can we get this html into the localization system somehow? For now I think the benefit of the structure outweigh the English-only nature. */}
  //         {tips}
  //         <div
  //           css={css`
  //             font-size: 8pt;
  //             margin-top: 1em;
  //           `}
  //         >
  //           {err && <div>{err.toString()}</div>}
  //         </div>
  //       </div>,
  //       {
  //         ...errorToastProps
  //       }
  //     );
}

export function NotifyException(
  err: Error,
  message?: string,
  details?: string
) {
  const errWas = ` Error was: ${err.message}`;
  NotifyError(message ? message : errWas, details ?? "" + errWas);
  sentryException(err);
}
export function NotifyNoBigDeal(message: string) {
  notify(message, "", {
    type: "warning",
    autoClose: 2000,
    hideProgressBar: true,
    closeButton: false
  });
}

export function NotifyErrorWithClick(message: string, onClick: () => void) {
  notify(message, "", { ...errorToastProps, onClick: onClick });
}
export function NotifyWarning(message: string) {
  notify(message, "", { type: "warning" });
}
export function NotifySuccess(message: string, onClick?: () => void) {
  notify(message, "", {
    type: "success",
    onClick: onClick,
    autoClose: 2000,
    hideProgressBar: true
  });
}
export function NotifyUpdateAvailable(
  open: () => void
  //download: DownloadFunction
) {
  notify(t`Update available`, <a onClick={open}>{t`View Release Notes`}</a>);
}

export function NotifyMultipleProjectFiles(
  displayName: string,
  projectType: string,
  name: string,
  folder: string
) {
  NotifyErrorWithClick(
    t`There is a problem with the files in the folder for ${displayName}. Click for more information.`,
    () => {
      electron.ipcRenderer
        .invoke("showMessageBox", {
          buttons: [t`Cancel`, t`Show me the folder with the problem`],
          title: t`Something is wrong here...`,
          message: t`There are more than one files of type "${projectType}" in this folder, and there can only be one.`,
          detail: t`lameta will now open this folder on your hard disk and then exit. You should open these ${projectType} files in a text editor and decide which one you want, and delete the others. The one you choose should be named ${name}.`
        })
        .then((response) => {
          if (response > 0) {
            showInExplorer(folder);
            if (!userSettings.DeveloperMode) {
              window.setTimeout(() => remote.app.quit(), 1000);
            }
          }
        });
    }
  );
}
