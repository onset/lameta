import { t } from "@lingui/macro";
import { Folder } from "../../model/Folder/Folder";
import { Project } from "../../model/Project/Project";
import { ExportProgress } from "../../export/ExportBundleTypes";
import { mainProcessApi } from "../../mainProcess/MainProcessApiAccess";
import ImdiBundler from "../../export/ImdiBundler";
import { IMDIMode } from "../../export/ImdiGenerator";
import {
  startCollectingWarnings,
  stopCollectingWarnings,
  getCollectedWarnings,
  clearCollectedWarnings
} from "../../export/ExportWarningCollector";

export interface HybridImdiExportCallbacks {
  setExportProgress: React.Dispatch<React.SetStateAction<ExportProgress>>;
  setExportLog: React.Dispatch<React.SetStateAction<string[]>>;
  addLogEntry: (entry: string) => void;
  cancelRequestedRef: React.MutableRefObject<boolean>;
}

/**
 * Runs hybrid IMDI export: renderer generates XML, main process handles file I/O.
 * Returns true if successful, false if cancelled.
 */
export const runHybridImdiExport = async (
  project: Project,
  outputPath: string,
  imdiMode: IMDIMode,
  copyInProjectFiles: boolean,
  folderFilter: (f: Folder) => boolean,
  callbacks: HybridImdiExportCallbacks
): Promise<boolean> => {
  const { setExportProgress, setExportLog, addLogEntry, cancelRequestedRef } =
    callbacks;

  // Get job info for progress calculation
  const jobInfo = ImdiBundler.getExportJobInfo(
    project,
    outputPath,
    folderFilter
  );

  // Reset progress
  setExportProgress({
    phase: "preparing",
    currentSession: 0,
    totalSessions: jobInfo.totalSessions,
    currentSessionName: "",
    percentage: 0,
    message: t`Preparing export...`
  });
  setExportLog([]);
  cancelRequestedRef.current = false;

  // Start collecting warnings so they go to the log instead of toast notifications
  startCollectingWarnings();

  try {
    // Prepare export directory via main process
    await mainProcessApi.prepareImdiExportDirectory(outputPath);

    // Get the async generator for export data
    const generator = ImdiBundler.generateExportData(
      project,
      outputPath,
      imdiMode,
      copyInProjectFiles,
      folderFilter
    );

    let sessionIndex = 0;
    let result = await generator.next();

    // Process each session
    while (!result.done) {
      // Check for cancellation
      if (cancelRequestedRef.current) {
        // Clean up partial export
        await mainProcessApi.cleanupImdiExportDirectory(outputPath);
        stopCollectingWarnings();
        return false;
      }

      sessionIndex++;
      const sessionData = result.value;

      // Update progress
      const percentage = Math.round(
        (sessionIndex / jobInfo.totalSessions) * 100
      );
      setExportProgress({
        phase: "sessions",
        currentSession: sessionIndex,
        totalSessions: jobInfo.totalSessions,
        currentSessionName: sessionData.sessionId,
        percentage,
        message: t`Exporting ${sessionData.sessionId}...`
      });

      // Write session data via main process
      const writeResult = await mainProcessApi.writeImdiSessionData(
        sessionData
      );

      // Log any errors from file copying
      for (const error of writeResult.errors) {
        addLogEntry(`⚠️ ${error}`);
      }

      // Collect any warnings from IMDI generation (e.g., file naming problems)
      const sessionWarnings = getCollectedWarnings();
      for (const warning of sessionWarnings) {
        addLogEntry(`⚠️ ${warning}`);
      }
      clearCollectedWarnings();

      result = await generator.next();
    }

    // Check for final cancellation
    if (cancelRequestedRef.current) {
      await mainProcessApi.cleanupImdiExportDirectory(outputPath);
      stopCollectingWarnings();
      return false;
    }

    // Write corpus IMDI (the generator's return value)
    const corpusData = result.value;
    setExportProgress((prev) => ({
      ...prev,
      phase: "corpus",
      percentage: 100,
      message: t`Writing corpus metadata...`
    }));

    await mainProcessApi.writeImdiCorpusData(corpusData);

    stopCollectingWarnings();
    return true;
  } catch (err) {
    // Clean up on error
    stopCollectingWarnings();
    try {
      await mainProcessApi.cleanupImdiExportDirectory(outputPath);
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
};
