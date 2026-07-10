import { css, keyframes } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { observer } from "mobx-react";
import { t, Trans, Plural } from "@lingui/macro";
import { File } from "../model/file/File";
import { NotifyError } from "./Notify";
import {
  getCloudFileProvider,
  getCloudProviderNameForPath
} from "../other/cloudFileStatus";
import {
  revealInFolder,
  revealInFolderLabel
} from "../other/crossPlatformUtilities";
import { networkStatus } from "../other/networkStatus";
import {
  CloudDisplayStatus,
  getCloudDisplayStatusOfFile
} from "./CloudStatusIcon";

// Palette from the "OneDrive Status" design (claude.ai/design):
const cardGreen = "#6a9a3a";
const titleColor = "#1a1d1a";
const bodyColor = "#5a615a";
const dividerColor = "#ececec";
const checkboxBorder = "#b8bdb6";

function useMinutesSinceHydrationRequest(file: File): number {
  const [minutes, setMinutes] = React.useState(0);

  React.useEffect(() => {
    if (file.cloudStatus !== "hydrating" || file.hydratingSinceMs === undefined) {
      setMinutes(0);
      return;
    }
    const start = file.hydratingSinceMs;
    const update = () => setMinutes(Math.floor((Date.now() - start) / 60000));
    update();
    const interval = window.setInterval(update, 30000);
    return () => window.clearInterval(interval);
  }, [file.cloudStatus, file.hydratingSinceMs]);

  return minutes;
}

function getStatusLabel(status: CloudDisplayStatus): string {
  switch (status) {
    case "hydrating":
      return t`Waiting`;
    case "cloudOnlyOffline":
      return t`In cloud only, and this computer appears to be offline.`;
    default:
      return t`In cloud only, lameta cannot read it yet.`;
  }
}

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Stroke-style icons matching the design's outlined cloud, in the card green.
const PanelStatusIcon: React.FunctionComponent<{
  status: CloudDisplayStatus;
}> = ({ status }) => {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    css: css`
      flex-shrink: 0;
      color: ${cardGreen};
    `
  };
  const cloudPath = (
    <path
      d="M18.5 15.5a3.5 3.5 0 0 0-.6-6.95A5 5 0 0 0 8.1 9.2 3.75 3.75 0 0 0 8.5 16.7h10a1.2 1.2 0 0 0 0-1.2Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  );
  switch (status) {
    case "hydrating":
      return (
        <svg
          {...common}
          css={css`
            ${common.css};
            animation: ${spin} 2.5s linear infinite;
          `}
        >
          <polyline
            points="23 4 23 10 17 10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="1 20 1 14 7 14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "cloudOnlyOffline":
      return (
        <svg {...common}>
          {cloudPath}
          <path
            d="M4.5 3.5 19.5 20.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return <svg {...common}>{cloudPath}</svg>;
  }
};

// The cloud status card ("OneDrive Status", "Dropbox Status", ...): title
// row, explanation, divider, and the
// request checkbox. Shared by every tab that would need to read the file's
// content (Audio/Video/Image/Text/PDF previews). Renders nothing once the
// file is on this computer, ready to read.
export const CloudFileFetchControl: React.FunctionComponent<{
  file: File;
}> = observer((props) => {
  const { file } = props;
  const minutesSinceRequest = useMinutesSinceHydrationRequest(file);

  if (!getCloudFileProvider().capabilities.canPin) {
    return null;
  }
  if (!file.isCloudFileNotPresent) {
    return null;
  }

  const hydrating = file.cloudStatus === "hydrating";
  const displayStatus = getCloudDisplayStatusOfFile(file) ?? "cloudOnly";
  // "OneDrive", "Dropbox", ... whichever sync engine owns this folder.
  const providerName =
    getCloudProviderNameForPath(file.getActualFilePath()) ?? t`Cloud`;

  return (
    <div
      css={css`
        width: 640px;
        max-width: 100%;
        box-sizing: border-box;
        background: #ffffff;
        border: 1.5px solid ${cardGreen};
        border-radius: 14px;
        padding: 22px 26px;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04),
          0 6px 18px rgba(16, 24, 40, 0.06);
      `}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: 10px;
        `}
      >
        <PanelStatusIcon status={displayStatus} />
        <h2
          css={css`
            margin: 0;
            font-size: 17px;
            font-weight: 700;
            letter-spacing: -0.01em;
            color: ${titleColor};
          `}
        >
          <Trans>{providerName} Status</Trans>
        </h2>
      </div>

      <p
        css={css`
          margin: 11px 0 0;
          font-size: 15px;
          line-height: 1.5;
          color: ${bodyColor};
        `}
      >
        {getStatusLabel(displayStatus)}
      </p>

      <div
        css={css`
          height: 1px;
          background: ${dividerColor};
          margin: 18px 0;
        `}
      />

      <label
        css={css`
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
        `}
      >
        <input
          type="checkbox"
          checked={hydrating}
          onChange={(e) => {
            if (e.target.checked) {
              file.makeAvailableOffline().catch((err) => {
                NotifyError(
                  t`lameta was not able to make this file available on this device.`,
                  `${err}`
                );
              });
            } else {
              file.stopWaiting();
            }
          }}
          css={css`
            appearance: none;
            margin: 0;
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            border: 1.5px solid ${checkboxBorder};
            border-radius: 5px;
            background-color: #ffffff;
            background-position: center;
            background-repeat: no-repeat;
            transition: all 0.12s ease;
            cursor: pointer;
            &:checked {
              background-color: ${cardGreen};
              background-image: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 12.5 10 17 19 7' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
            }
          `}
        />
        <span
          css={css`
            font-size: 15px;
            color: ${titleColor};
          `}
        >
          <Trans>
            Tell {providerName} that I want this file on my computer
          </Trans>
        </span>
      </label>

      <div
        css={css`
          height: 1px;
          background: ${dividerColor};
          margin: 18px 0;
        `}
      />

      <div
        css={css`
          display: flex;
          justify-content: flex-end;
        `}
      >
        <button
          type="button"
          onClick={() => revealInFolder(file.getActualFilePath())}
          css={css`
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            font-size: 14px;
            font-weight: 500;
            color: ${titleColor};
            background: #f5f6f4;
            border: 1px solid ${checkboxBorder};
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.12s ease;
            &:hover {
              background: #e9ebe6;
            }
          `}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            css={css`
              flex-shrink: 0;
              color: ${cardGreen};
            `}
          >
            <path
              d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          {revealInFolderLabel()}
        </button>
      </div>

      {hydrating && networkStatus.isOnline && (
        <p
          css={css`
            margin: 11px 0 0;
            font-size: 15px;
            line-height: 1.5;
            color: ${bodyColor};
          `}
        >
          {minutesSinceRequest < 1 ? (
            <Trans>
              You requested this file less than a minute ago. lameta will
              show it when it becomes available.
            </Trans>
          ) : (
            <Plural
              value={minutesSinceRequest}
              one="# minute since you requested this file. lameta will show it when it becomes available."
              other="# minutes since you requested this file. lameta will show it when it becomes available."
            />
          )}
        </p>
      )}
    </div>
  );
});

// Shown instead of the media/text/pdf preview when the file's content has not
// been fetched from the cloud. See file.isCloudFileNotPresent.
export const CloudFilePanel: React.FunctionComponent<{ file: File }> =
  observer((props) => {
    return (
      <div
        css={css`
          padding: 0 24px 24px 0;
        `}
      >
        <CloudFileFetchControl file={props.file} />
      </div>
    );
  });
