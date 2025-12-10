import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
// tslint:disable-next-line: no-duplicate-imports
import Alert from "@mui/material/Alert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import { IconButton, Tooltip } from "@mui/material";
import { useState, useRef, useCallback, useEffect } from "react";
import { observer } from "mobx-react";
import "./ExportDialog.css";
import { ProjectHolder } from "../../model/Project/Project";
import { revealInFolder } from "../../other/crossPlatformUtilities";
import * as remote from "@electron/remote";
import * as Path from "path";
import { t, Trans } from "@lingui/macro";
import { ipcRenderer } from "electron";
import { analyticsLocation, analyticsEvent } from "../../other/analytics";
import { Folder } from "../../model/Folder/Folder";
import { NotifyException, NotifyWarning } from "../Notify";
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
import { Button, LinearProgress } from "@mui/material";
import { IMDIMode } from "../../export/ImdiGenerator";
import { writeROCrateFile } from "../../export/ROCrate/WriteROCrateFile";
import { ExportProgress } from "../../export/ExportBundleTypes";
import { mainProcessApi } from "../../mainProcess/MainProcessApiAccess";
import { clipboard } from "electron";
import { Session } from "src/model/Project/Session/Session";
import { lameta_green, lameta_dark_green } from "../../containers/theme";
import { GetOtherConfigurationSettings } from "../../model/Project/OtherConfigurationSettings";

// Export-specific modules
import { runRoCrateValidation } from "./roCrateExport";
import { runHybridImdiExport } from "./imdiExport";
import {
  getPathForCsvSaving,
  getPathForParadisecSaving,
  getPathForIMDISaving
} from "./exportPaths";

let staticShowExportDialog: () => void = () => {};
export { staticShowExportDialog as ShowExportDialog };

// Warning category colors - each category gets a distinct left border color
const warningCategoryColors = [
  "#e65100", // deep orange
  "#7b1fa2", // purple
  "#1565c0", // blue
  "#2e7d32", // green
  "#c62828", // red
  "#00838f", // cyan
  "#4527a0", // deep purple
  "#ef6c00", // orange
  "#283593", // indigo
  "#00695c" // teal
];

// Patterns to identify warning categories
const warningCategoryPatterns: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /does not comply with the file naming rules/i,
    label: "file-naming"
  },
  { pattern: /BirthYear .* is not valid for IMDI/i, label: "birthyear" },
  { pattern: /missing/i, label: "missing" },
  { pattern: /could not/i, label: "could-not" }
];

// Get the category for a warning message
const getWarningCategory = (message: string): string => {
  for (const { pattern, label } of warningCategoryPatterns) {
    if (pattern.test(message)) {
      return label;
    }
  }
  return "other";
};

// Get color for a category (uses consistent mapping)
const categoryColorMap = new Map<string, string>();
let nextColorIndex = 0;

const getColorForCategory = (category: string): string => {
  if (!categoryColorMap.has(category)) {
    categoryColorMap.set(
      category,
      warningCategoryColors[nextColorIndex % warningCategoryColors.length]
    );
    nextColorIndex++;
  }
  return categoryColorMap.get(category)!;
};

// Reset color mapping (call when dialog opens)
const resetCategoryColors = () => {
  categoryColorMap.clear();
  nextColorIndex = 0;
};

enum Mode {
  choosing = 0,
  exporting = 1,
  copying = 2,
  finished = 3,
  error = 4,
  cancelled = 5
}
export const ExportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = observer((props) => {
  const { currentlyOpen, showDialog, closeDialog } = useSetupLametaDialog();
  const [mode, setMode] = useState<Mode>(Mode.choosing);

  staticShowExportDialog = () => {
    setMode(Mode.choosing);
    resetCategoryColors(); // Reset warning color assignments for fresh dialog
    // Reset all export-related state for a fresh dialog
    setExportLog([]);
    setExportProgress({
      phase: "preparing",
      currentSession: 0,
      totalSessions: 0,
      currentSessionName: "",
      percentage: 0,
      message: ""
    });
    setImdiValidated(false);
    SetRulesBasedValidationResult(undefined);
    setOutputPath(undefined);
    cancelRequestedRef.current = false;
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

  // Progress tracking for hybrid export
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    phase: "preparing",
    currentSession: 0,
    totalSessions: 0,
    currentSessionName: "",
    percentage: 0,
    message: ""
  });
  const [exportLog, setExportLog] = useState<string[]>([]);
  const cancelRequestedRef = useRef(false);
  const exportPathRef = useRef<string>("");

  // Listen for file-level progress events from main process
  useEffect(() => {
    const handleFileProgress = (
      _event: any,
      progress: {
        sessionName: string;
        currentFile: string;
        currentFileIndex: number;
        totalFiles: number;
      }
    ) => {
      setExportProgress((prev) => ({
        ...prev,
        currentFile: progress.currentFile,
        currentFileIndex: progress.currentFileIndex,
        totalFilesInSession: progress.totalFiles
      }));
    };

    ipcRenderer.on("export-file-progress", handleFileProgress);
    return () => {
      ipcRenderer.off("export-file-progress", handleFileProgress);
    };
  }, []);

  // Helper to add a log entry
  const addLogEntry = useCallback((entry: string) => {
    setExportLog((prev) => [...prev, entry]);
  }, []);

  // Callbacks for hybrid IMDI export
  const hybridExportCallbacks = {
    setExportProgress,
    setExportLog,
    addLogEntry,
    cancelRequestedRef
  };

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
                rulesBasedValidationResult += `**${session.id}**\n\n${result}\n\n`;
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
          defaultPath = getPathForCsvSaving(
            props.projectHolder.project!.displayName
          );
          break;
        case "paradisec":
          defaultPath = getPathForParadisecSaving(
            props.projectHolder.project!.displayName
          );
          break;
        default:
          defaultPath = getPathForIMDISaving(
            props.projectHolder.project!.displayName,
            exportFormat
          );
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
                    rulesBasedValidationResult += `**${session.id}**\n\n${result}\n\n`;
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
            setExportProgress((prev) => ({
              ...prev,
              message: t`Generating CSV export...`,
              percentage: Math.max(prev.percentage || 0, 20)
            }));

            await asyncMakeGenericCsvZipFile(
              path,
              props.projectHolder.project!,
              folderFilter
            );

            setExportProgress((prev) => ({
              ...prev,
              message: t`CSV export complete`,
              percentage: 100
            }));
            await finishExport();
            setMode(Mode.finished); // don't have to wait for any copying of big files
            break;
          case "paradisec":
            analyticsEvent("Export", "Export Paradisec CSV");
            setExportProgress((prev) => ({
              ...prev,
              message: t`Generating PARADISEC CSV...`,
              percentage: Math.max(prev.percentage || 0, 25)
            }));

            makeParadisecCsv(path, props.projectHolder.project!, folderFilter);

            setExportProgress((prev) => ({
              ...prev,
              message: t`PARADISEC CSV export complete`,
              percentage: 100
            }));
            await finishExport();
            setMode(Mode.finished); // don't have to wait for any copying of big files
            break;
          case "ro-crate":
            analyticsEvent("Export", "Export RO-Crate");
            // RO-Crate export writes to project directory, path parameter is ignored
            setExportProgress((prev) => ({
              ...prev,
              message: t`Generating RO-Crate metadata...`,
              percentage: Math.max(prev.percentage || 0, 25)
            }));
            const roCrateData = await writeROCrateFile(
              props.projectHolder.project!
            );
            setExportProgress((prev) => ({
              ...prev,
              message: t`Validating RO-Crate export...`,
              percentage: Math.max(prev.percentage || 0, 90)
            }));
            await runRoCrateValidation(roCrateData);
            setExportProgress((prev) => ({
              ...prev,
              message: t`RO-Crate export complete`,
              percentage: 100
            }));
            await finishExport();
            setMode(Mode.finished);
            break;
          case "imdi":
            analyticsEvent("Export", "Export IMDI Xml");

            const imdiSuccess = await runHybridImdiExport(
              props.projectHolder.project!,
              path,
              IMDIMode.RAW_IMDI,
              false,
              folderFilter,
              hybridExportCallbacks
            );
            if (imdiSuccess) {
              await finishExport();
              setMode(Mode.finished);
              setImdiValidated(true);
            } else {
              // Cancelled
              setMode(Mode.cancelled);
            }
            break;
          case "opex-plus-files":
            analyticsEvent("Export", "Export OPEX Plus Files");
            if (CopyManager.filesAreStillCopying()) {
              NotifyWarning(
                t`lameta cannot export files while files are still being copied in.`
              );
              setMode(Mode.choosing);
            } else {
              const success = await runHybridImdiExport(
                props.projectHolder.project!,
                path,
                IMDIMode.OPEX,
                true,
                folderFilter,
                hybridExportCallbacks
              );
              if (success) {
                await finishExport();
                setMode(Mode.finished);
                setImdiValidated(true);
              } else {
                // Cancelled
                setMode(Mode.cancelled);
              }
            }
            break;
        }
      }
    } catch (err) {
      // Add error to the log with error prefix
      addLogEntry(`❌ ${String(err)}`);
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
        .MuiDialog-paper {
          width: 660px;
          max-height: 90vh;
        }
      `}
    >
      <DialogTitle title={t`Export Project`} />
      <DialogMiddle
        css={css`
          min-width: 420px;
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
          {mode === Mode.error &&
            (() => {
              // Format rules-based validation warnings to match export log style
              const projectDir = props.projectHolder.project?.directory || "";

              // Convert rulesBasedValidationResult to plain warning lines
              const rulesWarnings: string[] = [];
              if (rulesBasedValidationResult) {
                // Parse markdown: **Session Name**\n\nviolation text
                const sections = rulesBasedValidationResult
                  .split(/\*\*([^*]+)\*\*/)
                  .filter((s) => s.trim());
                for (let i = 0; i < sections.length; i += 2) {
                  const sessionName = sections[i]?.trim();
                  const violation = sections[i + 1]?.trim();
                  if (sessionName && violation) {
                    rulesWarnings.push(`⚠️ ${sessionName}: ${violation}`);
                  }
                }
              }

              // Strip project path from export log entries
              const cleanedExportLog = exportLog.map((entry) => {
                if (projectDir && entry.includes(projectDir)) {
                  return entry
                    .replace(projectDir + Path.sep, "")
                    .replace(projectDir, "");
                }
                return entry;
              });

              const allEntries = [...rulesWarnings, ...cleanedExportLog];

              // Helper to decode HTML entities and strip formatting tags for clipboard
              const decodeForClipboard = (html: string) =>
                html
                  .replace(/<b>/g, "")
                  .replace(/<\/b>/g, "")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&amp;/g, "&");

              const copyEntriesToClipboard = () => {
                clipboard.writeText(
                  allEntries.map(decodeForClipboard).join("\n")
                );
              };

              // Find index of first error for scrolling
              const firstErrorIndex = allEntries.findIndex((entry) =>
                entry.startsWith("❌")
              );

              return (
                <div
                  css={css`
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 4px;
                    min-height: 200px;
                  `}
                >
                  <h3
                    css={css`
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      color: #d32f2f;
                    `}
                  >
                    <ErrorIcon color="error" />
                    <Trans>Export failed</Trans>
                  </h3>

                  {/* Show log with errors and warnings */}
                  {allEntries.length > 0 && (
                    <div
                      ref={(el) => {
                        // Auto-scroll to first error
                        if (el && firstErrorIndex >= 0) {
                          const errorElement = el.children[
                            firstErrorIndex
                          ] as HTMLElement;
                          if (errorElement) {
                            errorElement.scrollIntoView({ block: "nearest" });
                          }
                        }
                      }}
                      css={css`
                        position: relative;
                        max-height: 300px;
                        overflow-y: auto;
                        background: #f5f5f5;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 8px;
                        padding-right: 32px;
                        font-size: 12px;
                        font-family: monospace;
                        white-space: pre-wrap;
                        word-break: break-word;
                      `}
                    >
                      <Tooltip title={t`Copy to clipboard`}>
                        <IconButton
                          size="small"
                          onClick={copyEntriesToClipboard}
                          css={css`
                            position: absolute;
                            top: 4px;
                            right: 4px;
                            padding: 4px;
                          `}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {allEntries.map((entry, i) => {
                        const category = getWarningCategory(entry);
                        const color = getColorForCategory(category);
                        return (
                          <div
                            key={i}
                            css={css`
                              border-left: 3px solid ${color};
                              padding-left: 8px;
                              margin-bottom: 4px;
                            `}
                            dangerouslySetInnerHTML={{ __html: entry }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          {mode === Mode.exporting && (
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-height: 200px;
              `}
            >
              {/* Session message and percentage on same line */}
              <div
                css={css`
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  font-size: 13px;
                  color: #333;
                  margin-top: 8px;
                `}
              >
                <span>{exportProgress.message}</span>
                <span
                  css={css`
                    color: #666;
                    font-size: 12px;
                  `}
                >
                  {exportProgress.percentage}%
                </span>
              </div>

              {/* Progress bar */}
              <LinearProgress
                variant="determinate"
                value={exportProgress.percentage}
                css={css`
                  height: 8px;
                  border-radius: 4px;
                `}
              />

              {/* File copying status */}
              <div
                css={css`
                  font-size: 13px;
                  color: #666;
                  min-height: 1.4em;
                `}
              >
                {exportProgress.currentFile && (
                  <>
                    {t`Copying ${exportProgress.currentFile}`}
                    {exportProgress.totalFilesInSession &&
                      exportProgress.totalFilesInSession > 1 &&
                      ` (${exportProgress.currentFileIndex} of ${exportProgress.totalFilesInSession})`}
                  </>
                )}
              </div>

              {/* Mini log for warnings/errors */}
              {exportLog.length > 0 && (
                <div
                  data-testid="export-log"
                  css={css`
                    max-height: 300px;
                    overflow-y: auto;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 8px;
                    font-size: 12px;
                    font-family: monospace;
                  `}
                >
                  {exportLog.map((entry, i) => {
                    const category = getWarningCategory(entry);
                    const color = getColorForCategory(category);
                    return (
                      <div
                        key={i}
                        css={css`
                          border-left: 3px solid ${color};
                          padding-left: 8px;
                          margin-bottom: 4px;
                        `}
                      >
                        {entry}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {mode === Mode.finished &&
            (() => {
              // Format rules-based validation warnings to match export log style
              const projectDir = props.projectHolder.project?.directory || "";

              // Convert rulesBasedValidationResult to plain warning lines
              const rulesWarnings: string[] = [];
              if (rulesBasedValidationResult) {
                // Parse markdown: **Session Name**\n\nviolation text
                const sections = rulesBasedValidationResult
                  .split(/\*\*([^*]+)\*\*/)
                  .filter((s) => s.trim());
                for (let i = 0; i < sections.length; i += 2) {
                  const sessionName = sections[i]?.trim();
                  const violation = sections[i + 1]?.trim();
                  if (sessionName && violation) {
                    rulesWarnings.push(`⚠️ ${sessionName}: ${violation}`);
                  }
                }
              }

              // Strip project path from export log warnings
              const cleanedExportLog = exportLog.map((entry) => {
                if (projectDir && entry.includes(projectDir)) {
                  return entry
                    .replace(projectDir + Path.sep, "")
                    .replace(projectDir, "");
                }
                return entry;
              });

              const allWarnings = [...rulesWarnings, ...cleanedExportLog];
              const hasWarnings = allWarnings.length > 0;

              // Helper to decode HTML entities and strip formatting tags for clipboard
              const decodeForClipboard = (html: string) =>
                html
                  .replace(/<b>/g, "")
                  .replace(/<\/b>/g, "")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&amp;/g, "&");

              const copyWarningsToClipboard = () => {
                clipboard.writeText(
                  allWarnings.map(decodeForClipboard).join("\n")
                );
              };

              return (
                <div
                  css={css`
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 4px;
                    min-height: 200px;
                  `}
                >
                  <h3
                    css={css`
                      display: flex;
                      align-items: center;
                      gap: 8px;
                    `}
                  >
                    {hasWarnings ? (
                      <WarningIcon color="warning" />
                    ) : (
                      <CheckCircleIcon
                        css={css`
                          color: ${lameta_dark_green};
                        `}
                      />
                    )}
                    {hasWarnings ? (
                      <Trans>Done, with {allWarnings.length} warnings</Trans>
                    ) : (
                      <Trans>Done</Trans>
                    )}
                  </h3>

                  {/* Show warnings log if any */}
                  {hasWarnings && (
                    <div
                      css={css`
                        position: relative;
                        max-height: 300px;
                        overflow-y: auto;
                        background: #f5f5f5;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 8px;
                        padding-right: 32px;
                        font-size: 12px;
                        font-family: monospace;
                        white-space: pre-wrap;
                        word-break: break-word;
                      `}
                    >
                      <Tooltip title={t`Copy to clipboard`}>
                        <IconButton
                          size="small"
                          onClick={copyWarningsToClipboard}
                          css={css`
                            position: absolute;
                            top: 4px;
                            right: 4px;
                            padding: 4px;
                          `}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {allWarnings.map((entry, i) => {
                        const category = getWarningCategory(entry);
                        const color = getColorForCategory(category);
                        return (
                          <div
                            key={i}
                            css={css`
                              border-left: 3px solid ${color};
                              padding-left: 8px;
                              margin-bottom: 4px;
                            `}
                            dangerouslySetInnerHTML={{ __html: entry }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {imdiValidated && (
                    <div
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 12px;
                        //background: ${lameta_green};
                        //border: 1px solid ${lameta_dark_green};
                        border-radius: 4px;
                        color: ${lameta_dark_green};
                        font-size: 14px;
                      `}
                    >
                      <CheckCircleIcon
                        css={css`
                          color: ${lameta_dark_green};
                          font-size: 20px;
                        `}
                      />
                      {t`The IMDI files were validated.`} (
                      {GetOtherConfigurationSettings().imdiSchema})
                    </div>
                  )}
                </div>
              );
            })()}
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
          {mode === Mode.cancelled && (
            <div
              css={css`
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 10px;
                min-height: 200px;
              `}
            >
              <Alert
                severity="info"
                css={css`
                  .MuiAlert-icon {
                    color: inherit;
                  }
                `}
              >
                <Trans>Export was cancelled. No files were exported.</Trans>
              </Alert>
            </div>
          )}
        </div>
      </DialogMiddle>

      <DialogBottomButtons>
        {(mode === Mode.error || mode === Mode.cancelled) && (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => closeDialog()}
          >
            <Trans>Close</Trans>
          </Button>
        )}
        {mode === Mode.exporting && (
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              cancelRequestedRef.current = true;
              // Also cancel any active file copy operations in the main process
              mainProcessApi.cancelImdiExportCopyOperations();
              setExportProgress((prev) => ({
                ...prev,
                message: t`Cancelling...`
              }));
            }}
          >
            <Trans>Cancel</Trans>
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
                revealInFolder(outputPath || "");
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
