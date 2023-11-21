import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
// tslint:disable-next-line: no-duplicate-imports
import Alert from "@material-ui/lab/Alert";
import Button from "@material-ui/core/Button";
import { useState } from "react";
import ReactModal from "react-modal";
import "./ExportDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { ProjectHolder } from "../../model/Project/Project";
import { showInExplorer } from "../../other/crossPlatformUtilities";
import * as remote from "@electron/remote";
import * as Path from "path";
import { t, Trans } from "@lingui/macro";
import { i18n } from "../../other/localization";
import { analyticsLocation, analyticsEvent } from "../../other/analytics";
import ImdiBundler from "../../export/ImdiBundler";
import moment from "moment";
import { Folder } from "../../model/Folder/Folder";
import { NotifyError, NotifyException, NotifyWarning } from "../Notify";
import { ensureDirSync, pathExistsSync } from "fs-extra";
import { makeGenericCsvZipFile as asyncMakeGenericCsvZipFile } from "../../export/CsvExporter";
import { makeParadisecCsv } from "../../export/ParadisecCsvExporter";
import { ExportChoices } from "./ExportChoices";
import { CopyManager, ICopyJob } from "../../other/CopyManager";
import { useInterval } from "../UseInterval";
import userSettingsSingleton from "../../other/UserSettings";
import { DialogButton } from "../LametaDialog";
import { IMDIMode } from "../../export/ImdiGenerator";

const saymore_orange = "#e69664";
import { app } from "@electron/remote";
import { clipboard } from "electron";
const sanitize = require("sanitize-filename");

let staticShowExportDialog: () => void = () => {};
export { staticShowExportDialog as ShowExportDialog };

enum Mode {
  closed = 0,
  choosing = 1,
  exporting = 2,
  copying = 3,
  finished = 4,
  error = 5
}
export const ExportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = (props) => {
  const [mode, setMode] = useState<Mode>(Mode.closed);
  staticShowExportDialog = () => {
    setMode(Mode.choosing);
  };
  React.useEffect(() => {
    switch (mode) {
      case Mode.exporting:
      case Mode.copying:
        document.body.style.cursor = "wait";
        break;
      default:
        document.body.style.cursor = "default";
    }
  }, [mode]);

  const [error, setError] = useState<string | undefined>(undefined);
  const [imdiValidated, setImdiValidated] = useState<boolean>(false);
  const [outputPath, setOutputPath] = useState<string | undefined>(undefined);
  const [exportFormat, setExportFormat] = useState(
    userSettingsSingleton.ExportFormat
  );
  const [whichSessionsOption, setWhichSessionsOption] = useState("all");
  const [countOfMarkedSessions, setCountOfMarkedSessions] = useState(0);
  React.useEffect(() => {
    if (props.projectHolder && props.projectHolder.project) {
      const count = props.projectHolder!.project!.sessions.countOfMarkedFolders();
      setCountOfMarkedSessions(count);
      // guess what they will want based on if they have checked anything
      setWhichSessionsOption(count === 0 ? "all" : "marked");
    }
  }, [mode]);

  const [copyJobsInProgress, setCopyJobsInProgress] = useState<ICopyJob[]>([]);
  useInterval(() => {
    if (mode === Mode.copying) {
      if (CopyManager.getActiveCopyJobs().length === 0) {
        setMode(Mode.finished);
      }
      // we have to clone it or react will see that the object didn't change, and will not re-render
      setCopyJobsInProgress([...CopyManager.getActiveCopyJobs()]);
    }
  }, 500); // REVIEW: when this dialog is closed, does this keep running?

  const handleContinue = (doSave: boolean) => {
    if (doSave) {
      userSettingsSingleton.ExportFormat = exportFormat;
      let defaultPath;
      switch (exportFormat) {
        case "csv":
          defaultPath = getPathForCsvSaving();
          break;
        case "paradisec":
          defaultPath = getPathForParadisecSaving();
          break;
        default:
          defaultPath = getPathForIMDISaving();
          break;
      }
      remote.dialog
        .showSaveDialog({
          title: t`Save As`,
          defaultPath,
          filters:
            exportFormat === "csv"
              ? [
                  {
                    extensions: ["zip"],
                    name: t`ZIP Archive`
                  }
                ]
              : []
        })
        .then((result) => {
          if (result.canceled) {
            setMode(Mode.closed);
          } else {
            setMode(Mode.exporting);
            // setTimeout lets us update the ui before diving in
            setTimeout(() => {
              try {
                setOutputPath(result.filePath);
                // we'll return from this while the saving happens. When it is done, our mode will change from `exporting` to `finished`.
                saveFilesAsync(result.filePath!);
              } catch (err) {
                NotifyException(
                  err,
                  `${t`There was a problem exporting:`} ${err.message}`
                );
                setMode(Mode.closed);
              }
            }, 100);
          }
        });
    } else {
      CopyManager.abandonCopying(true); // cancel can be clicked while doing imdi+files.
      setMode(Mode.closed);
    }
  };
  const getPathForCsvSaving = () => {
    const parent = Path.join(app.getPath("documents"), "lameta", "CSV Export");
    ensureDirSync(parent);
    return Path.join(
      parent,
      `${sanitize(
        props.projectHolder.project!.displayName
      )} - lameta CSV Export - ${moment(new Date()).format("YYYY-MM-DD")}.zip`
    );

    // return `${Path.basename(
    //   props.projectHolder.project!.directory
    // )}-${exportFormat}.zip`;
  };
  const getPathForParadisecSaving = () => {
    const parent = Path.join(app.getPath("documents"), "lameta", "CSV Export");
    ensureDirSync(parent);
    return Path.join(
      parent,
      `${sanitize(
        props.projectHolder.project!.displayName
      )} - lameta Paradisec Export - ${moment(new Date()).format(
        "YYYY-MM-DD"
      )}.csv`
    );

    // return `${Path.basename(
    //   props.projectHolder.project!.directory
    // )}-${exportFormat}.zip`;
  };

  const getPathForIMDISaving = () => {
    const parent = Path.join(
      app.getPath("documents"),
      "lameta",
      "IMDI Packages"
    );
    ensureDirSync(parent);

    // throw new Error(
    //   "Test throw from getPathForIMDISaving " + Date.now().toLocaleString()
    // );

    let folder = Path.join(
      parent,
      `${sanitize(
        props.projectHolder.project!.displayName
      )} - lameta ${exportFormat} Export - ${moment(new Date()).format(
        "YYYY-MM-DD"
      )}`
    );
    // Just that is what we would *like* to have, the problem is that since we are saving
    // a folder, and not a file, on subsequent saves the File Dialog will show *inside*
    // this folder, because it already exists. There does not appear to be a way to say
    // "Show this folder, then use this default name" as separate parameters. Very annoying.
    // So now we add the exact time if there is a already a folder from today.
    if (pathExistsSync(folder)) {
      folder = folder + " " + moment(new Date()).format("HH_mm_ss");
    }
    return folder;
  };

  const saveFilesAsync = async (path: string) => {
    try {
      const folderFilter =
        whichSessionsOption === "all"
          ? (f: Folder) => true
          : (f: Folder) => f.marked;

      if (path) {
        switch (exportFormat) {
          case "csv":
            analyticsEvent("Export", "Export CSV");

            asyncMakeGenericCsvZipFile(
              path,
              props.projectHolder.project!,
              folderFilter
            ).then(() => {
              setMode(Mode.finished); // don't have to wait for any copying of big files
            });
            break;
          case "paradisec":
            analyticsEvent("Export", "Export Paradisec CSV");

            makeParadisecCsv(path, props.projectHolder.project!, folderFilter);
            setMode(Mode.finished); // don't have to wait for any copying of big files
            break;
          case "imdi":
            analyticsEvent("Export", "Export IMDI Xml");

            await ImdiBundler.saveImdiBundleToFolder(
              props.projectHolder.project!,
              path,
              IMDIMode.RAW_IMDI,
              false,
              folderFilter
            );
            setMode(Mode.finished); // don't have to wait for any copying of big files

            break;
          case "opex-plus-files":
            analyticsEvent("Export", "Export OPEX Plus Files");
            if (CopyManager.filesAreStillCopying()) {
              NotifyWarning(
                t`lameta cannot export files while files are still being copied in.`
              );
              setMode(Mode.choosing);
            } else {
              await ImdiBundler.saveImdiBundleToFolder(
                props.projectHolder.project!,
                path,
                IMDIMode.OPEX,
                true,
                folderFilter
              ).then(() => {
                // At this point we're normally still copying files asynchronously, via RobustLargeFileCopy.
                setMode(Mode.copying); // don't have to wait for any copying of big files
                setImdiValidated(true);
              });
            }
            break;
        }
      }
    } catch (err) {
      setError(err);
      setMode(Mode.error);
    }
  };

  return (
    <CloseOnEscape
      onEscape={() => {
        handleContinue(false);
      }}
    >
      <ReactModal
        className="exportDialog"
        isOpen={mode !== Mode.closed}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => handleContinue(false)}
        ariaHideApp={false}
        onAfterOpen={() => analyticsLocation("Export Dialog")}
      >
        <div className={"dialogTitle "}>
          <Trans>Export Project</Trans>
        </div>
        <div
          className="dialogContent"
          css={css`
            height: 420px;
            max-height: 420px;
            overflow-y: auto;
          `}
        >
          {mode === Mode.choosing && (
            <ExportChoices
              exportFormat={exportFormat}
              setExportFormat={setExportFormat}
              whichSessionsOption={whichSessionsOption}
              setWhichSessionsOption={setWhichSessionsOption}
              countOfMarkedSessions={countOfMarkedSessions}
              setCountOfMarkedSessions={setCountOfMarkedSessions}
            />
          )}
          <div
            css={css`
              margin-left: 20px;
            `}
          >
            {mode === Mode.error && (
              <div>
                <Alert severity="error">
                  <div css={css``}>{error}</div>
                </Alert>
                <Button
                  variant="outlined"
                  onClick={() => clipboard.writeText(error!)}
                >
                  Copy
                </Button>
              </div>
            )}
            {mode === Mode.exporting && (
              <h1>
                <Trans>Exporting...</Trans>
              </h1>
            )}
            {mode === Mode.finished && (
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: 10px;
                `}
              >
                <h1>
                  <Trans>Done</Trans>
                </h1>
                {imdiValidated && (
                  <Alert severity="success">
                    {t`The IMDI files were validated.`}
                  </Alert>
                )}
              </div>
            )}
            {mode === Mode.copying && (
              <div>
                <h1>
                  <Trans>Copying in Files...</Trans>
                </h1>
                <br />
                {copyJobsInProgress.map((j) => {
                  const name = Path.basename(j.destination);
                  return (
                    <div key={j.destination}>
                      {name} {j.progress}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={"bottomButtonRow"}>
          {/* List as default last (in the corner), then stylesheet will reverse when used on Windows */}
          <div className={"reverseOrderOnMac"}>
            {mode === Mode.error && (
              <React.Fragment>
                <DialogButton
                  default={true}
                  onClick={() => setMode(Mode.closed)}
                >
                  <Trans>Close</Trans>
                </DialogButton>
              </React.Fragment>
            )}
            {mode === Mode.choosing && (
              <React.Fragment>
                <DialogButton
                  default={true}
                  onClick={() => handleContinue(true)}
                >
                  <Trans>Export</Trans>
                </DialogButton>
                <Button
                  variant="contained"
                  onClick={() => handleContinue(false)}
                >
                  <Trans>Cancel</Trans>
                </Button>
              </React.Fragment>
            )}
            {mode === Mode.finished && (
              <React.Fragment>
                <Button
                  variant="contained"
                  onClick={() => setMode(Mode.closed)}
                >
                  <Trans>Close</Trans>
                </Button>
                <Button
                  id="okButton"
                  variant="contained"
                  color="secondary"
                  onClick={() => {
                    setMode(Mode.closed);
                    showInExplorer(outputPath || "");
                  }}
                >
                  <Trans>Show export</Trans>
                </Button>
              </React.Fragment>
            )}
          </div>
        </div>
      </ReactModal>
    </CloseOnEscape>
  );
};
