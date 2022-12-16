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
import { analyticsEvent } from "../../other/analytics";
const { app } = require("@electron/remote");

export let showSpreadsheetImportDialog = (folderType: IFolderType) => {};
export const SpreadsheetImportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = (props) => {
  const { currentlyOpen, showDialog, closeDialog } = useSetupLametaDialog();
  const [folderType, setFolderType] = useState<IFolderType>("person");
  const [mappingName, setMappingName] = useUserSetting(
    "spreadsheetImport.mappingName",
    "LingMetaXMap"
  );

  showSpreadsheetImportDialog = (folderType: IFolderType) => {
    setFolderType(folderType);
    setMode(Mode.normal);
    showDialog();
  };
  const [pathsString, setPaths] = useUserSetting("importPaths", "{}");

  const paths = pathsString ? JSON.parse(pathsString) : [];
  const path = paths[folderType];

  const [matrix, setMatrix] = useState<MappedMatrix | undefined>(undefined);
  const chosenMapping = availableSpreadsheetMappings[
    mappingName
  ] as IImportMapping;
  enum Mode {
    normal = 0,
    startImporting = 1,
    importing = 2,
  }
  const [mode, setMode] = useState<Mode>(Mode.normal);

  useEffect(() => {
    setMatrix(undefined);
    if (
      currentlyOpen &&
      path &&
      props.projectHolder.project &&
      fs.existsSync(path)
    ) {
      // todo: actually load the mapping they asked for (when we can handle different ones)
      try {
        // this timeout is to let everything render before we load do the reading of the file and filling the grid
        window.setTimeout(() => {
          const x = makeMappedMatrixFromSpreadsheet(
            path,
            chosenMapping,
            props.projectHolder.project!,
            folderType
          );
          setMatrix(x);
        }, 0 /* no actual wait needed*/);
      } catch (err) {
        NotifyException(err);
      }
    }
  }, [path, mappingName, currentlyOpen]);

  React.useEffect(() => {
    switch (mode) {
      case Mode.startImporting:
        setMode(Mode.importing);
        window.setTimeout(() => {
          analyticsEvent("Import", `Import ${folderType} Spreadsheet`, path);
          addImportMatrixToProject(
            props.projectHolder.project!,
            matrix!,
            folderType
          );

          setMode(Mode.normal);
          closeDialog();
        }, 100);
        break;
      case Mode.importing:
      case Mode.startImporting:
        document.body.style.cursor = "wait";
        break;
      default:
        document.body.style.cursor = "default";
    }
  }, [mode]);

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
      requestClose={() => {
        if (mode === Mode.importing) {
          return;
        }
        closeDialog();
      }}
      css={css`
        width: calc(100% - 100px);
        // Note that the Grid needs an absolute size, which is kept in kpixelsThatAreNotAvailableToGridHeight
        // So if you change this here, you may need to tweak that
        height: calc(100% - 100px);
      `}
    >
      <DialogTitle title={title}></DialogTitle>
      <DialogMiddle>
        <div
          css={css`
            display: flex;
            gap: 8px;
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
              variant={path ? "text" : "contained"}
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
                    paths[folderType] = result.filePaths[0];
                    setPaths(JSON.stringify(paths));
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
          </div>
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
          data-test-id="import"
          disabled={!path || !chosenCount || mode === Mode.importing}
          onClick={() => {
            setMode(Mode.startImporting);
          }}
          css={css`
            min-width: 50px;
          `}
        >
          {(mode === Mode.importing || mode === Mode.startImporting) && (
            <Trans>Importing...</Trans>
          )}
          {mode === Mode.normal && folderType === "session" && (
            <Trans>{`Import ${chosenCount} Sessions`}</Trans>
          )}
          {mode === Mode.normal && folderType === "person" && (
            <Trans>{`Import ${chosenCount} People`}</Trans>
          )}
        </Button>
        <DialogCancelButton
          disabled={mode === Mode.importing}
          onClick={() => {
            closeDialog();
          }}
        />
      </DialogBottomButtons>
    </LametaDialog>
  );
};
