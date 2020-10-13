// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import { t } from "@lingui/macro";
import { i18n } from "../localization";
import { Trans } from "@lingui/react";
import { useEffect, useRef, useState } from "react";
import { hasActiveSpawns } from "../RobustLargeFileCopy";
import { ipcRenderer } from "electron";

const saymore_orange = "#e69664";

// This is in the upper right corner of the screen.
export const CopyingStatus: React.FunctionComponent<{}> = (props) => {
  const [message, setMessage] = useState("");
  useInterval(() => {
    setMessage(hasActiveSpawns() ? "Copying..." : "");
    if (hasActiveSpawns()) {
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

type IntervalFunction = () => unknown | void;

function useInterval(callback: IntervalFunction, delay: number) {
  const savedCallback = useRef<IntervalFunction | null>(null);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  });

  // Set up the interval.
  useEffect(() => {
    function tick() {
      if (savedCallback.current !== null) {
        savedCallback.current();
      }
    }
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
