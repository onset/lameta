import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import { Trans } from "@lingui/react/macro";
import * as React from "react";
// tslint:disable-next-line: no-duplicate-imports
import { useState, useEffect } from "react";
import { lameta_dark_blue } from "../containers/theme";
import { getTestEnvironment } from "../getTestEnvironment";

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
// This sits in the strip at the top right, just left of the Problems button. It keeps
// its space while hidden, so the controls beside it do not shift when it appears.
export const SaveNotifier: React.FunctionComponent<{}> = () => {
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
  return getTestEnvironment().E2E ? null : (
    <span
      id="saveNotifier"
      title={showSaving ? filename : undefined}
      css={css`
        color: ${lameta_dark_blue};
        font-weight: bold;
        padding: 5px;
        white-space: nowrap;
        //  https://css-tricks.com/ease-out-in-ease-in-out/ "ease-out" refers to the acceleration curve
        opacity: ${showSaving ? 1 : 0};
        transition: opacity 0.5s ${showSaving ? "ease-out" : "ease-in"};
      `}
    >
      {beforeRename ? <Trans>Saving before rename...</Trans> : <Trans>Saving</Trans>}
    </span>
  );
};
