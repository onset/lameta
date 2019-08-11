import { Field } from "../model/field/Field";
// tslint:disable-next-line: no-submodule-imports
import AsyncSelect from "react-select/async";
import { default as React, useState, useEffect } from "react";
import { Language, LanguageFinder } from "../languageFinder/LanguageFinder";
//import colors from "../colors.scss"; // this will fail if you've touched the scss since last full webpack build
import _ from "lodash";

const saymore_orange = "#e69664";

let languageFinder: LanguageFinder | undefined;

export interface IProps {
  field: Field;
}

// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export const MultiLanguageFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = props => {
  if (!languageFinder) {
    languageFinder = new LanguageFinder();
  }

  const customStyles = {
    control: styles => ({ ...styles, backgroundColor: "white" }),
    valueContainer: styles => ({ ...styles }),
    //    clearIndicator:styles => ({ ...styles }),
    multiValue: (styles, { data }) => {
      return {
        ...styles,
        backgroundColor: "white",
        fontSize: "12pt",
        fontWeight: 600,
        border: "none",
        color: "transparent", // hide the "x" unless the mouse is in us
        // don't show the language code unless we're pointing at it, it's just visual noise
        span: {
          color: "transparent"
        },
        ":hover": {
          color: "lightgray", // show the "x"
          border: "solid 2px #cff09f",
          span: {
            color: "lightgray" //go ahead and show it
          }
        }
      };
    },
    multiValueRemove: (styles, { data }) => ({
      ...styles,
      color: "inherit", //""transparent",
      ":hover": {
        backgroundColor: saymore_orange,
        color: "white"
      }
    })
  };

  const [languageCodeString, setLanguageCodeString] = useState(
    props.field.text
  );

  const currentValueArray = languageCodeString
    .split(";")
    .filter(c => c.length > 0)
    .map(c => c.trim())
    .map(code => ({
      value: code,
      label: fixNamesWithComma(
        languageFinder!.findOneLanguageNameFromCode_Or_ReturnCode(code)
      )
    }));

  return (
    <div className={"field " + (props.className ? props.className : "")}>
      <label>{props.field.labelInUILanguage}</label>

      <AsyncSelect
        name={props.field.labelInUILanguage}
        components={{
          MultiValueLabel: CustomLanguagePill,
          Option: CustomOption
        }}
        placeholder=""
        isClearable={false} // don't need the extra "x"
        loadOptions={_.debounce(loadMatchingOptions, 100)}
        value={currentValueArray}
        styles={customStyles}
        onChange={(v: any[]) => {
          // if you delete the last member, you get null instead of []
          const newChoices = v ? v : [];
          const s: string = newChoices.map(o => o.value).join(";");
          // NB: haven't worked out how to use mbox with functional components yet, so we
          // set the value
          props.field.setValueFromString(s);
          // and explicitly change the state so that we redraw
          setLanguageCodeString(s);
        }}
        isMulti
      />
    </div>
  );
};

const loadMatchingOptions = (inputValue, callback) => {
  const matches =
    inputValue.length > 1
      ? languageFinder!.makeMatchesAndLabelsForSelect(inputValue)
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

// how to render the choice in the drop
const CustomOption = props => {
  return (
    <div
      {...props.innerProps}
      style={{
        paddingLeft: "5px",
        backgroundColor: props.isFocused
          ? /*"#cff09f"*/ saymore_orange
          : "white"
      }}
    >
      <div>
        {props.data.label}
        <span className="isoCode">{props.data.value}</span>
      </div>
    </div>
  );
};

// render what has been previously chosen
const CustomLanguagePill = ({ children, data, innerProps, isDisabled }) => {
  return (
    <div {...innerProps}>
      <div>
        {data.label}
        <span className="isoCode">{data.value}</span>
      </div>
    </div>
  );
};

// things like German are currently in our index as "German, Standard". This looks weird when it is in a list of other language names.
// So just make it, e.g., "Standard German"
function fixNamesWithComma(name: string): string {
  const parts = name.split(",");
  if (parts.length === 1) {
    return name;
  }
  return parts[1] + " " + parts[0];
}
