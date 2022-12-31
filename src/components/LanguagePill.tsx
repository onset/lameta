import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import { default as React } from "react";
const saymore_orange = "#e69664";
export const LanguagePill = ({ children, data, innerProps, isDisabled }) => {
  return (
    <div
      {...innerProps}
      css={css`
        border: none;
        .isoCode {
          color: transparent;
          margin-left: 5px;
        }
        &:hover .isoCode {
          color: grey;
        }
      `}
    >
      <div>
        {data.label}
        <span className="isoCode">{data.value}</span>
      </div>
    </div>
  );
};

// how to render the choice in the drop down
export const LanguageOption = (props) => {
  return (
    <div
      {...props.innerProps}
      css={css`
        padding-left: "5px";
        background-color: ${props.isFocused ? saymore_orange : "white"};
        .isoCode {
          //font-size: 0.6em;
          margin-left: 5px;
          color: gray;
        }
      `}
    >
      <div>
        {props.data.label}
        <span className="isoCode">{props.data.value}</span>
      </div>
    </div>
  );
};
