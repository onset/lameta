import { css } from "@emotion/react";
import * as React from "react";
import { t } from "@lingui/macro";
import { Dialog, DialogContent, LinearProgress } from "@mui/material";
import { DialogMiddle } from "./LametaDialog";
import { Project, ProjectHolder } from "../model/Project/Project";
import {
  getCloudFileProvider,
  getCloudProviderNameForPath
} from "../other/cloudFileStatus";
import { collectMetadataFilePaths } from "../other/cloudMetadataPrefetch";

export interface LoadingProgress {
  phase: "sessions" | "people";
  // Overall progress across both phases (sessions + people)
  overallCurrent: number;
  overallTotal: number;
}

// Threshold for using async loading with progress dialog
// Projects with more than this many sessions will show a loading dialog
export const ASYNC_LOADING_THRESHOLD = 30;

// Does this project have any cloud-evicted (cloud-only) metadata file that a
// real provider could fetch? Such files hydrate one-at-a-time when read, at a
// few seconds each, which would freeze the renderer -- so we route these
// projects through the async loader + progress dialog just like large ones.
export const hasCloudEvictedMetadata = (directory: string): boolean => {
  try {
    const provider = getCloudFileProvider();
    // No provider that can deliver placeholders: nothing would be cloud-only.
    if (!provider.capabilities.canFetch) {
      return false;
    }
    for (const path of collectMetadataFilePaths(directory)) {
      if (provider.getStatus(path) === "cloudOnly") {
        return true; // short-circuit on the first hit
      }
    }
    return false;
  } catch {
    return false;
  }
};

// The decision about how to load a project, computed once per load so we don't
// stat every metadata file twice (deciding async vs sync, and labeling the
// dialog).
export interface LoadPlan {
  // Whether to use the async, yielding loader with a progress dialog.
  useAsync: boolean;
  // Set only when cloud-evicted metadata is what makes this load slow -- the
  // name of the sync engine ("OneDrive", "Dropbox", ...) for the dialog.
  cloudProviderName?: string;
}

// Compute the load plan for a directory in a single pass: async when the
// project is large (> ASYNC_LOADING_THRESHOLD sessions) or has cloud-evicted
// metadata that would otherwise block the renderer while it hydrates.
export const getLoadPlan = (directory: string): LoadPlan => {
  // Cloud eviction, when present, dominates the wait and also labels the
  // dialog, so check it first.
  if (hasCloudEvictedMetadata(directory)) {
    let cloudProviderName: string;
    try {
      cloudProviderName =
        getCloudProviderNameForPath(directory) ?? t`the cloud`;
    } catch {
      cloudProviderName = t`the cloud`;
    }
    return { useAsync: true, cloudProviderName };
  }
  const folderCounts = Project.countFoldersInDirectory(directory);
  return { useAsync: folderCounts.sessionCount > ASYNC_LOADING_THRESHOLD };
};

// Check if a project directory should use async loading with progress.
export const shouldUseAsyncLoading = (directory: string): boolean =>
  getLoadPlan(directory).useAsync;

// Load a project either synchronously or asynchronously based on the plan.
// Callers that already computed a plan (to drive dialog visibility/message)
// should pass it so we don't recompute it; others get it computed here.
// Returns the loaded project.
export const loadProject = async (
  directory: string,
  onProgress?: (progress: LoadingProgress) => void,
  plan?: LoadPlan
): Promise<Project> => {
  const { useAsync } = plan ?? getLoadPlan(directory);
  if (useAsync) {
    return Project.fromDirectoryAsync(directory, onProgress);
  } else {
    return Project.fromDirectory(directory);
  }
};

// Helper to load a project and set it on a ProjectHolder, with optional progress callback
// This is useful for integrating with React components that manage their own state
export const loadProjectIntoHolder = async (
  directory: string,
  projectHolder: ProjectHolder,
  onProgress?: (progress: LoadingProgress) => void
): Promise<void> => {
  const project = await loadProject(directory, onProgress);
  projectHolder.setProject(project);
};

export const LoadingProjectDialog: React.FunctionComponent<{
  open: boolean;
  progress: LoadingProgress;
  // When the load was triggered by cloud-evicted files, the name of the sync
  // engine ("OneDrive", "Dropbox", ...) so we can say where we're waiting on.
  cloudProviderName?: string;
}> = (props) => {
  if (!props.open) {
    return null;
  }

  // Use overall progress for the percentage so it never goes backwards
  const percentage =
    props.progress.overallTotal > 0
      ? Math.round(
          (props.progress.overallCurrent / props.progress.overallTotal) * 100
        )
      : 0;

  const phaseLabel =
    props.progress.phase === "sessions" ? t`Sessions` : t`People`;

  // When cloud files are being fetched, the wait is dominated by the download,
  // not by our per-item work, so lead with that instead of the phase.
  const message = props.cloudProviderName
    ? t`Getting project information from ${props.cloudProviderName}...`
    : t`Loading ${phaseLabel}...`;

  return (
    <Dialog
      open={props.open}
      data-testid="loading-project-dialog"
      css={css`
        .MuiDialog-paper {
          min-width: 400px;
        }
      `}
    >
      <DialogContent
        css={css`
          display: flex;
          flex-direction: column;
          padding: 24px;
        `}
      >
        <DialogMiddle>
          <div
            css={css`
              display: flex;
              flex-direction: column;
              gap: 16px;
            `}
          >
            {/* Phase and progress info */}
            <div
              css={css`
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
                color: #333;
              `}
            >
              <span>{message}</span>
              <span
                css={css`
                  color: #666;
                  font-size: 13px;
                `}
              >
                {percentage}%
              </span>
            </div>

            {/* Progress bar */}
            <LinearProgress
              variant="determinate"
              value={percentage}
              css={css`
                height: 8px;
                border-radius: 4px;
              `}
            />
          </div>
        </DialogMiddle>
      </DialogContent>
    </Dialog>
  );
};
