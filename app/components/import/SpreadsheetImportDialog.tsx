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
import { SpreadsheetTable } from "./SpreadsheetTable";
import { SpreadsheetGrid } from "./SpreadsheetGrid";
import { loadAndMapSpreadsheet } from "./SpreadsheetImport";
import { Project, ProjectHolder } from "../../model/Project/Project";
import * as XLSX from "xlsx";

export let showSpreadsheetImportDialog = () => {};
export const SpreadsheetImportDialog: React.FunctionComponent<{
  projectHolder: ProjectHolder;
}> = (props) => {
  const { currentlyOpen, showDialog, closeDialog } = useSetupLametaDialog();
  const [mapping, setMapping] = useUserSetting(
    "spreadsheetImport.mapping",
    "LingMetaXMap"
  );
  showSpreadsheetImportDialog = showDialog;
  const [path] = useState("c:/dev/lameta/sample data/LingMetaX.xlsx");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    setRows(loadAndMapSpreadsheet(props.projectHolder.project!, path));
  }, [path, props.projectHolder.project]);

  const worksheet = useMemo(() => {
    const workbook = XLSX.readFile("c:/dev/lameta/sample data/LingMetaX.xlsx", {
      cellDates: false,
    });
    return workbook.Sheets[workbook.SheetNames[0]];
  }, []);

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
        <div id="whichSessions">
          <label>
            <Trans>Choose Spreadsheet Mapping:</Trans>
          </label>
          <select
            css={css`
              margin-left: 0;
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
        <SpreadsheetGrid worksheet={worksheet} />
      </DialogMiddle>
      <DialogBottomButtons>
        <DialogCancelButton onClick={() => closeDialog} />
      </DialogBottomButtons>
    </LametaDialog>
  );
};
