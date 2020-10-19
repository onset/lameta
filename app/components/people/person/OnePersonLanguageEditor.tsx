// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React, { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { SingleLanguageChooser } from "../../SingleLanguageChooser";
import { IPersonLanguage } from "../../../model/PersonLanguage";
import { ToggleIconButton } from "./ToggleIconButton";
import { i18n } from "../../../other/localization";
import { t } from "@lingui/macro";

export const OnePersonLanguageEditor: React.FunctionComponent<{
  language: IPersonLanguage;
  languageFinder: LanguageFinder;
  onChange: (code: string) => void;
  autoFocus?: boolean;
}> = observer((props) => {
  const [tooltip, setTooltip] = useState("");
  const [validationClass, setValidationClass] = useState("");
  const updateValidationClass = (lang) => {
    if (
      !lang ||
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
    updateValidationClass(props.language.code);
  }, []);

  return (
    <div
      className={"field language"}
      css={css`
        flex-grow: 1;
      `}
    >
      <ToggleIconButton
        title={i18n._(t`Mark as a primary language.`)}
        onImagePath={"assets/star-selected.svg"}
        offImagePath={"assets/star-unselected.svg"}
        isOn={!!props.language.primary}
        onChange={(isOn) => (props.language.primary = isOn)}
      />

      <SingleLanguageChooser
        languageTag={props.language.code}
        labelInUILanguage={"AAAABBBB"}
        onChange={(v) => props.onChange(v)}
        languageFinder={props.languageFinder}
        className={"language-name " + validationClass}
        autoFocus={props.autoFocus}
      />
      <ToggleIconButton
        title={i18n._(t`Mark as a primary language of the mother.`)}
        onImagePath={"assets/mother-selected.svg"}
        offImagePath={"assets/mother-unselected.svg"}
        isOn={!!props.language.mother}
        onChange={(isOn) => (props.language.mother = isOn)}
      />
      <ToggleIconButton
        title={i18n._(t`Mark as primary language of the father.`)}
        onImagePath={"assets/father-selected.svg"}
        offImagePath={"assets/father-unselected.svg"}
        isOn={!!props.language.father}
        onChange={(isOn) => (props.language.father = isOn)}
      />
    </div>
  );
});
