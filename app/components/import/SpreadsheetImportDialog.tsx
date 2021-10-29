// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React, { useEffect, useMemo, useState } from "react";
import {
  DialogBottomButtons,
  DialogCancelButton,
  DialogMiddle,
  DialogTitle,
  LametaDialog,
  useSetupLametaDialog,
} from "../LametaDialog";
import { i18n } from "../../other/localization";
import { t, Trans } from "@lingui/macro";
import { useUserSetting } from "../../other/UserSettings";
import { MatrixGrid } from "./MatrixGrid";
import {
  IImportMapping,
  makeMappedMatrixFromSpreadsheet,
} from "./SpreadsheetToMatrix";
import { ProjectHolder } from "../../model/Project/Project";
import { MappedMatrix } from "./MappedMatrix";
import {
  addImportMatrixToProject,
  availableSpreadsheetMappings,
} from "./MatrixImporter";
import * as Path from "path";
import * as fs from "fs";
import { Button } from "@material-ui/core";
const ReactMarkdown = require("react-markdown");
import { ipcRenderer, OpenDialogOptions } from "electron";
import { NotifyException } from "../Notify";
import { IFolderType } from "../../model/Folder/Folder";
const { app } = require("electron").remote;

export let showSpreadsheetImportDialog = (folderType: IFolderType) => {};
export const SpreadsheetImportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = (props) => {
  const { currentlyOpen, showDialog, closeDialog } = useSetupLametaDialog();
  const [currentlyOpenX, setCurrentlyOpenTestingOnly] = useState(true);
  const [folderType, setFolderType] = useState<IFolderType>("person");
  const [mappingName, setMappingName] = useUserSetting(
    "spreadsheetImport.mappingName",
    "LingMetaXMap"
  );

  showSpreadsheetImportDialog = (folderType: IFolderType) => {
    setFolderType(folderType);
    showDialog();
    setCurrentlyOpenTestingOnly(true);
  };
  const [pathsString, setPaths] = useUserSetting("importPaths", "{}");

  const paths = JSON.parse(pathsString);
  const path = paths[folderType];

  const [matrix, setMatrix] = useState<MappedMatrix | undefined>(undefined);
  const chosenMapping = availableSpreadsheetMappings[
    mappingName
  ] as IImportMapping;

  useEffect(() => {
    if (currentlyOpen && path && props.projectHolder.project) {
      // todo: actually load the mapping they asked for (when we can handle different ones)
      try {
        const x = makeMappedMatrixFromSpreadsheet(
          path,
          chosenMapping,
          props.projectHolder.project,
          folderType
        );
        setMatrix(x);
      } catch (err) {
        NotifyException(err);
      }
    }
  }, [path, mappingName, currentlyOpen]);

  const [chosenCount, setChosenCount] = useState(0);
  function countChosenRows() {
    if (matrix) setChosenCount(matrix?.getCountOfChosenRows());
  }

  useEffect(() => countChosenRows(), [
    props.projectHolder.project,
    path,
    matrix,
  ]);

  const title =
    folderType === "session"
      ? t`Import Spreadsheet of Sessions`
      : t`Import Spreadsheet of People`;
  return (
    <LametaDialog
      open={currentlyOpen}
      onClose={closeDialog}
      css={css`
        width: calc(100% - 100px);
        height: calc(100% - 100px);
      `}
    >
      <DialogTitle title={title}></DialogTitle>
      <DialogMiddle>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            width: fit-content;
            margin-bottom: 20px;
          `}
        >
          <div
            css={css`
              display: flex;
              align-items: center;
            `}
          >
            <label
              css={css`
                margin-right: 10px;
              `}
            >
              <Trans>File to Import:</Trans>
            </label>

            <div
              css={css`
                margin-right: 10px;
              `}
            >
              {path}
            </div>
            <Button
              color="secondary"
              onClick={() => {
                let dir = app.getPath("documents");
                // prefer to open in the same directory as the current one, if it's there
                if (path && fs.existsSync(Path.dirname(path))) {
                  dir = Path.dirname(path);
                }
                const options: OpenDialogOptions = {
                  properties: ["openFile"],
                  filters: [
                    {
                      name: "Spreadsheet Files",
                      extensions: ["csv", "xlsx", "xls", "ods"],
                    },
                  ],
                  defaultPath: dir,
                };

                ipcRenderer.invoke("showOpenDialog", options).then((result) => {
                  if (
                    result &&
                    result.filePaths &&
                    result.filePaths.length > 0
                  ) {
                    const newPaths = paths;
                    paths[folderType] = result.filePaths[0];
                    setPaths(JSON.stringify(newPaths));
                  }
                });
              }}
              css={css`
                min-width: 50px;
                span {
                  font-weight: bold;
                }
              `}
            >
              <Trans>Choose File</Trans>
            </Button>
          </div>{" "}
          <div
            css={css`
              display: flex;
              align-items: top;
            `}
          >
            <label
              css={css`
                margin-right: 10px;
              `}
            >
              <Trans>Choose Spreadsheet Mapping:</Trans>
            </label>
            <div
              css={css`
                display: flex;
                flex-direction: column;
                margin-left: 10px;
              `}
            >
              <select
                css={css`
                  border-radius: 3px; // without this it is cutting off the top border
                `}
                name={"Spreadsheet Mapping"}
                value={mappingName}
                onChange={(event) => {
                  setMappingName(event.target.value);
                }}
              >
                {["LingMetaX"].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <ReactMarkdown
                // note: the gfm plugin actually did worse that standard... it turned 2nd level bullets into <pre>
                css={css`
                  * {
                    max-width: 100%;
                  }
                `}
                children={chosenMapping?.mapping_description}
              />
            </div>
          </div>
        </div>
        {matrix && (
          <MatrixGrid
            matrix={matrix}
            chosenRowsCountChanged={countChosenRows}
          />
        )}
      </DialogMiddle>
      <DialogBottomButtons>
        <Button
          variant="contained"
          color="secondary"
          disabled={!path || !chosenCount}
          onClick={() => {
            addImportMatrixToProject(
              props.projectHolder.project!,
              matrix!,
              folderType
            );
            closeDialog();
            setCurrentlyOpenTestingOnly(false);
          }}
          css={css`
            min-width: 50px;
          `}
        >
          {folderType === "session" && (
            <Trans>{`Import ${chosenCount} Sessions`}</Trans>
          )}
          {folderType === "person" && (
            <Trans>{`Import ${chosenCount} People`}</Trans>
          )}
        </Button>
        <DialogCancelButton
          onClick={() => {
            closeDialog();
            setCurrentlyOpenTestingOnly(false);
          }}
        />
      </DialogBottomButtons>
    </LametaDialog>
  );
};