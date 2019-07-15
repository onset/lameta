import { Field } from "../model/field/Field";
// tslint:disable-next-line: no-submodule-imports
import CreatableSelect from "react-select/creatable";
// tslint:disable-next-line: no-submodule-imports
import AsyncSelect from "react-select/async";
import { default as React, useState, useEffect } from "react";
import LanguageFinder from "../components/LanguagePickerDialog/LanguageFinder";
//import colors from "../colors.scss"; // this will fail if you've touched the scss since last full webpack build

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
    multiValue: (styles, { data }) => {
      return {
        ...styles,
        backgroundColor: "white",
        fontSize: "12pt",
        fontWeight: 600,
        border: "solid 2px #cff09f",
        color: "lightgray" // for the "x"
      };
    },
    multiValueRemove: (styles, { data }) => ({
      ...styles,
      //color: "white",
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
      label: languageFinder!.findOneLanguageNameFromCode_Or_ReturnCode(code)
    }));

  return (
    <div className={"field " + (props.className ? props.className : "")}>
      <label>{props.field.labelInUILanguage}</label>

      <AsyncSelect
        name={props.field.labelInUILanguage}
        isClearable={false} // don't need the extra "x"
        loadOptions={(inputValue, callback) => {
          const matches = languageFinder!.findMatchesForSelect(inputValue);
          callback(matches);
        }}
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
