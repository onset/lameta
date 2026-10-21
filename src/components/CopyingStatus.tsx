/* removed emotion jsx declaration */
import { css } from "@emotion/react";
import * as React from "react";
import { t } from "@lingui/macro";
import { CopyManager } from "../other/CopyManager";
import { useInterval } from "./UseInterval";
import { useState } from "react";
import { lameta_orange } from "../containers/theme";

// This is in the upper right corner of the screen.
export const CopyingStatus: React.FunctionComponent<{}> = () => {
  const [message, setMessage] = useState("");
  useInterval(() => {
    setMessage(CopyManager.filesAreStillCopying() ? t`Copying...` : "");
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
