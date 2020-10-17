// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
// tslint:disable-next-line: no-duplicate-imports
import { useState } from "react";
import ReactModal from "react-modal";
import "./ExportDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { ProjectHolder } from "../../model/Project/Project";
import { showInExplorer } from "../../crossPlatformUtilities";
import { remote } from "electron";
import * as Path from "path";
import { Trans } from "@lingui/react";
import { t } from "@lingui/macro";
import { i18n } from "../../localization";
import { analyticsLocation, analyticsEvent } from "../../analytics";
import ImdiBundler from "../../export/ImdiBundler";
import moment from "moment";
import { Folder } from "../../model/Folder/Folder";
import { NotifyError, NotifyException, NotifyWarning } from "../Notify";
import { ensureDirSync, pathExistsSync } from "fs-extra";
import { makeGenericCsvZipFile } from "../../export/CsvExporter";
import { makeParadisecCsv } from "../../export/ParadisecCsvExporter";
import { ExportChoices } from "./ExportChoices";
import { CopyManager, ICopyJob } from "../../CopyManager";
import { useInterval } from "../UseInterval";
import userSettingsSingleton from "../../UserSettings";

const saymore_orange = "#e69664";
const { app } = require("electron").remote;
const sanitize = require("sanitize-filename");

let staticShowExportDialog: () => void = () => {};
export { staticShowExportDialog as ShowExportDialog };

enum Mode {
  closed = 0,
  choosing = 1,
  exporting = 2,
  copying = 3,
  finished = 4,
}
export const ExportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = (props) => {
  const [mode, setMode] = useState<Mode>(Mode.closed);
  staticShowExportDialog = () => {
    setMode(Mode.choosing);
  };

  const [outputPath, setOutputPath] = useState<string | undefined>(undefined);
  const [exportFormat, setExportFormat] = useState(
    userSettingsSingleton.ExportFormat
  );
  const [whichSessionsOption, setWhichSessionsOption] = useState("all");
  const [countOfMarkedSessions, setCountOfMarkedSessions] = useState(0);
  React.useEffect(() => {
    if (props.projectHolder && props.projectHolder.project) {
      const count = props.projectHolder!.project!.countOfMarkedSessions();
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
          title: i18n._(t`Save As`),
          defaultPath,
          filters:
            exportFormat === "csv"
              ? [
                  {
                    extensions: ["zip"],
                    name: i18n._(t`ZIP Archive`),
                  },
                ]
              : [],
        })
        .then((result) => {
          if (result.canceled) {
            setMode(Mode.closed);
          } else {
            setMode(Mode.exporting);
            document.body.style.cursor = "wait";
            // setTimeout lets us update the ui before diving in
            setTimeout(() => {
              try {
                setOutputPath(result.filePath);
                saveFiles(result.filePath!);
              } catch (err) {
                NotifyException(
                  `${i18n._(t`There was a problem exporting:`)} ${err.message}`,
                  err
                );
                setMode(Mode.closed);
              } finally {
                document.body.style.cursor = "default";
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

  const saveFiles = (path: string) => {
    const folderFilter =
      whichSessionsOption === "all"
        ? (f: Folder) => true
        : (f: Folder) => f.checked;

    if (path) {
      switch (exportFormat) {
        case "csv":
          analyticsEvent("Export", "Export CSV");

          makeGenericCsvZipFile(
            path,
            props.projectHolder.project!,
            folderFilter
          );
          setMode(Mode.finished); // don't have to wait for any copying of big files
          break;
        case "paradisec":
          analyticsEvent("Export", "Export Paradisec CSV");

          makeParadisecCsv(path, props.projectHolder.project!, folderFilter);
          setMode(Mode.finished); // don't have to wait for any copying of big files
          break;
        case "imdi":
          analyticsEvent("Export", "Export IMDI Xml");
          ImdiBundler.saveImdiBundleToFolder(
            props.projectHolder.project!,
            path,
            false,
            folderFilter
          );
          setMode(Mode.finished); // don't have to wait for any copying of big files
          break;
        case "imdi-plus-files":
          analyticsEvent("Export", "Export IMDI Plus Files");
          if (CopyManager.filesAreStillCopying()) {
            NotifyWarning(
              i18n._(
                t`lameta cannot export files while files are still being copied in.`
              )
            );
            setMode(Mode.choosing);
          } else {
            ImdiBundler.saveImdiBundleToFolder(
              props.projectHolder.project!,
              path,
              true,
              folderFilter
            ).then(() => {
              // At this point we're normally still copying files asynchronously, via RobustLargeFileCopy.
              setMode(Mode.copying); // don't have to wait for any copying of big files
            });
          }
          break;
      }
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
            {mode === Mode.exporting && (
              <h1>
                <Trans>Exporting...</Trans>
              </h1>
            )}
            {mode === Mode.finished && (
              <h1>
                <Trans>Done</Trans>
              </h1>
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
                    <div>
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
          <div className={"okCancelGroup"}>
            <button
              onClick={() => handleContinue(false)}
              disabled={mode === Mode.finished}
            >
              <Trans>Cancel</Trans>
            </button>
            {mode === Mode.choosing && (
              <button id="okButton" onClick={() => handleContinue(true)}>
                <Trans>Export</Trans>
              </button>
            )}
            {mode === Mode.finished && (
              <button
                id="okButton"
                onClick={() => {
                  setMode(Mode.closed);
                  showInExplorer(outputPath || "");
                }}
              >
                <Trans>Show export</Trans>
              </button>
            )}
          </div>
        </div>
      </ReactModal>
    </CloseOnEscape>
  );
};
