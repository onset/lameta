import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import { Trans } from "@lingui/macro";
import * as React from "react";
// tslint:disable-next-line: no-duplicate-imports
import { useState, useEffect } from "react";
import { lameta_blue } from "../containers/theme";

let staticSetShowSaving: (b: boolean) => void;
let staticSetFilename: (name: string) => void;
let staticBeforeRename: (b: boolean) => void;

export function ShowSavingNotifier(filename: string, beforeRename: boolean) {
  if (staticSetShowSaving) {
    //console.log(`Showing SavingNotifier(${filename})`);
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
    <div
      id="saveNotifier"
      css={css`
        position: absolute;
        top: 10px;
        right: 10px;
        color: white;
        background-color: ${lameta_blue};
        padding: 5px;
        z-index: -1;
        opacity: 0;
        // after fading out, also hide it so it doesn't cover up buttons
        ${!showSaving &&
        "z-index:-1; opacity: 0; transition: z-index 0.5s step-end, opacity 0.5s ease-in;"}
        //  https://css-tricks.com/ease-out-in-ease-in-out/ "ease-out" refers to the acceleration curve
        ${showSaving &&
        "z-index: 100; opacity: 1; transition: opacity 0.5s ease-out;"}
      `}
    >
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
