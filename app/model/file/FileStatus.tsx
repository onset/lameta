// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import { File } from "./File";
import * as fs from "fs";
import * as Path from "path";
import { getMediaFolderOrEmptyForThisProjectAndMachine } from "../Project/MediaFolderAccess";
import { locate } from "../../other/crossPlatformUtilities";
import { error_color, saymore_orange } from "../../components/colors";

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
      info: f.copyProgress,
    };
  }
  if (f.getActualFileExists()) {
    if (f.isLinkFile())
      return {
        missing: false,
        status: "goodLink",
        info: `Linked to ${f.getActualFilePath()}`,
      };
    else
      return {
        missing: false,
        status: "normalFile",
        info: `${f.getActualFilePath()}`,
      };
  }
  const mediaFolder = getMediaFolderOrEmptyForThisProjectAndMachine();

  if (!mediaFolder)
    return {
      missing: true,
      status: "noMediaFolderConnection",
      info: `This is a link, but lameta does not know where to find the Media Folder for this project. See File:Media Folder Settings.`,
    };
  if (!fs.existsSync(mediaFolder))
    return {
      missing: true,
      status: "noMediaFolderConnection",
      info: `lameta cannot find the Media Folder '${mediaFolder}'. See the File:Media Folder Settings.`,
    };

  //review: what is this scenario??
  if (!fs.existsSync(f.pathInFolderToLinkFileOrLocalCopy))
    return {
      missing: true,
      status: "missing",
      info: `lameta expected to find a .link file at '${f.pathInFolderToLinkFileOrLocalCopy}'`,
    };

  // we have the link file. We have the media folder. But we cannot find the file itself.
  const subpath = fs.readFileSync(f.pathInFolderToLinkFileOrLocalCopy, "utf-8");
  return {
    missing: true,
    status: "missing",
    info: `The file is missing from its expected location in the Media Folder. The Media Folder is set to ${mediaFolder} and this file is supposed to be at ${Path.join(
      getMediaFolderOrEmptyForThisProjectAndMachine(),
      subpath
    )}.`,
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
      ? saymore_orange
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
