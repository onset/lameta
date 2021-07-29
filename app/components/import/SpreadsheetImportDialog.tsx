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
import { makeMappedMatrixFromExcel } from "./SpreadsheetToMatrix";
import { ProjectHolder } from "../../model/Project/Project";
import { MappedMatrix } from "./MappedMatrix";
import {
  addSessionMatrixToProject,
  availableSpreadsheetMappings,
} from "./MatrixImporter";
import * as Path from "path";
import * as fs from "fs";
import { Button } from "@material-ui/core";
import { ipcRenderer, OpenDialogOptions } from "electron";
const { app } = require("electron").remote;

export let showSpreadsheetImportDialog = () => {};
export const SpreadsheetImportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = (props) => {
  const { currentlyOpen, showDialog, closeDialog } = useSetupLametaDialog();

  const [mappingName, setMappingName] = useUserSetting(
    "spreadsheetImport.sessions.mappingName", // todo: people
    "LingMetaXMap"
  );

  showSpreadsheetImportDialog = showDialog;
  const [path, setPath] = useUserSetting("importPath", "");
  const [matrix, setMatrix] = useState<MappedMatrix | undefined>(undefined);
  useEffect(() => {
    if (currentlyOpen && path) {
      // todo: actually load the mapping they asked for (when we can handle different ones)
      setMatrix(
        makeMappedMatrixFromExcel(
          path,
          availableSpreadsheetMappings[mappingName]
        )
      );
    }
  }, [path, mappingName, currentlyOpen]);

  return (
    <LametaDialog
      open={currentlyOpen}
      onClose={closeDialog}
      css={css`
        width: calc(100% - 100px);
        height: calc(100% - 100px);
      `}
    >
      <DialogTitle title={i18n._(t`Import Spreadsheet`)}></DialogTitle>
      <DialogMiddle>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            width: fit-content;
          `}
        >
          <div>{path}</div>
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
                if (result && result.filePaths && result.filePaths.length > 0) {
                  setPath(result.filePaths[0]);
                }
              });
            }}
            css={css`
              min-width: 50px;
            `}
          >
            <Trans>Choose File</Trans>
          </Button>

          <label>
            <Trans>Choose Spreadsheet Mapping:</Trans>
          </label>
          <select
            css={css`
              margin-left: 10px;
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
        </div>
        {matrix && <MatrixGrid matrix={matrix} />}
      </DialogMiddle>
      <DialogBottomButtons>
        <Button
          variant="contained"
          color="secondary"
          disabled={!path}
          onClick={() => {
            addSessionMatrixToProject(props.projectHolder.project!, matrix!);
            closeDialog();
          }}
          css={css`
            min-width: 50px;
          `}
        >
          <Trans>Import</Trans>
        </Button>
        <DialogCancelButton onClick={() => closeDialog()} />
      </DialogBottomButtons>
    </LametaDialog>
  );
};
