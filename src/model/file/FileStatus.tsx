import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { File } from "./File";
import fs from "fs";
import * as Path from "path";
import { getMediaFolderOrEmptyForThisProjectAndMachine } from "../Project/MediaFolderAccess";
import { Button } from "@material-ui/core"; // Update this import

import { t, Trans } from "@lingui/macro";
import { error_color, lameta_orange } from "../../containers/theme";
import { sanitizeForArchive } from "../../other/sanitizeForArchive";
import { observer } from "mobx-react";
import { Folder } from "../Folder/Folder";

export function getStatusOfFile(f: File): {
  missing: boolean;
  status:
    | "normalFile"
    | "fileNamingProblem"
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
      info: t({
        id: "Could not find this file. Restart lameta to bring it up to date with what is actually on your hard drive. {path}",
        values: { path: f.getActualFilePath() }
      })
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
    } else if (hasFileNamingProblem(f.getActualFilePath())) {
      const message = t`This file does not comply with the file naming rules of the current archive.`;

      return {
        missing: false,
        status: "fileNamingProblem",
        info: message
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
      return `assets/link.png`;
    case "missing":
      return "assets/missingFile.png";
    case "noMediaFolderConnection":
      return "assets/noMediaFolder.png";
    case "fileNamingProblem":
      return "assets/error.png";
    default:
      return "";
  }
}

export const FileStatusBlock: React.FunctionComponent<{
  file: File;
  fileName: string;
  folder: Folder;
}> = observer((props) => {
  const fileStatus = getStatusOfFile(props.file);
  const color =
    fileStatus.status === "noMediaFolderConnection"
      ? lameta_orange
      : error_color;

  return fileStatus.status === "normalFile" ||
    fileStatus.status === "goodLink" ? null : (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        margin: 10px;
        margin-left: 0;
        padding: 20px;
        border-radius: 4px;
        background-color: ${color};
        color: white;
      `}
    >
      <p
        css={css`
          margin-block-start: 0;
          margin-block-end: 0;
          font-size: 16px;
        `}
      >
        {fileStatus.info}
      </p>
      {fileStatus.status === "fileNamingProblem" &&
        (props.file.type === "Person" || props.file.type === "Session") && (
          <div
            css={css`
              align-self: flex-end;
              margin-top: 10px;
            `}
          >
            <Button
              onClick={() => {
                props.folder.nameMightHaveChanged();
              }}
              variant="outlined"
              size="small"
              style={{
                backgroundColor: error_color,
                color: "white",
                border: "1px solid white"
              }}
            >
              <Trans comment="label on a button that shows when a Session or Person file name has characters that are not allowed">
                Attempt Fix
              </Trans>
            </Button>
          </div>
        )}
    </div>
  );
});

function hasFileNamingProblem(path: string): boolean {
  return Path.basename(path) !== sanitizeForArchive(Path.basename(path));
}
