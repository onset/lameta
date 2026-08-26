import { css } from "@emotion/react";
import { default as React, useContext } from "react";
import {
  components,
  GroupBase,
  MultiValueGenericProps,
  SingleValueProps
} from "react-select";
import { SearchContext } from "./SearchContext";
import HighlightSearchTerm from "./HighlightSearchTerm";
import { lameta_dark_blue, textSecondary } from "../containers/theme";

const saymore_orange = "#e69664";

interface LanguageData {
  label: string;
  value: string;
}

export const languagePillHoverStyle = css`
  :hover .isoCode {
    color: ${textSecondary};
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
  const { searchTerm } = useContext(SearchContext);
  return (
    <div {...innerProps} css={pillStyle}>
      <div>
        <HighlightSearchTerm text={data.label} />
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
  <LanguagePillSingleWrapper data={data} {...props} />
);

const LanguagePillSingleWrapper = (props: any) => {
  const { searchTerm } = useContext(SearchContext);
  return (
    <components.SingleValue data={props.data} css={pillStyle} {...props}>
      <HighlightSearchTerm text={props.data.label} />
      <span className="isoCode">{props.data.value}</span>
    </components.SingleValue>
  );
};

// how to render the choice in the drop down
export const LanguageOption = (props) => {
  const { searchTerm } = useContext(SearchContext);
  return (
    <div
      {...props.innerProps}
      css={css`
        padding-left: 5px;
        color: ${props.isFocused ? "white" : "black"};
        background-color: ${props.isFocused ? lameta_dark_blue : "white"};
        .isoCode {
          margin-left: 5px;
          /* The code needs enough contrast on both grounds. Grey on the dark row of the
             highlighted choice was almost unreadable. White at 80% over lameta_dark_blue
             gives 4.9:1, which passes WCAG AA; lameta_blue itself gives only 4.07:1. */
          color: ${props.isFocused ? "rgba(255, 255, 255, 0.8)" : textSecondary};
        }
      `}
    >
      <div>
        <HighlightSearchTerm text={props.data.label} />
        {/* The "Add ... as qac-x-foobar" row carries the tag in its own label, so the
            grey code here would only repeat what the user typed. */}
        {!props.data.__isNew__ && (
          <span className="isoCode">{props.data.value}</span>
        )}
      </div>
    </div>
  );
};
