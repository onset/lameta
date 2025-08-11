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
        background-color: ${props.isFocused ? "#257598" : "white"};
        .isoCode {
          margin-left: 5px;
          color: gray;
        }
      `}
    >
      <div>
        <HighlightSearchTerm text={props.data.label} />
        <span className="isoCode">{props.data.value}</span>
      </div>
    </div>
  );
};
