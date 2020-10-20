// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../../model/field/Field";
import { TextFieldEdit } from "../../TextFieldEdit";
import ParentButton from "./ParentButton";
import { locate } from "../../../other/crossPlatformUtilities";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { useState } from "react";
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

export const LanguageEdit: React.FunctionComponent<IProps> = (props) => {
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
    console.assert(props.language);
    updateValidationClass(props.language.text);
  }, []);

  return (
    <div className={"field language " + props.language.key}>
      <DragAffordance />
      <TextFieldEdit
        className={"language-name " + validationClass}
        hideLabel={true}
        field={props.language}
        tooltip={tooltip}
        onBlurWithValue={updateValidationClass}
      />
      <ParentButton
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
      />
    </div>
  );
};

const DragAffordance: React.FunctionComponent = () => {
  return (
    <span
      css={css`
        content: "....";
        width: 16px;
        height: 20px;
        display: inline-block;
        overflow: hidden;
        line-height: 5px;
        padding: 3px 4px;
        cursor: move;
        vertical-align: middle;
        //margin-top: -0.7em;
        margin-right: 0.3em;
        font-size: 12px;
        font-weight: bold;
        font-family: sans-serif;
        letter-spacing: 2px;
        color: #6b6b6b;
        //text-shadow: 1px 0 1px black;

        &:after {
          content: ".. .. .. ..";
        }
      `}
    ></span>
  );
};
