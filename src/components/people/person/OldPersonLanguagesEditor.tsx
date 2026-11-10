import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import React, { useState } from "react";
import { Field } from "../../../model/field/Field";

import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { SingleLanguageChooser } from "../../SingleLanguageChooser";

export interface IProps {
  language: Field;
  fatherLanguage: Field;
  motherLanguage: Field;
  //changed?: () => void;
  languageFinder: LanguageFinder;
}

export const OldPersonLanguagesEditor: React.FunctionComponent<IProps> = (props) => {
  const [validationClass, setValidationClass] = useState("");
  const updateValidationClass = (lang) => {
    if (
      lang.trim() === "" ||
      props.languageFinder.findOne639_3CodeFromName(lang, "und") !== "und"
    ) {
      setValidationClass("");
    } else {
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
