// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React from "react";
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

export let showSpreadsheetImportDialog = () => {};
export const SpreadsheetImportDialog: React.FunctionComponent<{}> = () => {
  const { currentlyOpen, showDialog, closeDialog } = useSetupLametaDialog();
  const [mapping, setMapping] = useUserSetting(
    "spreadsheetImport.mapping",
    "LingMetaXMap"
  );
  showSpreadsheetImportDialog = showDialog;

  return (
    <LametaDialog open={currentlyOpen} onClose={closeDialog}>
      <DialogTitle title={i18n._(t`Import Spreadsheet`)}></DialogTitle>
      <DialogMiddle>
        <div id="whichSessions">
          <label>
            <Trans>Choose Spreadsheet Mapping:</Trans>
          </label>
          <select
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
        <SpreadsheetTable />
      </DialogMiddle>
      <DialogBottomButtons>
        <DialogCancelButton onClick={() => closeDialog} />
      </DialogBottomButtons>
    </LametaDialog>
  );
};
