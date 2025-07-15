import { Field } from "../model/field/Field";
// tslint:disable-next-line: no-submodule-imports
import AsyncSelect from "react-select/async";
import CreatableAsyncSelect from "react-select/async-creatable";
import { default as React, useState, useEffect } from "react";
import { Language, LanguageFinder } from "../languageFinder/LanguageFinder";
//import colors from "../colors.scss"; // this will fail if you've touched the scss since last full webpack build
import _ from "lodash";
import { LanguagePill, LanguageOption } from "./LanguagePill";
import { observer } from "mobx-react";

const saymore_orange = "#e69664";

export interface IProps {
  field: Field;
  languageFinder: LanguageFinder;
  canCreateNew?: boolean; // comes in via definition.controlProps
}

// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export const LanguageChoicesEditor: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = observer((props) => {
  const customStyles = {
    control: (styles, state) => ({
      ...styles,
      height: "100%",
      borderStyle: "inset",
      borderRadius: 0,
      borderColor: "rgb(169, 169, 169)",
      boxShadow: state.isFocused ? "0 0 0 1px " + saymore_orange : "unset",
      "&:hover": { borderColor: saymore_orange }
    }),
    // valueContainer: (styles) => ({ ...styles }),
    // container: (styles) => ({
    //   ...styles,
    // }),
    //    clearIndicator:styles => ({ ...styles }),
    multiValue: (styles, { data }) => {
      return {
        ...styles,
        backgroundColor: "white",

        border: "none",
        '[role="button"]': {
          color: "transparent" // hide the "x" unless we are hovering
        },
        div: {
          paddingLeft: 0,
          fontSize: "1rem" //should match $default-font-size: 13px;
        },

        ":hover": {
          '[role="button"]': {
            color: "lightgray" // show the "x"
          }
        }
      };
    },
    multiValueRemove: (styles, { data }) => ({
      ...styles,
      color: "inherit", //""transparent",
      // counteract the paddingLeft:0 above
      paddingLeft: "4px !important",
      ":hover": {
        backgroundColor: saymore_orange,
        color: "white"
      }
    })
  };

  const currentValueArray = props.field.text
    .split(";") // TODO: move this serialization logic into the Field class
    .filter((c) => c.length > 0)
    .map((c) => c.trim())
    .map((code) => {
      if (code.indexOf("|") > 0) {
        const parts = code.split("|");
        console.log("parts: " + JSON.stringify(parts));
        return {
          value: parts[0],
          label: parts[1]
        };
      }
      return {
        value: code,
        label: getName(props.languageFinder, code)
      };
    });

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
  const selectProps = {
    tabIndex: props.tabIndex ? props.tabIndex : undefined,
    name: props.field.labelInUILanguage,
    components: {
      MultiValueLabel: LanguagePill,
      Option: LanguageOption,
      // we aren't going to list 7 thousand languages, so don't pretend. The are just going to have to type.
      DropdownIndicator: null
    },
    className: "select flex-grow",
    placeholder: "",
    isClearable: false, // don't need the extra "x"
    loadOptions: _.debounce(loadMatchingOptions, 100),
    value: currentValueArray,
    styles: customStyles,
    onChange: (
      v: Array<{ value: string; label: string; __isNew__: boolean }>
    ) => {
      console.log("onChange: " + JSON.stringify(v));
      // if any are new, change the value to "new"
      const newChoices = v
        ? v.map((o) =>
            o.__isNew__ ? { label: o.label, value: `qaa-x-${o.label}` } : o
          )
        : []; // if you delete the last member, you get null instead of []

      // TODO: move this serialization logic into the Field class
      const s: string = newChoices
        .map((o) => {
          return o.value;
        })
        .join(";"); // why semicolong instead of comma? The particpants field as used semicolon for years.
      console.log("saving: " + s);
      props.field.setValueFromString(s);
    },
    isMulti: true
  };

  return (
    <div className={"field " + (props.className ? props.className : "")}>
      <label>{props.field.labelInUILanguage}</label>
      {props.canCreateNew ? (
        <CreatableAsyncSelect
          {...selectProps}
          onCreateOption={(newOption) => {
            window.alert("You created " + newOption);
          }}
        ></CreatableAsyncSelect>
      ) : (
        <AsyncSelect {...selectProps} />
      )}
    </div>
  );
});

// how to render the choice in the drop
// const CustomOption = (props) => {
//   return (
//     <div
//       {...props.innerProps}
//       style={{
//         paddingLeft: "5px",
//         backgroundColor: props.isFocused
//           ? /*"#cff09f"*/ saymore_orange
//           : "white",
//       }}
//     >
//       <div>
//         {props.data.label}
//         <span className="isoCode">{props.data.value}</span>
//       </div>
//     </div>
//   );
// };

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
