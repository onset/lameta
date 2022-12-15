import "./SaveNotifier.scss";
import { Trans } from "@lingui/macro";
import * as React from "react";
// tslint:disable-next-line: no-duplicate-imports
import { useState, useEffect } from "react";

let staticSetShowSaving: (b: boolean) => void;
let staticSetFilename: (name: string) => void;
let staticBeforeRename: (b: boolean) => void;

export function ShowSavingNotifier(filename: string, beforeRename: boolean) {
  //console.log("Called ShowSavingNotifier()");
  if (staticSetShowSaving) {
    // console.log("Showing SavingNotifier()");
    staticSetFilename(filename);
    staticSetShowSaving!(true);
    staticBeforeRename(beforeRename);
  }
}
// This is in the upper right corner of the screen.
export const SaveNotifier: React.FunctionComponent<{}> = (props) => {
  const [beforeRename, setBeforeRename] = useState(false);
  const [showSaving, setShowSaving] = useState(false);
  const [filename, setFilename] = useState("");
  staticSetShowSaving = setShowSaving;
  staticSetFilename = setFilename;
  staticBeforeRename = setBeforeRename;

  useEffect(() => {
    if (showSaving) {
      window.setTimeout(() => {
        setShowSaving(false);
      }, 2000);
    }
  }, [showSaving]);
  // in e2e testing, this covers up buttons that we need to click, maybe because the fading is just done by changing opacity?
  return process.env.E2E ? null : (
    <div id="saveNotifier" className={showSaving ? "show" : "hide"}>
      {beforeRename && (
        <div>
          <Trans>Saving before rename...</Trans>
        </div>
      )}
      <Trans>Saving</Trans>&nbsp;
      <br />
      {filename}
    </div>
  );
};
