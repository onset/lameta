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
import { locate } from "../../../other/crossPlatformUtilities";
import {
  LanguageFinder,
  Language,
} from "../../../languageFinder/LanguageFinder";
import { SingleLanguageChooser } from "../../SingleLanguageChooser";
const femaleSelected: string = locate("assets/Female_Selected.png");
const femaleNotSelected: string = locate("assets/Female_NotSelected.png");
const maleSelected: string = locate("assets/Male_Selected.png");
const maleNotSelected: string = locate("assets/Male_NotSelected.png");

export interface IProps {
  language: Field;
  fatherLanguage: Field;
  motherLanguage: Field;
  //changed?: () => void;
  languageFinder: LanguageFinder;
}

export const OldPersonLanguagesEditor: React.FunctionComponent<IProps> = (
  props
) => {
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
    updateValidationClass(props.language.text);
  }, []);

  return (
    <div
      className={"field language " + props.language.key}
      css={css`
        flex-grow: 1;
      `}
    >
      <SingleLanguageChooser
        languageTag={props.language.text}
        languageFinder={props.languageFinder}
        labelInUILanguage={props.language.labelInUILanguage}
        onChange={(v) => props.language.setValueFromString(v)}
        className={"language-name " + validationClass}
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
};
