import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../../model/field/Field";
import TextFieldEdit from "../../TextFieldEdit";
import ParentButton from "./ParentButton";
import { locate } from "../../../crossPlatformUtilities";
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

export const LanguageEdit: React.FunctionComponent<IProps> = props => {
  const [tooltip, setTooltip] = useState("");
  const [validationClass, setValidationClass] = useState("");
  const updateValidationClass = lang => {
    if (
      lang.trim() === "" ||
      props.languageFinder.findOne639_3CodeFromName(lang, "und") !== "und"
    ) {
      setValidationClass("");
      setTooltip("");
    } else {
      setTooltip(`Digame does not recognize the Language name '${lang}'`);
      setValidationClass("languageNotRecognized");
    }
  };
  React.useEffect(() => {
    updateValidationClass(props.language.text);
  }, []);

  return (
    <div className={"field language " + props.language.key}>
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
