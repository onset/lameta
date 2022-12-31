import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import { Field } from "../model/field/Field";
// tslint:disable-next-line: no-submodule-imports
import AsyncSelect from "react-select/async";
import { default as React, useState, useEffect } from "react";
import { Language, LanguageFinder } from "../languageFinder/LanguageFinder";
import _ from "lodash";
import { LanguageOption, LanguagePill } from "./LanguagePill";
import { observer } from "mobx-react";

const saymore_orange = "#e69664";

export interface IProps {
  labelInUILanguage: string;
  languageTag: string;
  onChange: (newTag: string) => void;
  languageFinder: LanguageFinder;
  autoFocus?: boolean;
}

// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export const SingleLanguageChooser: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = observer((props) => {
  const customStyles = {
    input: (provided, state) => ({
      ...provided,
      height: "1.3em"
    }),
    control: (styles, state) => ({
      ...styles,
      paddingTop: "0px",
      paddingBottom: "0px",
      minHeight: "auto",
      borderStyle: "inset",
      borderRadius: 0,
      borderColor: "rgb(169, 169, 169)",
      boxShadow: state.isFocused ? "0 0 0 1px " + saymore_orange : "unset",
      "&:hover": { borderColor: saymore_orange }
    }),

    clearIndicator: (styles) => ({
      ...styles,
      color: "#e4e4e4" // I would rather show only when cursor is in the frame of the control, but I haven't figured it out
    })
  };

  const code = props.languageTag ? props.languageTag.trim() : undefined;
  const currentValue = code
    ? {
        value: code,
        label: getName(props.languageFinder, code)
      }
    : undefined;

  const loadMatchingOptions = (inputValue, callback) => {
    const matches =
      inputValue.length > 1
        ? props.languageFinder!.makeMatchesAndLabelsForSelect(inputValue)
        : [];
    callback(
      matches.map(
        (m: { languageInfo: Language; nameMatchingWhatTheyTyped: string }) => ({
          value: m.languageInfo.iso639_3,
          label: m.nameMatchingWhatTheyTyped,
          language: m.languageInfo
        })
      )
    );
  };
  return (
    <div className={"field " + (props.className ? props.className : "")}>
      <AsyncSelect
        tabIndex={props.tabIndex ? props.tabIndex.toString() : ""}
        name={props.labelInUILanguage}
        components={{
          SingleValue: LanguagePill,
          Option: LanguageOption,
          // we aren't going to list 7 thousand languages, so don't pretend. The are just going to have to type.
          DropdownIndicator: null
          // ClearIndicator:
        }}
        className="select"
        placeholder=""
        isClearable={true}
        loadOptions={_.debounce(loadMatchingOptions, 100)}
        value={currentValue}
        styles={customStyles}
        onChange={(choice: any) => {
          const v = choice && choice.value ? choice.value : "";
          props.onChange(v);
        }}
        autoFocus={props.autoFocus}
      />
    </div>
  );
});

// things like German are currently in our index as "German, Standard". This looks weird when it is in a list of other language names.
// So just make it, e.g., "Standard German"
function getName(languageFinder: LanguageFinder, code: string): string {
  const name = languageFinder!.findOneLanguageNameFromCode_Or_ReturnCode(code);

  // first, languages with custom codes need special name handling
  // if (
  //   name === code ||
  //   // see https://tools.ietf.org/html/bcp47 note these are language tags, not subtags, so are qaa-qtz, not qaaa-qabx, which are script subtags
  //   (code.toLowerCase() >= "qaa" &&
  //     code.toLowerCase() <= "qtz" &&
  //     name.indexOf("[Unlisted]") >= 0)
  // ) {
  //   //code.substr(0, 2).toLowerCase() === "qa") {
  //   return code;
  // }

  // now remove any commas
  const parts = name.split(",");
  if (parts.length === 1) {
    return name;
  }
  return parts[1] + " " + parts[0];
}
