// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import { locate } from "../../../crossPlatformUtilities";

export const ToggleIconButton: React.FunctionComponent<{
  onImagePath: string;
  offImagePath: string;
  isOn: boolean;
  title: string;
  onChange: (isOn: boolean) => void;
}> = (props) => (
  <button
    css={css`
      background-color: transparent;
      border: none;
    `}
    type="button"
    title={props.title}
    onClick={() => {
      props.onChange(!props.isOn);
    }}
  >
    <img src={locate(props.isOn ? props.onImagePath : props.offImagePath)} />
  </button>
);
