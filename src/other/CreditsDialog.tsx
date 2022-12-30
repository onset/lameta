// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import { ShowMessageDialog } from "../components/ShowMessageDialog/MessageDialog";

export function ShowCreditsDialog() {
  ShowMessageDialog({
    title: `Credits`,
    width: "300px",
    content: (
      <React.Fragment>
        <p>
          Lameta project led by Gary Holton, Mandana Seyfeddinipur, Nick
          Thieberger. Software development by John Hatton.
        </p>
        <p>
          Funding from the National Science Foundation (BCS-1648984), ARC Centre
          of Excellence for the Dynamics of Language, and Endangered Languages
          Documentation Programme.
        </p>
        <p>
          Illustration 'Profile Man &amp; Woman' by mikicon from the Noun
          Project
        </p>
      </React.Fragment>
    )
  });
}
