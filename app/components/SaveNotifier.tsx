import "./SaveNotifier.scss";
import * as React from "react";
import { Trans } from "@lingui/react";
// tslint:disable-next-line: no-duplicate-imports
import { useState, useEffect } from "react";

let staticSetShowSaving: (b) => void;
export function ShowSavingNotifier() {
  console.log("Called ShowSavingNotifier()");
  if (staticSetShowSaving) {
    console.log("Showing SavingNotifier()");
    staticSetShowSaving!(true);
  }
}
// This is in the upper right corner of the screen.
export const SaveNotifier: React.FunctionComponent<{}> = props => {
  const [showSaving, setShowSaving] = useState(false);
  staticSetShowSaving = setShowSaving;
  useEffect(() => {
    if (showSaving) {
      window.setTimeout(() => {
        console.log("hiding");
        setShowSaving(false);
      }, 2000);
    }
  }, [showSaving]);
  return (
    <div id="saveNotifier" className={showSaving ? "show" : "hide"}>
      <Trans>Saving</Trans>
    </div>
  );
};
