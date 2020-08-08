// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React, { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Field } from "../../../model/field/Field";
import TextFieldEdit from "../../TextFieldEdit";
import ParentButton from "./ParentButton";
import { locate } from "../../../crossPlatformUtilities";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { SingleLanguageChooser } from "../../SingleLanguageChooser";
import { PersonLanguage } from "../../../model/PersonLanguage";
const femaleSelected: string = locate("assets/Female_Selected.png");
const femaleNotSelected: string = locate("assets/Female_NotSelected.png");
const maleSelected: string = locate("assets/Male_Selected.png");
const maleNotSelected: string = locate("assets/Male_NotSelected.png");

export const OnePersonLanguageEditor: React.FunctionComponent<{
  language: PersonLanguage;
  languageFinder: LanguageFinder;
  onChange: (tag: string) => void;
  autoFocus?: boolean;
}> = observer((props) => {
  const [tooltip, setTooltip] = useState("");
  const [validationClass, setValidationClass] = useState("");
  const updateValidationClass = (lang) => {
    if (
      lang.trim() === "" ||
      props.languageFinder.findOne639_3CodeFromName(lang, "und") !== "und"
    ) {
      setValidationClass("");
      setTooltip("");
    } else {
      setTooltip(`lameta does not recognize the Language name '${lang}'`);
      setValidationClass("languageNotRecognized");
    }
  };
  React.useEffect(() => {
    updateValidationClass(props.language.tag);
  }, []);

  return (
    <div
      className={"field language"}
      css={css`
        flex-grow: 1;
      `}
    >
      <SingleLanguageChooser
        languageTag={props.language.tag}
        labelInUILanguage={"AAAABBBB"}
        onChange={(v) => props.onChange(v)}
        languageFinder={props.languageFinder}
        className={"language-name " + validationClass}
        autoFocus={props.autoFocus}
      />
      {/* <TextFieldEdit
        className={"language-name " + validationClass}
        hideLabel={true}
        field={props.language}
        tooltip={tooltip}
        onBlurWithValue={updateValidationClass}
      /> */}
      {/* <ParentButton
        childLanguage={props.language}
        parentLanguage={props.motherLanguage}
        selectedIcon={femaleSelected}
        notSelectedIcon={femaleNotSelected}
      />
      <ParentButton
        childLanguage={props.language}
        parentLanguage={props.fatherLanguage}
        selectedIcon={maleSelected}
        notSelectedIcon={maleNotSelected}
      /> */}
    </div>
  );
});
