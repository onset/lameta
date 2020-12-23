// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import { t } from "@lingui/macro";
import { i18n } from "../other/localization";
import { CopyManager } from "../other/CopyManager";
import { ipcRenderer } from "electron";
import { useInterval } from "./UseInterval";
import { useState } from "react";

// This is in the upper right corner of the screen.
export const CopyingStatus: React.FunctionComponent<{}> = (props) => {
  const [message, setMessage] = useState("");
  useInterval(() => {
    setMessage(CopyManager.filesAreStillCopying() ? i18n._(t`Copying...`) : "");
    if (CopyManager.filesAreStillCopying()) {
      ipcRenderer.send("copyInProgress");
    } else {
      ipcRenderer.send("copyStopped");
    }
  }, 1000);

  return (
    <div
      css={css`
        font-weight: bold;
        color: ${saymore_orange};
      `}
    >
      {message}
    </div>
  );
};
