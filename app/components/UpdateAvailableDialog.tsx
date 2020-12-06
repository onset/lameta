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
import { DownloadFunction } from "../other/autoUpdate";
import { ipcRenderer } from "electron";

type Mode = "closed" | "release notes" | "downloading" | "done" | "error";

let staticUpdateAvailableDialog: (
  info: UpdateInfo,
  download: DownloadFunction
) => void = () => {};
export { staticUpdateAvailableDialog as ShowUpdateAvailableDialog };

let downloadFunction: DownloadFunction | undefined;

export const UpdateAvailableDialog: React.FunctionComponent<{}> = (props) => {
  const [mode, setMode] = React.useState<Mode>("closed");
  const [updateInfo, setUpdateInfo] = React.useState<UpdateInfo | undefined>();
  const [cancellationToken] = React.useState(new CancellationToken());
  // const [downloadFunction, setDownloadFunction] = React.useState<
  //   DownloadFunction | undefined
  // >();
  const [cancelDownloadFunction, setCancelDownloadFunction] = React.useState<
    () => void
  >();

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
    info: UpdateInfo,
    download: DownloadFunction
  ) => {
    setUpdateInfo(info);
    downloadFunction = download;
    //setDownloadFunction(download);
    setMode("release notes");
  };
  let closeButtonLabel = <Trans>Cancel</Trans>;

  switch (mode) {
    case "downloading":
      closeButtonLabel = <Trans>Cancel</Trans>;
      break;
    case "release notes":
      closeButtonLabel = <Trans>Not Now</Trans>;
      break;
    case "done":
      closeButtonLabel = <Trans>Done</Trans>;
      break;
    case "error":
      closeButtonLabel = <Trans>Close</Trans>;
      break;
  }

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
          `}
        >
          <h1
            css={css`
              margin-bottom: 1em !important;
            `}
          >
            Release notes for lameta version {updateInfo?.version}
          </h1>
          <div
            className="row"
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
              <div
                dangerouslySetInnerHTML={{
                  __html: `<div>${updateInfo?.releaseNotes}</div>`,
                }}
              ></div>
            )}
          </div>
        </div>
        <div className={"bottomButtonRow"}>
          <div className={"okCancelGroup"}>
            <button
              id="download"
              disabled={
                mode === "downloading" || mode === "error" || mode === "done"
              }
              onClick={() => {
                if (downloadFunction) {
                  const { promise, cancelFunction } = downloadFunction();
                  promise.catch((err: Error) => {
                    console.error(
                      "UpdateAvailabeDialog promise catch got " + err.message
                    );
                    setMode("error");
                  });
                  promise.finally(() => setMode("done"));
                  setMode("downloading");
                  setCancelDownloadFunction(cancelFunction);
                  //setIsOpen(false);
                }
              }}
            >
              {mode === "downloading" ? (
                <Trans>Downloading...</Trans>
              ) : (
                <Trans>Download and Install</Trans>
              )}
            </button>

            <button
              id="close"
              onClick={() => {
                if (mode === "downloading" && cancelDownloadFunction) {
                  console.log("cancelling from ui");
                  cancelDownloadFunction();
                }
                if (mode === "done") {
                  ipcRenderer.invoke("quitAndInstall");
                }
                setMode("closed");
              }}
            >
              {closeButtonLabel}
            </button>
          </div>
        </div>
      </ReactModal>
    </CloseOnEscape>
  );
};

{
  /* <p>{`Your current version is  ${current.version + current.channel}`}</p>; */
}
