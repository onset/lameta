import { t } from "@lingui/macro";
import { Folder } from "../../model/Folder/Folder";
import { Project } from "../../model/Project/Project";
import { ExportProgress } from "../../export/ExportBundleTypes";
import { mainProcessApi } from "../../mainProcess/MainProcessApiAccess";
import ImdiBundler from "../../export/ImdiBundler";
import {
  IMDIMode,
  resetTildeBirthYearWarning
} from "../../export/ImdiGenerator";
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
 *
 * ## How Progress Updates Work (for future reference)
 *
 * Previously, export would block the UI completely - no progress updates, no cancel
 * button response, nothing. The fix is the **async generator pattern**.
 *
 * ### The Key Insight
 *
 * Each `await` statement is a point where JavaScript's event loop can:
 * - Process pending UI updates (React re-renders from setExportProgress)
 * - Handle user input (Cancel button clicks)
 * - Run other async tasks
 *
 * ### How It Works Here
 *
 * 1. `ImdiBundler.generateExportData()` is an **async generator** (note the `async *`).
 *    It `yield`s data for each session, pausing execution and returning control.
 *
 * 2. This loop calls `await generator.next()` for each session. Between sessions,
 *    the event loop runs, allowing:
 *    - `setExportProgress()` calls to actually update the UI
 *    - `cancelRequestedRef.current` checks to see the Cancel button was clicked
 *
 * 3. We use `useRef` for cancel (not `useState`) because refs update immediately
 *    without waiting for a React render cycle.
 *
 * ### Would This Work Without Main Process Offloading?
 *
 * Yes! The async generator alone provides responsive progress. The main process
 * offloading adds two benefits:
 * - Finer-grained progress (individual file copy events, not just per-session)
 * - Non-blocking large file copies (a 500MB file won't freeze the UI)
 *
 * But for basic progress/cancel functionality, the generator pattern is sufficient.
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
  // Reset the tilde birth year warning flag for this export
  resetTildeBirthYearWarning();

  try {
    // Prepare export directory via main process
    await mainProcessApi.prepareImdiExportDirectory(outputPath);

    // Get the async generator for export data.
    // This generator yields one ExportSessionData at a time, allowing us to
    // update progress between sessions. See the function comment above for details.
    const generator = ImdiBundler.generateExportData(
      project,
      outputPath,
      imdiMode,
      copyInProjectFiles,
      folderFilter
    );

    let sessionIndex = 0;
    let result = await generator.next();

    // Process each session one at a time.
    // Each iteration of this loop is an opportunity for the UI to update
    // because we `await` the generator and the main process API calls.
    while (!result.done) {
      // Check for cancellation BETWEEN sessions.
      // This is why the Cancel button works - we check the ref here,
      // and refs update immediately (unlike useState which waits for render).
      if (cancelRequestedRef.current) {
        // Clean up partial export
        await mainProcessApi.cleanupImdiExportDirectory(outputPath);
        stopCollectingWarnings();
        return false;
      }

      sessionIndex++;
      const sessionData = result.value;

      // Update progress state. This triggers a React re-render, but the actual
      // DOM update happens when we hit the next `await` and yield to the event loop.
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

      // Write session data via main process.
      // This `await` yields control to the event loop, allowing:
      // - The progress UI to actually repaint
      // - Click handlers to process (including Cancel)
      // The main process also sends file-level progress events during large copies.
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

      // Get the next session from the generator.
      // This `await` is another yield point for the event loop.
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
