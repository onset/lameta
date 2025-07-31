import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
// tslint:disable-next-line: no-duplicate-imports
import Alert from "@mui/material/Alert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useState } from "react";
import { observer } from "mobx-react";
import "./ExportDialog.scss";
import { ProjectHolder } from "../../model/Project/Project";
import { showInExplorer } from "../../other/crossPlatformUtilities";
import * as remote from "@electron/remote";
import * as Path from "path";
import { t, Trans } from "@lingui/macro";
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
import {
  LametaDialog,
  DialogTitle,
  DialogMiddle,
  DialogBottomButtons,
  DialogCancelButton,
  useSetupLametaDialog
} from "../LametaDialog";
import { Button } from "@mui/material";
import { IMDIMode } from "../../export/ImdiGenerator";
import { writeROCrateFile } from "../../export/ROCrate/WriteROCrateFile";

const saymore_orange = "#e69664";
import { app } from "@electron/remote";
import { clipboard } from "electron";
import { Session } from "src/model/Project/Session/Session";
import ReactMarkdown from "react-markdown";
import { lameta_dark_green, lameta_green } from "../../containers/theme";
const sanitize = require("sanitize-filename");

let staticShowExportDialog: () => void = () => {};
export { staticShowExportDialog as ShowExportDialog };

enum Mode {
  choosing = 0,
  exporting = 1,
  copying = 2,
  finished = 3,
  error = 4
}
export const ExportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = observer((props) => {
  const { currentlyOpen, showDialog, closeDialog } = useSetupLametaDialog();
  const [mode, setMode] = useState<Mode>(Mode.choosing);

  staticShowExportDialog = () => {
    setMode(Mode.choosing);
    showDialog();
    analyticsLocation("Export Dialog");
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

  // // Temporary debugging: pause when mode changes to exporting
  // React.useEffect(() => {
  //   if (mode === Mode.exporting) {
  //     debugger; // This will pause execution in the browser's dev tools
  //   }
  // }, [mode]);

  const [error, setError] = useState<string | undefined>(undefined);
  const [imdiValidated, setImdiValidated] = useState<boolean>(false);

  const [rulesBasedValidationResult, SetRulesBasedValidationResult] =
    React.useState<string | undefined>();

  const [outputPath, setOutputPath] = useState<string | undefined>(undefined);
  const [exportFormat, setExportFormat] = useState(
    userSettingsSingleton.ExportFormat
  );
  const [whichSessionsOption, setWhichSessionsOption] = useState("all");

  // Calculate marked sessions count directly in render - observer will handle reactivity
  const countOfMarkedSessions = props.projectHolder?.project?.sessions
    ? props.projectHolder.project.sessions.countOfMarkedFolders()
    : 0;

  React.useEffect(() => {
    // guess what they will want based on if they have checked anything
    setWhichSessionsOption(countOfMarkedSessions === 0 ? "all" : "marked");
  }, [countOfMarkedSessions]);

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

      // Handle RO-Crate export differently - no file dialog
      if (exportFormat === "ro-crate") {
        setMode(Mode.exporting);
        setTimeout(() => {
          try {
            // For RO-Crate, we still need to check for rules violations
            const folderFilter =
              whichSessionsOption === "all"
                ? () => true
                : (f: Folder) => f.marked;
            const sessions: Session[] =
              props.projectHolder.project!.sessions.items.filter(
                folderFilter
              ) as unknown as Session[];
            // for each session, call getRulesViolationsString() and if it is not empty, add to RulesBasedValidationResult
            let rulesBasedValidationResult = "";
            for (const session of sessions) {
              const result = session.getRulesViolationsString(
                props.projectHolder.project!.persons.items.map((p) =>
                  p.properties.getTextStringOrEmpty(p.propertyForCheckingId)
                )
              );
              if (result) {
                rulesBasedValidationResult += `**${session.displayName}**\n\n${result}\n\n`;
              }
            }
            SetRulesBasedValidationResult(rulesBasedValidationResult);

            // RO-Crate export writes to a fixed location in the project directory
            const outputPath = Path.join(
              props.projectHolder.project!.directory,
              "ro-crate-metadata.json"
            );
            setOutputPath(outputPath);
            saveFilesAsync("");
          } catch (err) {
            NotifyException(
              err,
              `${t`There was a problem exporting:`} ${err.message}`
            );
            closeDialog();
          }
        }, 100);
        return;
      }

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
            closeDialog();
          } else {
            setMode(Mode.exporting);
            // setTimeout lets us update the ui before diving in
            setTimeout(() => {
              try {
                const folderFilter =
                  whichSessionsOption === "all"
                    ? () => true
                    : (f: Folder) => f.marked;
                const sessions: Session[] =
                  props.projectHolder.project!.sessions.items.filter(
                    folderFilter
                  ) as unknown as Session[];
                // for each session, call getRulesViolationsString() and if it is not empty, add to RulesBasedValidationResult
                let rulesBasedValidationResult = "";
                for (const session of sessions) {
                  const result = session.getRulesViolationsString(
                    props.projectHolder.project!.persons.items.map((p) =>
                      p.properties.getTextStringOrEmpty(p.propertyForCheckingId)
                    )
                  );
                  if (result) {
                    rulesBasedValidationResult += `**${session.displayName}**\n\n${result}\n\n`;
                  }
                }
                SetRulesBasedValidationResult(rulesBasedValidationResult);

                setOutputPath(result.filePath);
                // we'll return from this while the saving happens. When it is done, our mode will change from `exporting` to `finished`.
                saveFilesAsync(result.filePath!);
              } catch (err) {
                NotifyException(
                  err,
                  `${t`There was a problem exporting:`} ${err.message}`
                );
                closeDialog();
              }
            }, 100);
          }
        });
    } else {
      CopyManager.abandonCopying(true); // cancel can be clicked while doing imdi+files.
      closeDialog();
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
    const startTime = Date.now();
    const MIN_EXPORT_TIME = 1000; // 1 seconds minimum to give user some confirmation that we did do something (ro-crate export is very fast)

    const finishExport = async () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = MIN_EXPORT_TIME - elapsedTime;

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }
    };

    try {
      const folderFilter =
        whichSessionsOption === "all"
          ? (f: Folder) => true
          : (f: Folder) => f.marked;

      // RO-Crate doesn't need a path parameter, other exports do
      if (path || exportFormat === "ro-crate") {
        switch (exportFormat) {
          case "csv":
            analyticsEvent("Export", "Export CSV");

            asyncMakeGenericCsvZipFile(
              path,
              props.projectHolder.project!,
              folderFilter
            ).then(async () => {
              await finishExport();
              setMode(Mode.finished); // don't have to wait for any copying of big files
            });
            break;
          case "paradisec":
            analyticsEvent("Export", "Export Paradisec CSV");

            makeParadisecCsv(path, props.projectHolder.project!, folderFilter);
            await finishExport();
            setMode(Mode.finished); // don't have to wait for any copying of big files
            break;
          case "ro-crate":
            analyticsEvent("Export", "Export RO-Crate");
            // RO-Crate export writes to project directory, path parameter is ignored
            await writeROCrateFile(props.projectHolder.project!);
            await finishExport();
            setMode(Mode.finished);
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
            await finishExport();
            setMode(Mode.finished); // don't have to wait for any copying of big files
            setImdiValidated(true);
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
              ).then(async () => {
                await finishExport();
                // At this point we're normally still copying files asynchronously, via RobustLargeFileCopy.
                setMode(Mode.copying); // don't have to wait for any copying of big files
                setImdiValidated(true);
              });
            }
            break;
        }
      }
    } catch (err) {
      setError(String(err));
      setMode(Mode.error);
    }
  };

  return (
    <LametaDialog
      open={currentlyOpen}
      requestClose={() => {
        if (mode === Mode.exporting || mode === Mode.copying) {
          return;
        }
        handleContinue(false);
      }}
      css={css`
        width: 600px;
        height: 700px;
      `}
    >
      <DialogTitle title={t`Export Project`} />
      <DialogMiddle
        css={css`
          min-width: 400px;
          min-height: 340px;
        `}
      >
        {mode === Mode.choosing && (
          <ExportChoices
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            whichSessionsOption={whichSessionsOption}
            setWhichSessionsOption={setWhichSessionsOption}
            countOfMarkedSessions={countOfMarkedSessions}
            setCountOfMarkedSessions={() => {}} // No-op since we're using useMemo now
          />
        )}
        <div
          css={css`
            /* margin-left: 20px; */
          `}
        >
          {rulesBasedValidationResult &&
            (mode === Mode.error || mode === Mode.finished) && (
              <>
                <Alert severity="warning">
                  <ReactMarkdown
                    children={rulesBasedValidationResult!}
                    renderers={{
                      paragraph: ({ children }) => <div>{children}</div>
                    }}
                  />
                </Alert>
                <br />
              </>
            )}
          {mode === Mode.error && (
            <div>
              <Alert severity="error">
                <div css={css``}>{String(error)}</div>
              </Alert>
              <br />
              <Button
                variant="outlined"
                onClick={() => clipboard.writeText(String(error!))}
              >
                Copy
              </Button>
            </div>
          )}
          {mode === Mode.exporting && (
            <h2>
              <Trans>Exporting...</Trans>
            </h2>
          )}
          {mode === Mode.finished && (
            <div
              css={css`
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 10px;
                min-height: 200px;
              `}
            >
              {imdiValidated && (
                <Alert severity="success">
                  {t`The IMDI files were validated.`}
                </Alert>
              )}

              <h2
                css={css`
                  display: flex;
                  align-items: center;
                  gap: 8px;
                `}
              >
                <CheckCircleIcon
                  css={css`
                    color: ${lameta_dark_green};
                  `}
                />
                <Trans>Done</Trans>
              </h2>
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
      </DialogMiddle>

      <DialogBottomButtons>
        {mode === Mode.error && (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => closeDialog()}
          >
            <Trans>Close</Trans>
          </Button>
        )}
        {mode === Mode.choosing && (
          <>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleContinue(true)}
              css={css`
                min-width: 80px;
              `}
            >
              <Trans>Export</Trans>
            </Button>
            <DialogCancelButton onClick={() => handleContinue(false)} />
          </>
        )}
        {mode === Mode.finished && (
          <>
            <Button
              variant="outlined"
              onClick={() => closeDialog()}
              css={css`
                min-width: 80px;
              `}
            >
              <Trans>Close</Trans>
            </Button>
            <Button
              id="okButton"
              variant="contained"
              color="secondary"
              onClick={() => {
                closeDialog();
                showInExplorer(outputPath || "");
              }}
              css={css`
                min-width: 120px;
              `}
            >
              <Trans>Show export</Trans>
            </Button>
          </>
        )}
      </DialogBottomButtons>
    </LametaDialog>
  );
});
