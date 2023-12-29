import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import { showInExplorer } from "../other/crossPlatformUtilities";
//import { store } from "react-notifications-component";
import * as React from "react";
import ButterToast, { Cinnamon, POS_BOTTOM, POS_RIGHT } from "butter-toast";
import userSettings from "../other/UserSettings";
import { sentryException } from "../other/errorHandling";
import { t } from "@lingui/macro";
import * as remote from "@electron/remote";
import { ipcRenderer } from "electron";

const activeToasts: string[] = [];
const autoCloseTicks = 60 * 1000;
export function NotifyError(message: string, details?: string) {
  const key = message + details;

  // don't show a message again if it's still showing
  if (activeToasts.indexOf(key) < 0) {
    activeToasts.push(key);
    // the delay helps with messages that we wouldn't see on startup becuase the rect window isn't ready for it
    window.setTimeout(
      () =>
        ButterToast.raise({
          content: (
            // expand to fit the insides
            <Cinnamon.Crunch
              title={t`Error`}
              content={
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
                </React.Fragment>
              }
              scheme={Cinnamon.Crunch.SCHEME_RED}
            />
          ),
          onclick: () => {
            try {
              const index = activeToasts.indexOf(message);
              if (index > -1) activeToasts.splice(index, 1);
            } catch (err) {
              //swallow
            }
          },
          timeout: autoCloseTicks
        }),
      0
    );
    // we don't have a callback from butter-toast, but we know when we told it to hide.

    window.setTimeout(() => {
      try {
        const index = activeToasts.indexOf(key);
        if (index > -1) activeToasts.splice(index, 1);
      } catch (err) {
        console.error(err);
      }
    }, autoCloseTicks);
  }
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
        Is the file open in another program? If not, try restarting your
        computer.
      </li>
      <li>
        Is your anti-virus interfering with lameta? Normally there is a way to
        tell it that lameta is safe.
      </li>
      <li>
        Are your files managed by a synchronization software like Dropbox?
        Normally this kind of problem will resolve itself.
      </li>
    </ul>
  );
}

// I haven't figured out the difference between eacces and eperm, or at least not enough to customize the tips yet.
function getEACCESProblemsTips(): JSX.Element {
  return (
    <ul>
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
  // the delay helps with messages that we wouldn't see on startup becuase the rect window isn't ready for it
  window.setTimeout(
    () =>
      ButterToast.raise({
        content: (
          <Cinnamon.Crunch
            title={t`Error`}
            css={css``}
            content={
              <div>
                <p>{message}</p>

                {/* Enhance: can we get this html into the localization system somehow? For now I think the benefit of the structure outweigh the English-only nature. */}
                {tips}
                <div
                  css={css`
                    font-size: 8pt;
                    margin-top: 1em;
                  `}
                >
                  {err && <div>{err.toString()}</div>}
                </div>
              </div>
            }
            scheme={Cinnamon.Crunch.SCHEME_RED}
          />
        ),
        timeout: 60 * 1000
      }),
    0
  );
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
export function NotifyNoBigDeal(message: string, onClick?: () => void) {
  // the delay helps with messages that we wouldn't see on startup becuase the rect window isn't ready for it
  window.setTimeout(
    () =>
      ButterToast.raise({
        onClick,
        content: (
          <Cinnamon.Crunch
            content={message}
            scheme={Cinnamon.Crunch.SCHEME_GREY}
          />
        )
      }),
    0
  );
}

export function NotifyWarning(message: string, onClick?: () => void) {
  // the delay helps with messages that we wouldn't see on startup becuase the rect window isn't ready for it
  window.setTimeout(
    () =>
      ButterToast.raise({
        onClick,
        content: (
          <Cinnamon.Crunch
            title={t`Warning`}
            content={message}
            scheme={Cinnamon.Crunch.SCHEME_ORANGE}
          />
        )
      }),
    0
  );
}
export function NotifySuccess(message: string, onClick?: () => void) {
  // the delay helps with messages that we wouldn't see on startup becuase the rect window isn't ready for it
  window.setTimeout(
    () =>
      ButterToast.raise({
        content: (
          <Cinnamon.Crunch
            //title={translateMessage(/*i18n*/ { id: "" })}
            content={message}
            scheme={Cinnamon.Crunch.SCHEME_GREEN}
          />
        )
      }),
    0
  );
}
export function NotifyUpdateAvailable(
  open: () => void
  //download: DownloadFunction
) {
  // the delay helps with messages that we wouldn't see on startup becuase the rect window isn't ready for it
  window.setTimeout(() => {
    ButterToast.raise({
      content: (
        <Cinnamon.Crisp
          title={t`Update available`}
          //title={translateMessage(/*i18n*/ { id: "" })}
          content={
            <div>
              {/* I would like to dismiss the toast when you click, but the current ButterToast docs don't seem to match what we
            actually get if we provide an OnClick to raise. At this time, it does not give a dismiss function as claimed. */}
              <a onClick={open}>{t`View Release Notes`}</a>
            </div>
          }
        />
      ),
      timeout: 10 * 1000
    });
  }, 0);
}

export function NotifyMultipleProjectFiles(
  displayName: string,
  projectType: string,
  name: string,
  folder: string
) {
  // the delay helps with messages that we wouldn't see on startup becuase the rect window isn't ready for it
  window.setTimeout(
    () =>
      NotifyWarning(
        t`There is a problem with ${displayName}. Click for more information.`,
        () => {
          ipcRenderer
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
      ),
    0
  );
}
