import "./SaveNotifier.scss";
import * as React from "react";
import { Trans } from "@lingui/react";
// tslint:disable-next-line: no-duplicate-imports
import { useState, useEffect } from "react";

let staticSetShowSaving: (b: boolean) => void;
let staticSetFilename: (name: string) => void;

export function ShowSavingNotifier(filename: string) {
  //console.log("Called ShowSavingNotifier()");
  if (staticSetShowSaving) {
    // console.log("Showing SavingNotifier()");
    staticSetFilename(filename);
    staticSetShowSaving!(true);
  }
}
// This is in the upper right corner of the screen.
export const SaveNotifier: React.FunctionComponent<{}> = (props) => {
  const [showSaving, setShowSaving] = useState(false);
  const [filename, setFilename] = useState("");
  staticSetShowSaving = setShowSaving;
  staticSetFilename = setFilename;

  useEffect(() => {
    if (showSaving) {
      window.setTimeout(() => {
        setShowSaving(false);
      }, 2000);
    }
  }, [showSaving]);
  return (
    <div id="saveNotifier" className={showSaving ? "show" : "hide"}>
      <Trans>Saving</Trans>&nbsp;{filename}
    </div>
  );
};
