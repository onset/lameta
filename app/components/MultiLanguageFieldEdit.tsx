import { Field } from "../model/field/Field";
// tslint:disable-next-line: no-submodule-imports
import CreatableSelect from "react-select/creatable";
// tslint:disable-next-line: no-submodule-imports
import AsyncSelect from "react-select/async";
import { default as React, useState, useEffect } from "react";
import LanguageFinder from "../components/LanguagePickerDialog/LanguageFinder";
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
  const languageColor = "#e69664";

  const customStyles = {
    control: styles => ({ ...styles, backgroundColor: "white" }),
    multiValue: (styles, { data }) => {
      return {
        ...styles,
        backgroundColor: "white",
        fontSize: "12pt",
        fontWeight: 600,
        border: "solid thin " + languageColor,
        color: "lightgray" // for the "x"
      };
    }
  };

  const [languageCodeString, setLanguageCodeString] = useState(
    props.field.text
  );
  const currentValueArray = languageCodeString
    .split(";")
    .filter(c => c.length > 0)
    .map(code => ({
      value: code,
      label: languageFinder!.findOneLanguageNameFromCode_Or_ReturnCode(code)
    }));

  // const currentOptionObjects = currentValueArray.map(v => ({
  //   value: v,
  //   label: v + "-name"
  // }));
  return (
    <div className={"field " + (props.className ? props.className : "")}>
      <label>{props.field.labelInUILanguage}</label>
      {/* <CreatableSelect
        name={props.field.labelInUILanguage}
        isClearable={false} // don't need the extra "x"
        //defaultValue={currentValueArray}
        value={currentValueArray}
        styles={customStyles}
        delimiter=";"
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
      /> */}

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
