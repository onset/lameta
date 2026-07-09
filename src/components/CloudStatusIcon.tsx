import { css, keyframes } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { observer } from "mobx-react";
import { t } from "@lingui/macro";
import { File } from "../model/file/File";
import {
  CloudFileStatus,
  isUnderCloudSyncRoot
} from "../other/cloudFileStatus";
import { networkStatus } from "../other/networkStatus";

// The sync-state a file should display, mirroring the icons OneDrive shows in
// File Explorer. Unlike CloudFileStatus, this folds in connectivity (a
// cloud-only file cannot arrive while offline) and whether the file is under
// a sync root at all (a plain local file outside OneDrive shows no icon).
export type CloudDisplayStatus =
  | "cloudOnly" // blue cloud: online-only
  | "cloudOnlyOffline" // grey crossed-out cloud: online-only and no network
  | "hydrating" // blue sync arrows: downloading
  | "local" // green outlined check: on this device, could be dehydrated
  | "localPinned"; // solid green check: always keep on this device

export function getCloudDisplayStatus(
  cloudStatus: CloudFileStatus,
  isOnline: boolean,
  isUnderSyncRoot: boolean
): CloudDisplayStatus | undefined {
  switch (cloudStatus) {
    case "cloudOnly":
      return isOnline ? "cloudOnly" : "cloudOnlyOffline";
    case "hydrating":
      // The download cannot progress without a network; show why.
      return isOnline ? "hydrating" : "cloudOnlyOffline";
    case "local":
    case "localPinned":
      // Attributes cannot distinguish a hydrated OneDrive file from a plain
      // local file, so only claim "available on this device" under a sync root.
      return isUnderSyncRoot ? cloudStatus : undefined;
    default:
      return undefined;
  }
}

export function getCloudDisplayStatusOfFile(
  file: File
): CloudDisplayStatus | undefined {
  return getCloudDisplayStatus(
    file.cloudStatus,
    networkStatus.isOnline,
    isUnderCloudSyncRoot(file.getActualFilePath())
  );
}

function getTooltip(status: CloudDisplayStatus): string {
  switch (status) {
    case "cloudOnly":
      return t`Online-only (OneDrive). The content of this file is not on this computer.`;
    case "cloudOnlyOffline":
      return t`Online-only (OneDrive), and this computer appears to be offline, so the file cannot be downloaded right now.`;
    case "hydrating":
      return t`OneDrive is downloading this file to this computer.`;
    case "local":
      return t`Available on this device. OneDrive may free up this space if the file goes unused.`;
    case "localPinned":
      return t`Always available on this device.`;
  }
}

const oneDriveBlue = "#0078d4";
const availableGreen = "#0f7b0f";
const offlineGrey = "#605e5c";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Renders a given display status as an icon closely matching the ones
// File Explorer shows for OneDrive files, so users instantly recognize them.
// `color` overrides the per-status OneDrive colors (e.g. the cloud panel
// draws the icon in the surrounding text color per the design).
export const CloudStatusGlyph: React.FunctionComponent<{
  status: CloudDisplayStatus;
  size?: number;
  color?: string;
}> = ({ status, size = 16, color }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    role: "img" as const
  };
  const title = <title>{getTooltip(status)}</title>;
  switch (status) {
    case "cloudOnly":
      return (
        <svg {...common}>
          {title}
          <path
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h.71C7.37 7.69 9.48 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3s-1.34 3-3 3z"
            fill={color ?? oneDriveBlue}
          />
        </svg>
      );
    case "cloudOnlyOffline":
      return (
        <svg {...common}>
          {title}
          <path
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z"
            fill={color ?? offlineGrey}
          />
        </svg>
      );
    case "hydrating":
      return (
        <svg
          {...common}
          css={css`
            /* This icon's arrows point counterclockwise, so spin in reverse
               to match (the panel's clockwise icon spins forward). */
            animation: ${spin} 2.5s linear infinite reverse;
          `}
        >
          {title}
          <path
            d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
            fill={color ?? oneDriveBlue}
          />
        </svg>
      );
    case "local":
      return (
        <svg {...common}>
          {title}
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"
            fill={color ?? availableGreen}
          />
        </svg>
      );
    case "localPinned":
      return (
        <svg {...common}>
          {title}
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            fill={color ?? availableGreen}
          />
        </svg>
      );
  }
};

// The shared entry point: shows the OneDrive-style status icon for a file,
// or nothing when the file has no cloud story to tell. Used by the file
// list's status column and by the panel that lets the user request a file.
export const CloudStatusIcon: React.FunctionComponent<{
  file: File;
  size?: number;
}> = observer((props) => {
  const status = getCloudDisplayStatusOfFile(props.file);
  if (!status) {
    return null;
  }
  return <CloudStatusGlyph status={status} size={props.size} />;
});
