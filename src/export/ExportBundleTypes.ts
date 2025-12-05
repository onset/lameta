/**
 * Types for the hybrid export approach where renderer generates IMDI XML
 * and main process handles all file I/O.
 */

/**
 * Represents a file to be copied during export
 */
export interface FileCopyRequest {
  /** Source path (absolute) */
  source: string;
  /** Destination path (absolute, already sanitized) */
  destination: string;
}

/**
 * Represents a single session/folder's export data
 */
export interface ExportSessionData {
  /** Session/folder display name for progress reporting */
  displayName: string;

  /** The generated IMDI/OPEX XML content */
  imdiXml: string;

  /** Where to write the IMDI file (absolute path) */
  imdiPath: string;

  /** Directories that need to be created */
  directoriesToCreate: string[];

  /** Files to copy (empty if copyInProjectFiles is false) */
  filesToCopy: FileCopyRequest[];
}

/**
 * Result of generating the corpus/root IMDI
 */
export interface ExportCorpusData {
  /** The generated corpus IMDI XML */
  imdiXml: string;

  /** Where to write the corpus IMDI file */
  imdiPath: string;

  /** Project display name */
  displayName: string;
}

/**
 * Overall export job metadata
 */
export interface ExportJobInfo {
  /** Total number of sessions to export (for progress calculation) */
  totalSessions: number;

  /** Root output directory */
  rootDirectory: string;

  /** Second level directory name (project folder name) */
  secondLevelDirectory: string;
}

/**
 * Progress phases for the export
 */
export type ExportPhase =
  | "preparing"
  | "sessions"
  | "corpus"
  | "copying"
  | "done"
  | "cancelled"
  | "error";

/**
 * Progress update during export
 */
export interface ExportProgress {
  phase: ExportPhase;
  currentSession: number;
  totalSessions: number;
  currentSessionName: string;
  /** 0-100 */
  percentage: number;
  message: string;
}
