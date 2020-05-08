import * as React from "react";
// tslint:disable-next-line: no-duplicate-imports
import { useState } from "react";
import ReactModal from "react-modal";
import "./ExportDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import CsvExporter from "../../export/CsvExporter";
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
import { Folder } from "../../model/Folder";
import { NotifyError } from "../Notify";
import { mkdirpSync, ensureDirSync, pathExistsSync } from "fs-extra";

const { app } = require("electron").remote;
const sanitize = require("sanitize-filename");

let staticShowExportDialog: () => void = () => {};
export { staticShowExportDialog as ShowExportDialog };

export const ExportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  staticShowExportDialog = () => setIsOpen(true);
  const [exportFormat, setExportFormat] = useState("csv");
  const [whichSessionsOption, setWhichSessionsOption] = useState("all");
  const [countOfMarkedSessions, setCountOfMarkedSessions] = useState(0);
  React.useEffect(() => {
    if (props.projectHolder && props.projectHolder.project) {
      const count = props.projectHolder!.project!.countOfMarkedSessions();
      setCountOfMarkedSessions(count);
      // guess what they will want based on if they have checked anything
      setWhichSessionsOption(count === 0 ? "all" : "marked");
    }
  }, [isOpen]);

  const handleCloseModal = (doSave: boolean) => {
    if (doSave) {
      const defaultPath =
        exportFormat === "csv" ? getPathForCsvSaving() : getPathForIMDISaving();
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
          try {
            saveFiles(result.filePath!);
          } catch (err) {
            NotifyError("There was a problem exporting.");
            setIsOpen(false);
            throw err; // send it on to sentry
          }
        });
    } else {
      setIsOpen(false);
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
          const exporter = new CsvExporter(props.projectHolder.project!);
          exporter.makeZipFile(path, folderFilter);
          showInExplorer(path);
          break;
        case "imdi":
          analyticsEvent("Export", "Export IMDI Xml");
          ImdiBundler.saveImdiBundleToFolder(
            props.projectHolder.project!,
            path,
            false,
            folderFilter
          );
          break;
        case "imdi-plus-files":
          analyticsEvent("Export", "Export IMDI Plus Files");
          ImdiBundler.saveImdiBundleToFolder(
            props.projectHolder.project!,
            path,
            true,
            folderFilter
          );
          break;
      }
      showInExplorer(path);
      setIsOpen(false);
    }
  };

  return (
    <CloseOnEscape
      onEscape={() => {
        handleCloseModal(false);
      }}
    >
      <ReactModal
        className="exportDialog"
        isOpen={isOpen}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => handleCloseModal(false)}
        ariaHideApp={false}
        onAfterOpen={() => analyticsLocation("Export Dialog")}
      >
        <div className={"dialogTitle "}>
          <Trans>Export Project</Trans>
        </div>
        <div className="dialogContent">
          <fieldset>
            <legend>
              <Trans>Choose an export format:</Trans>
            </legend>
            <label>
              <input
                type="radio"
                name="format"
                value="csv"
                checked={exportFormat === "csv"}
                onChange={(e) => setExportFormat(e.target.value)}
              />
              <Trans>Zip of CSVs</Trans>
            </label>

            <p>
              <Trans>
                A single zip archive that contains one comma-separated file for
                each of Project, Sessions, and People.
              </Trans>
            </p>

            {/* <label>
                <input
                  type="radio"
                  name="format"
                  value="spreadsheet"
                  checked={true}
                  disabled={true}
                />
                Spreadsheet (not implemented yet)
              </label>
              <p>
                A single file with sheets for each of Project, Session, and
                People
              </p> */}

            <label>
              <input
                type="radio"
                name="format"
                value="imdi"
                checked={exportFormat === "imdi"}
                onChange={(e) => setExportFormat(e.target.value)}
              />
              IMDI Only
            </label>
            <p>
              <Trans>
                A folder with an IMDI file for the project and each session.
              </Trans>
            </p>
            <label>
              <input
                type="radio"
                name="format"
                value="imdi-plus-files"
                checked={exportFormat === "imdi-plus-files"}
                onChange={(e) => setExportFormat(e.target.value)}
              />
              IMDI + Files
            </label>
            <p>
              <Trans>
                A folder containing both the IMDI files and all the project's
                archivable files.
              </Trans>
            </p>
          </fieldset>
          <div id="whichSessions">
            <label>
              <Trans>Choose which Sessions to export:</Trans>
            </label>
            <select
              name={"Which sessions to export"}
              value={whichSessionsOption}
              onChange={(event) => {
                setWhichSessionsOption(event.target.value);
              }}
            >
              <option key={"all"} value={"all"}>
                {i18n._(t`All Sessions`)}
              </option>
              <option
                key={"marked"}
                value={"marked"}
                disabled={countOfMarkedSessions === 0}
              >
                {i18n._(t`${countOfMarkedSessions} Marked Sessions`)}
              </option>
              }
            </select>
          </div>
        </div>
        <div className={"bottomButtonRow"}>
          {/* List as default last (in the corner), then stylesheet will reverse when used on Windows */}
          <div className={"okCancelGroup"}>
            <button onClick={() => handleCloseModal(false)}>
              <Trans>Cancel</Trans>
            </button>
            <button id="okButton" onClick={() => handleCloseModal(true)}>
              <Trans>Export</Trans>
            </button>
          </div>
        </div>
      </ReactModal>
    </CloseOnEscape>
  );
};
