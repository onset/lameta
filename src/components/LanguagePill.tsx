import { css } from "@emotion/react";
import { default as React } from "react";
import {
  components,
  GroupBase,
  MultiValueGenericProps,
  SingleValueProps
} from "react-select";

const saymore_orange = "#e69664";

interface LanguageData {
  label: string;
  value: string;
}

export const languagePillHoverStyle = css`
  :hover .isoCode {
    color: grey;
  }
`;

const pillStyle = css`
  border: none;
  .isoCode {
    color: transparent;
    margin-left: 5px;
  }
  &:hover {
    ${languagePillHoverStyle}
  }
`;

export const LanguagePill = ({
  children,
  data,
  innerProps
}: MultiValueGenericProps<LanguageData>) => {
  return (
    <div {...innerProps} css={pillStyle}>
      <div>
        {data.label}
        <span className="isoCode">{data.value}</span>
      </div>
    </div>
  );
};
// with the upgrade of react-select from 4 to 5, it became necessary to make
// a different language pill for single values
export const LanguagePillForSingle = ({
  children,
  data,
  ...props
}: SingleValueProps<LanguageData, false, GroupBase<LanguageData>>) => (
  <components.SingleValue data={data} css={pillStyle} {...props}>
    {data.label}
    <span className="isoCode">{data.value}</span>
  </components.SingleValue>
);

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
