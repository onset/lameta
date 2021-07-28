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
import * as XLSX from "xlsx";
import { makeMappedMatrixFromWorksheet } from "./SpreadsheetToMatrix";
import { ProjectHolder } from "../../model/Project/Project";
import { MappedMatrix } from "./MappedMatrix";
import { addSessionMatrixToProject } from "./MatrixImporter";
import { Button } from "@material-ui/core";
const lingmetaxSessionMap = require("./LingMetaXMap.json5");

export let showSpreadsheetImportDialog = () => {};
export const SpreadsheetImportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = (props) => {
  const { currentlyOpen, showDialog, closeDialog } = useSetupLametaDialog();
  const [path, setPath] = useState("c:/dev/lameta/sample data/LingMetaX.xlsx");
  const [mapping, setMapping] = useUserSetting(
    "spreadsheetImport.sessions.mappingName", // todo: people
    "LingMetaXMap"
  );

  showSpreadsheetImportDialog = showDialog;

  const matrix = useMemo(() => {
    if (!currentlyOpen) return undefined;
    const workbook = XLSX.readFile(path, {
      cellDates: false,
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    // todo: actually load the mapping they asked for (when we can handle different ones)
    return makeMappedMatrixFromWorksheet(worksheet, lingmetaxSessionMap);
  }, [path, mapping, currentlyOpen]);

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
          `}
        >
          <label>
            <Trans>Choose Spreadsheet Mapping:</Trans>
          </label>
          <select
            css={css`
              margin-left: 10px;
              border-radius: 3px; // without this it is cutting off the top border
            `}
            name={"Spreadsheet Mapping"}
            value={mapping}
            onChange={(event) => {
              setMapping(event.target.value);
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
