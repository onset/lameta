import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { File } from "./File";
import fs from "fs";
import * as Path from "path";
import { getMediaFolderOrEmptyForThisProjectAndMachine } from "../Project/MediaFolderAccess";
import { locate } from "../../other/crossPlatformUtilities";

import { t } from "@lingui/macro";
import { error_color, lameta_orange } from "../../containers/theme";

export function getStatusOfFile(f: File): {
  missing: boolean;
  status:
    | "normalFile"
    | "missing"
    | "goodLink"
    | "copyInProgress"
    | "noMediaFolderConnection";
  info: string;
} {
  if (f.copyInProgress) {
    return {
      missing: false,
      status: "copyInProgress",
      info: f.copyProgress
    };
  }

  if (!f.isLinkFile() && !f.getActualFileExists()) {
    return {
      missing: true,
      status: "normalFile",
      info: `Could not find this file. Restart lameta to bring it up to date with what is actually on your hard drive. ${f.getActualFilePath()}`
    };
  }

  if (f.getActualFileExists()) {
    if (f.isLinkFile()) {
      const info = t({
        id: "Linked to {p}",
        values: { p: f.getActualFilePath() }
      });
      return {
        missing: false,
        status: "goodLink",
        info
      };
    } else
      return {
        missing: false,
        status: "normalFile",
        info: `${f.getActualFilePath()}`
      };
  }

  const mediaFolder = getMediaFolderOrEmptyForThisProjectAndMachine();

  if (!mediaFolder)
    return {
      missing: true,
      status: "noMediaFolderConnection",
      info: t`This is a link, but lameta does not know where to find the Media Folder for this project. See File:Media Folder Settings.`
    };
  if (!fs.existsSync(mediaFolder)) {
    const info = t({
      id: "lameta cannot find the Media Folder {m}. See the File:Media Folder Settings.",
      values: { m: mediaFolder }
    });
    return {
      missing: true,
      status: "noMediaFolderConnection",
      info
    };
  }

  //review: what is this scenario??
  if (!fs.existsSync(f.pathInFolderToLinkFileOrLocalCopy))
    return {
      missing: true,
      status: "missing",
      info: t({
        id: `lameta expected to find a .link file at {e}`,
        values: { e: f.pathInFolderToLinkFileOrLocalCopy }
      })
    };

  // we have the link file. We have the media folder. But we cannot find the file itself.
  const subpath = fs.readFileSync(f.pathInFolderToLinkFileOrLocalCopy, "utf-8");
  const expected = Path.join(
    getMediaFolderOrEmptyForThisProjectAndMachine(),
    subpath
  );
  const info = t({
    id: "The file is missing from its expected location in the Media Folder. The Media Folder is set to {m} and this file is supposed to be at {e}",
    values: { m: mediaFolder, e: expected }
  });
  return {
    missing: true,
    status: "missing",
    info
  };
}

export function getLinkStatusIconPath(f: File): string {
  const { status } = getStatusOfFile(f);
  switch (status) {
    case "goodLink":
      return locate(`assets/link.png`);
    case "missing":
      return locate("assets/missingFile.png");
    case "noMediaFolderConnection":
      return locate("assets/noMediaFolder.png");
    default:
      return "";
  }
}

export const FileStatusBlock: React.FunctionComponent<{ file: File }> = (
  props
) => {
  const fileStatus = getStatusOfFile(props.file);

  const color =
    fileStatus.status === "noMediaFolderConnection"
      ? lameta_orange
      : error_color;

  return fileStatus.missing ? (
    <div
      css={css`
        display: flex;
        margin: 10px;
        margin-left: 0;
        padding: 20px;
        border-radius: 4px;
        background-color: ${color};
        color: white;
      `}
    >
      {/* <img
        css={css`
          height: 20px;
          width: auto;
          margin-right: 10px;
        `}
        src={getLinkStatusIconPath(props.file)}
      /> */}
      <p
        css={css`
          margin-block-start: 0;
          margin-block-end: 0;
          font-size: 16px;
        `}
      >
        {fileStatus.info}
      </p>
    </div>
  ) : null;
};
