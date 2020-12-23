// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */
import * as React from "react";
import ReactModal from "react-modal";
import CloseOnEscape from "react-close-on-escape";
import { Trans } from "@lingui/react";
import { CancellationToken, UpdateInfo } from "electron-updater";
import { t } from "@lingui/macro";
import { ipcRenderer } from "electron";
import useAxios from "axios-hooks";
import * as _ from "lodash";

const electron = require("electron");
const ReactMarkdown = require("react-markdown");
import Semver from "semver";
import { sentryException } from "../other/errorHandling";
import { i18n } from "@lingui/core";
import { people_background_color, saymore_orange } from "./colors";
type Mode = "release notes" | "downloading" | "done" | "error" | "closed";

let staticUpdateAvailableDialog: (
  info: UpdateInfo
  //download: DownloadFunction
) => void = () => {};
export { staticUpdateAvailableDialog as ShowUpdateAvailableDialog };

//let downloadFunction: DownloadFunction | undefined;

/*
  ---  What's going on here --- I initially started using electron-updater
  completely, but kept running into problems with its decision making. In that
  time, I had the dialog ready to do the actual download & update (all this mode
  stuff). But I had to abandon it for now because it was just taking too much
  time (it's very hard to debug and iterate on things that run in the main
  process). At the moment we're still using it to detect that there is a new
  release, though that too would be easy to replace
  and improve on. But then we're doing our own get on the release notes,
  rendering of the markdown, and providing simple download links to each version.
*/

export const UpdateAvailableDialog: React.FunctionComponent<{}> = (props) => {
  const [mode, setMode] = React.useState<Mode>("closed");
  const [updateInfo, setUpdateInfo] = React.useState<UpdateInfo | undefined>();
  //const [cancellationToken] = React.useState(new CancellationToken());
  // const [downloadFunction, setDownloadFunction] = React.useState<
  //   DownloadFunction | undefined
  // >();
  const [cancelDownloadFunction, setCancelDownloadFunction] = React.useState<
    () => void
  >();
  const [{ data, loading, error }] = useAxios(
    "https://api.github.com/repos/onset/lameta/releases"
  );

  //   {
  //     releaseNotes: `Where does it come from?
  // Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.
  // <p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p>`,
  //     version: "1.2.3",
  //     releaseDate: "x",
  //     files: [],
  //     path: "",
  //     sha512: "",
  //   });

  staticUpdateAvailableDialog = (
    info: UpdateInfo
    //download: DownloadFunction
  ) => {
    setUpdateInfo(info);
    //downloadFunction = download;
    //setDownloadFunction(download);
    setMode("release notes");
  };

  let notesArray = data ? data : [];
  try {
    // Here we call "coerce" to make it a bit more tolerant of accidents like an upper-case V or a missing 3rd digit.
    // But if we really screw up, an get an error here,  just give up on the sorting.
    notesArray.sort(
      (a, b) =>
        Semver.compare(
          Semver.coerce(a.tag_name) || a.tag_name,
          Semver.coerce(b.tag_name) || b.tag_name
        ) * -1
    );
  } catch (err) {
    console.error(
      "Error while trying to display release notes. Will display unsorted"
    );
    console.error(err);
    sentryException(err);
  }
  //const notes = notesArray ? notesArray!.map((n) => n.note).join("<br/>") : "";
  return (
    <CloseOnEscape onEscape={() => setMode("closed")}>
      <ReactModal
        ariaHideApp={false}
        className="messageDialog"
        isOpen={mode !== "closed"}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => setMode("closed")}
      >
        <div
          className="dialogContent"
          css={css`
            width: 700px;
            //min-height: 200px;
            display: block !important;
          `}
        >
          <h1
            css={css`
              margin-top: 1em;
              margin-bottom: 0 !important;
              padding: 0;
              padding-bottom: 46px;
              font-size: 20pt !important;
            `}
          >
            {/* Release notes for lameta version {updateInfo?.version} */}
            <Trans>Release Notes</Trans>
            <span
              css={css`
                float: right;
                font-size: 16px;
                color: ${saymore_orange};
              `}
            >
              {i18n._(
                t`You are running lameta ${require("../package.json").version}`
              )}
            </span>
          </h1>
          <div
            css={css`
              max-height: 400px;
              min-height: 100px;
              padding-right: 10px;
              overflow-y: scroll;
            `}
          >
            {mode === "error" ? (
              <div>
                <Trans>
                  Sorry, something went wrong. You can get the update by
                  downloading an installer from
                  https://github.com/onset/lameta/releases .
                </Trans>
              </div>
            ) : (
              notesArray.map((release) => (
                <div key={release.name}>
                  <h1
                    css={css`
                      margin-top: 1em !important;
                      margin-bottom: 10px !important;
                      background-color: ${people_background_color};
                      padding: 5px;
                      padding-bottom: 35px;
                      font-size: 14pt !important;
                      padding-left: 10px;
                    `}
                  >
                    {release.name}
                    {getDownloadUrl(release) && (
                      <a
                        css={css`
                          float: right;
                        `}
                        href={getDownloadUrl(release)}
                      >
                        <Trans>Download</Trans>
                      </a>
                    )}
                  </h1>

                  <ReactMarkdown
                    css={css`
                      * {
                        max-width: 100%;
                      }
                    `}
                    // note: the gfm plugin actually did worse that standard... it turned 2nd level bullets into <pre>
                    children={release.body}
                  />
                </div>
              ))
            )}
          </div>
        </div>
        <div className={"bottomButtonRow"}>
          <div className={"okCancelGroup"}>
            <button onClick={() => setMode("closed")}>
              <Trans>Close</Trans>
            </button>
            {/* <ModeButton
              visibleInMode="release notes"
              mode={mode}
              {...props}
              onClick={() => {
                electron.shell.openExternal(
                  //"https://www.github.com/onset/lameta/releases"
                  "https://github.com/onset/lameta/releases/download/v0.9.2-alpha/lameta-Windows-Setup-0.9.2.exe"
                );
              }}
            >
              <Trans>Download from Github with your Web Browser</Trans>
            </ModeButton> */}
            {/* <button
              id="download"
              disabled={
                mode === "downloading" || mode === "error" || mode === "done"
              }
              onClick={() => {
                if (downloadFunction) {
                  const { promise, cancelFunction } = downloadFunction();
                  promise.catch((err: Error) => {
                    console.error(
                      "UpdateAvailableDialog promise catch got " + err.message
                    );
                    setMode("error");
                  });
                  promise.finally(() => setMode("done"));
                  setMode("downloading");
                }
                  setCancelDownloadFunction(cancelFunction);}
              }
            >
              {mode === "downloading" ? (
                <Trans>Downloading...</Trans>
              ) : (
                <Trans>Download and Install</Trans>
              )}
            </button> */}
            <ModeButton
              visibleInMode="done"
              mode={mode}
              {...props}
              onClick={() => {
                ipcRenderer.invoke("quitAndInstall");
                setMode("closed");
              }}
            >
              <Trans>Close</Trans>
            </ModeButton>
            <ModeButton
              visibleInMode="downloading"
              mode={mode}
              onClick={() => {
                if (mode === "downloading" && cancelDownloadFunction) {
                  console.log("cancelling from ui");
                  cancelDownloadFunction();
                }
                setMode("closed");
              }}
            >
              <Trans>Cancel</Trans>
            </ModeButton>
            <ModeButton
              visibleInMode="error"
              mode={mode}
              onClick={() => {
                setMode("closed");
              }}
            >
              <Trans>Close</Trans>
            </ModeButton>
          </div>
        </div>
      </ReactModal>
    </CloseOnEscape>
  );
};

const ModeButton: React.FunctionComponent<{
  mode: Mode;
  visibleInMode: Mode;
  [other: string]: any;
}> = (props) => {
  const { visibleInMode, ...buttonProps } = props;
  return props.mode === props.visibleInMode ? (
    <button
      {...buttonProps}
      css={css`
        ${props.mode !== "release notes" ? "display:none" : ""}
      `}
    >
      {props.children}
    </button>
  ) : (
    <React.Fragment />
  );
};

function getDownloadUrl(release: any) {
  try {
    const platformToExtension = { win32: "exe", darwin: "dmg" };
    const installerExtension = platformToExtension[process.platform];
    const url = (release.assets as Array<any>).find((a) =>
      _.endsWith(a.browser_download_url, installerExtension)
    );
    return url?.browser_download_url;
  } catch (error) {
    sentryException(error);
    return undefined;
  }
}
