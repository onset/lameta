import { css } from "@emotion/react";
import * as React from "react";
import { t } from "@lingui/macro";
import { Dialog, DialogContent, LinearProgress } from "@mui/material";
import { DialogMiddle } from "./LametaDialog";
import { Project, ProjectHolder } from "../model/Project/Project";

export interface LoadingProgress {
  phase: "sessions" | "people";
  // Overall progress across both phases (sessions + people)
  overallCurrent: number;
  overallTotal: number;
}

// Threshold for using async loading with progress dialog
// Projects with more than this many sessions will show a loading dialog
export const ASYNC_LOADING_THRESHOLD = 30;

// Check if a project directory should use async loading with progress
export const shouldUseAsyncLoading = (directory: string): boolean => {
  const folderCounts = Project.countFoldersInDirectory(directory);
  return folderCounts.sessionCount > ASYNC_LOADING_THRESHOLD;
};

// Load a project either synchronously or asynchronously based on size.
// For large projects (>10 sessions), loads async with progress callback.
// Returns the loaded project.
export const loadProject = async (
  directory: string,
  onProgress?: (progress: LoadingProgress) => void
): Promise<Project> => {
  if (shouldUseAsyncLoading(directory)) {
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
              <span>{t`Loading ${phaseLabel}...`}</span>
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
