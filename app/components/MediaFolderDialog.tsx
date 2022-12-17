// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
// tslint:disable-next-line: no-duplicate-imports
import { useState } from "react";
import { i18n } from "@lingui/core";
import { t, Trans } from "@lingui/macro";
import { ipcRenderer, OpenDialogOptions } from "electron";
import * as remote from "@electron/remote";
import {
  getMediaFolderOrEmptyForThisProjectAndMachine,
  setMediaFolderOrEmptyForThisProjectAndMachine
} from "../model/Project/MediaFolderAccess";
import {
  DialogBottomButtons,
  DialogButton,
  DialogCancelButton,
  DialogMiddle,
  DialogTitle,
  LametaDialog
} from "./LametaDialog";

let staticShowMediaFolderDialog: () => void = () => {};
export { staticShowMediaFolderDialog as ShowMediaFolderDialog };

export const MediaFolderDialog: React.FunctionComponent<{}> = (props) => {
  const [path, setPath] = useState<string>(
    getMediaFolderOrEmptyForThisProjectAndMachine() || "(not set)"
  );
  const [open, setOpen] = useState(false);
  staticShowMediaFolderDialog = () => {
    setPath(getMediaFolderOrEmptyForThisProjectAndMachine() || "(not set)");
    setOpen(true);
  };

  return (
    <LametaDialog requestClose={() => setOpen(false)} open={open}>
      <DialogTitle title={i18n._(`Media Folder Settings`)}></DialogTitle>
      <DialogMiddle>
        <div>
          <p>
            <Trans>
              Normally, when you add a file to a project, session, or person,
              that file is copied into the same folder as you lameta project.
              For some of your files, you might prefer to instead leave the
              files where they are and just "link" to them.
            </Trans>
          </p>
          <p>
            <Trans>
              lameta allows you to specify one "Media Folder". When you add
              files that are somewhere within that folder, lameta will create a
              link instead of making a copy. This folder can be anywhere,
              including the root of an external drive where you keep large video
              recordings.
            </Trans>
          </p>
          <p>
            <Trans>
              This setting is unique to the account you are using on this
              computer. A colleague on another computer will need to set this
              value to the correct location on their computer.
            </Trans>
          </p>
          <h4
            css={css`
              margin-bottom: 0;
            `}
          >
            <Trans>Media Folder</Trans>
          </h4>
        </div>
        <div
          css={css`
            display: flex;
            flex-direction: row;
            justify-content: space-between;
          `}
        >
          <div
            css={css`
              overflow-wrap: anywhere;
            `}
          >
            {path}
          </div>
          <div
            css={css`
              display: flex;
              flex-direction: column;
              margin-left: 20px;
            `}
          >
            <button
              css={css`
                width: fit-content;
                height: fit-content;
                padding-left: 20px;
                padding-right: 20px;
              `}
              onClick={() => {
                const options: OpenDialogOptions = {
                  properties: ["openDirectory"],
                  defaultPath: require("os").homedir()
                };

                ipcRenderer.invoke("showOpenDialog", options).then((result) => {
                  if (
                    result &&
                    result.filePaths &&
                    result.filePaths.length > 0
                  ) {
                    setPath(result.filePaths[0]);
                  }
                });
              }}
            >
              <Trans>Change...</Trans>
            </button>
            <a
              onClick={() => {
                setPath("");
              }}
              css={css`
                margin-left: auto;
              `}
            >
              <Trans>Clear</Trans>
            </a>
          </div>
        </div>
      </DialogMiddle>

      <DialogBottomButtons>
        <DialogButton
          default={true}
          onClick={() => {
            setMediaFolderOrEmptyForThisProjectAndMachine(path);
            setOpen(false);
            remote.getCurrentWindow().reload();
          }}
        >
          <Trans>OK</Trans>
        </DialogButton>
        <DialogCancelButton onClick={() => setOpen(false)} />
      </DialogBottomButtons>
    </LametaDialog>
  );
};
