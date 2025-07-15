import { css } from "@emotion/react";
import { t, Trans } from "@lingui/macro";
/* removed emotion jsx declaration */

import * as React from "react";
import fs from "fs";
import * as Path from "path";
import { File, kLinkExtensionWithFullStop } from "../../model/file/File";
import { Folder } from "../../model/Folder/Folder";
import _ from "lodash";
import { sanitizeForArchive } from "../../other/sanitizeForArchive";
import {
  DialogBottomButtons,
  DialogCancelButton,
  DialogMiddle,
  DialogTitle,
  LametaDialog
} from "../LametaDialog";
import { error_color } from "../../containers/theme";
import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { Project } from "../../model/Project/Project";
const sanitizeFilename = require("sanitize-filename");

let staticShowRenameDialog: (file: File, folder: Folder) => void = () => {};
export { staticShowRenameDialog as ShowRenameDialog };

type FileNameParts = {
  prefix: string;
  core: string;
  suffix: string;
  suffixWithNoLink: string;
};

enum Mode {
  closed = 0,
  unchanged = 1,
  valid = 2,
  invalid = 3
}
export const RenameFileDialog: React.FunctionComponent<{}> = () => {
  const [file, setFile] = useState<File>();
  const [filename, setFilename] = useState<string>("");
  const [folder, setFolder] = useState<Folder>();
  const [fileNameParts, setFileNameParts] = useState<FileNameParts>();
  const [mode, setMode] = useState<Mode>(Mode.closed);
  const [validationMessage, setValidationMessage] = useState("");
  const [originalFilename, setOriginalFileName] = useState("");
  staticShowRenameDialog = (file: File, folder: Folder) => {
    setFile(file);
    setFilename(Path.basename(file.pathInFolderToLinkFileOrLocalCopy));
    setFolder(folder);
    const parts = getFileNameParts(
      Path.basename(file.pathInFolderToLinkFileOrLocalCopy),
      folder.filePrefix
    );

    setFileNameParts(parts);
    setOriginalFileName(file.pathInFolderToLinkFileOrLocalCopy);
    setMode(Mode.valid);
  };
  useEffect(() => {
    if (mode !== Mode.closed) {
      const unchanged = originalFilename == fileNameParts?.core;
      determineValidationProblemsMessage();
      if (unchanged) {
        setMode(Mode.unchanged);
      } else {
        setMode(validationMessage ? Mode.invalid : Mode.valid);
      }
    }
  }, [fileNameParts, mode, validationMessage]);

  const renameAndClose = () => {
    {
      const didRename = folder!.renameChildWithFilenameMinusExtension(
        file!,
        getNewFileName(false)
      );
      if (didRename)
        // doesn't close if we do this right away
        window.setImmediate(() => setMode(Mode.closed));
    }
  };

  function determineValidationProblemsMessage() {
    const pendingNewName = getNewFileName();
    const sanitizedForArchive = sanitizeForArchive(pendingNewName);
    let m = "";

    if (
      sanitizeForArchive(fileNameParts!.prefix + ".txt") !==
      fileNameParts!.prefix + ".txt"
    ) {
      m = t`"${
        fileNameParts!.prefix
        // ughh this is such a bad message.
      }" has one or more characters that are not allowed. To fix this, first fix the name of this folder.`;
    } else if (pendingNewName !== sanitizedForArchive) {
      m = t`Please remove characters that not allowed by the Archive Settings.`;
    } else if (pendingNewName !== sanitizeFilename(pendingNewName)) {
      m = t`Some operating systems would not allow that name.`;
    } else if (
      pendingNewName.indexOf("/") > -1 ||
      pendingNewName.indexOf("\\") > -1
    ) {
      m = t`Sorry, no slashes are allowed`;
    } else if (mode != Mode.unchanged && fs.existsSync(getNewPath())) {
      m = t`A file with the same name already exists at that location.`;
    }
    setValidationMessage(m);
  }

  function getNewFileName(includeExtension: boolean = true): string {
    return (
      _.trimEnd(fileNameParts!.prefix + fileNameParts!.core, "_") +
      (includeExtension ? fileNameParts!.suffix : "")
    );
  }
  function getNewPath(): string {
    return Path.join(
      Path.dirname(file!.pathInFolderToLinkFileOrLocalCopy),

      getNewFileName()
    );
  }

  if (mode === Mode.closed) {
    return null;
  }

  return (
    <LametaDialog
      open={(mode as unknown as any) !== Mode.closed}
      requestClose={() => setMode(Mode.closed)}
      // css={css`
      //   z-index: 10000;
      //   .dialogContent {
      //     //margin-left: 20px;
      //     width: calc(1em * 30);
      //     height: 200px;

      //     h1 {
      //       height: 2em;
      //     }
      //     .validationMessage {
      //       color: ${error_color};
      //     }
      //     .row {
      //       margin-top: 1em;
      //       display: flex;
      //     }
      //     input {
      //       width: 1em * 27;
      //     }
      //   }
      // `}
    >
      <DialogTitle title={t`Rename File`} />
      <DialogMiddle>
        <div
          css={css`
            font-weight: bold;
            margin-bottom: 1em;
          `}
        >
          <Trans>Change Name To:</Trans>
        </div>
        <div className="row">
          <span className="affix">{fileNameParts?.prefix}</span>
          <input
            css={css`
              margin: unset; //app.global.scss interference
              margin-left: 1px; //else the highlighting can cover the end of the prefix
              width: 1em * 27;
            `}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && mode === Mode.valid) {
                renameAndClose();
              }
            }}
            value={fileNameParts?.core}
            onChange={(e) =>
              setFileNameParts({
                ...fileNameParts!,
                core: e.target.value
              })
            }
          />
          <span className="affix">{fileNameParts?.suffixWithNoLink}</span>
        </div>
        <div
          css={css`
            color: ${error_color};
            min-width: 400px;
            min-height: 2em;
            margin-top: 1em;
          `}
        >
          {validationMessage}
        </div>
        {file?.isLinkFile() && (
          <p>
            <Trans>
              Note that this is a link to a file in your Media Files directory.
              Here, you are renaming this link, not the original file that it
              points to. If you later create an export that includes this file,
              the export will use this name.
            </Trans>
          </p>
        )}
      </DialogMiddle>
      <DialogBottomButtons>
        <Button
          variant="contained"
          color="secondary"
          disabled={mode != Mode.valid}
          onClick={() => renameAndClose()}
          // css={css`
          //   /* hack to suggest that if you hit enter, it will choose this. Will do until we switch to something proper like material */
          //   border: solid 3px darkgray;
          //   border-radius: 4px;
          // `}
        >
          <Trans>Rename</Trans>
        </Button>
        <DialogCancelButton onClick={() => setMode(Mode.closed)} />
      </DialogBottomButtons>
    </LametaDialog>
  );
};
function stringMatchOrEmptyString(s: string, regexp: RegExp): string {
  console.assert(s);
  console.assert(regexp);
  const m = s.match(regexp);
  return m && m.length > 0 ? m[0] : "";
}

// Keeping with how Windows Saymore Classic worked, if the prefix is missing,
// we assert it here, so any renamed file will get the prefix
function getUneditablePrefix(filename: string, folderID: string): string {
  // if instead, we wanted to only recognize the prefix pattern if it is there, we'd do this:
  //return filename.startsWith(folderID + "_") ? folderID + "_" : "";
  //return folderID + "_"; see https://www.notion.so/lameta/When-renaming-make-it-possible-to-remove-the-leading-underscore-e9843f3bfc3a43a0bbe0a532a6e8e0db
  return folderID;
}

function getUneditableSuffix(
  fileName: string,
  stripLinkSuffix: boolean
): string {
  let p = fileName;
  const isLink = fileName.endsWith(kLinkExtensionWithFullStop);
  if (isLink) {
    p = p.replace(kLinkExtensionWithFullStop, "");
  }

  const matchExtension = /\.([0-9a-z]+)(?:[\?#]|$)/i;
  // if it's a link file, this will give us ".link"
  const sfx = stringMatchOrEmptyString(p, matchExtension);

  return stripLinkSuffix
    ? sfx
    : isLink
    ? sfx + kLinkExtensionWithFullStop
    : sfx;
}

export function getFileNameParts(fileName: string, folderId: string) {
  return {
    prefix: getUneditablePrefix(fileName, folderId),
    core: getCore(fileName, folderId),
    suffix: getUneditableSuffix(fileName, false),
    suffixWithNoLink: getUneditableSuffix(fileName, true)
  };
}
function getCore(fileName: string, folderId: string): string {
  const prefix = getUneditablePrefix(fileName, folderId);
  const startAt = fileName.startsWith(prefix) ? prefix.length : 0;
  const suffixLength = getUneditableSuffix(fileName, false).length;
  // about underscore being editable, see https://www.notion.so/lameta/When-renaming-make-it-possible-to-remove-the-leading-underscore-e9843f3bfc3a43a0bbe0a532a6e8e0db
  const possibleLeadingUnderscore = "_";
  const r =
    possibleLeadingUnderscore +
    fileName.substr(startAt, fileName.length - (startAt + suffixLength));

  return r.replace(/__/g, "_");
}
