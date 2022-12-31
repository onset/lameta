import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { locate } from "../../../other/crossPlatformUtilities";

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
