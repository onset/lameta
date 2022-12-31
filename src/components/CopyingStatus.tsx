/* removed emotion jsx declaration */
import { css } from "@emotion/react";
import * as React from "react";
import { t } from "@lingui/macro";
import { i18n } from "../other/localization";
import { CopyManager } from "../other/CopyManager";
import { ipcRenderer } from "electron";
import { useInterval } from "./UseInterval";
import { useState } from "react";
import { lameta_orange } from "../containers/theme";

// This is in the upper right corner of the screen.
export const CopyingStatus: React.FunctionComponent<{}> = (props) => {
  const [message, setMessage] = useState("");
  useInterval(() => {
    setMessage(CopyManager.filesAreStillCopying() ? t`Copying...` : "");
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
        color: ${lameta_orange};
      `}
    >
      {message}
    </div>
  );
};
