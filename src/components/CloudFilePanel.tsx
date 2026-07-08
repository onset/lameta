import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { observer } from "mobx-react";
import { t, Trans } from "@lingui/macro";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import { Button, CircularProgress, Tooltip } from "@mui/material";
const filesize = require("filesize");
import { File } from "../model/file/File";
import { NotifyError } from "./Notify";
import { lameta_dark_blue } from "../containers/theme";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function useElapsedWhileHydrating(file: File): number {
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const startTimeRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    if (file.cloudStatus !== "hydrating") {
      startTimeRef.current = undefined;
      setElapsedMs(0);
      return;
    }
    if (startTimeRef.current === undefined) {
      startTimeRef.current = Date.now();
    }
    const start = startTimeRef.current;
    setElapsedMs(Date.now() - start);
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [file.cloudStatus]);

  return elapsedMs;
}

// The button/progress/stop-waiting control, shared between the full
// CloudFilePanel (shown instead of a preview) and the inline
// FileStatusBlock (shown as a status strip under the file list).
export const CloudFileFetchControl: React.FunctionComponent<{
  file: File;
}> = observer((props) => {
  const { file } = props;
  const elapsedMs = useElapsedWhileHydrating(file);
  const sizeLabel = filesize(file.getSizeInBytes(), { round: 0 });

  if (file.cloudStatus === "hydrating") {
    return (
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: 10px;
        `}
      >
        <CircularProgress size={18} />
        <span>
          <Trans>Making available… ({formatElapsed(elapsedMs)})</Trans>
        </span>
        <Tooltip
          title={t`OneDrive may continue fetching in the background.`}
        >
          <Button
            size="small"
            onClick={() => {
              file.stopWaiting();
            }}
          >
            <Trans>Stop waiting</Trans>
          </Button>
        </Tooltip>
      </div>
    );
  }

  return (
    <Button
      variant="contained"
      onClick={async () => {
        try {
          await file.makeAvailableOffline();
        } catch (e) {
          if ((e as any)?.name !== "AbortError") {
            NotifyError(
              t`lameta was not able to make this file available on this device.`,
              `${e}`
            );
          }
        }
      }}
    >
      <Trans>Make available on this device ({sizeLabel})</Trans>
    </Button>
  );
});

// Shown instead of the media/text/pdf preview when the file's content has not
// been fetched from the cloud. See file.isCloudFileNotPresent.
export const CloudFilePanel: React.FunctionComponent<{ file: File }> =
  observer((props) => {
    const { file } = props;
    const sizeLabel = filesize(file.getSizeInBytes(), { round: 0 });

    return (
      <div
        css={css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 24px;
          color: ${lameta_dark_blue};
        `}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
          `}
        >
          <CloudOutlinedIcon
            css={css`
              color: ${lameta_dark_blue};
            `}
          />
          <span>{file.getFilenameToShowInList()}</span>
          <span>({sizeLabel})</span>
        </div>
        <p
          css={css`
            margin: 0;
          `}
        >
          <Trans>
            This file is online-only (OneDrive). lameta has not fetched its
            content to this computer.
          </Trans>
        </p>
        <p
          css={css`
            margin: 0;
          `}
        >
          <Trans>This may take a long time on a slow connection.</Trans>
        </p>
        <CloudFileFetchControl file={file} />
      </div>
    );
  });
