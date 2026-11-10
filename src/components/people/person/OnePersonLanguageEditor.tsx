import { css } from "@emotion/react";
import React from "react";
import { observer } from "mobx-react";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { SingleLanguageChooser } from "../../SingleLanguageChooser";
import { IPersonLanguage } from "../../../model/PersonLanguage";
import { ToggleIconButton } from "./ToggleIconButton";
import { t } from "@lingui/core/macro";
import { isPrivateUseTag } from "../../../languageFinder/privateUseLanguages";

// A person's language holds a code chosen in SingleLanguageChooser, or, for a
// language that the name-to-code migration could not identify, the original name.
export function getUnrecognizedLanguageTooltip(
  code: string | undefined,
  languageFinder: LanguageFinder,
): string {
  const trimmed = code?.trim() ?? "";
  if (
    trimmed === "" ||
    isPrivateUseTag(trimmed) ||
    languageFinder.findOneLanguageNameFromCode_Or_ReturnCode(trimmed) !== trimmed
  ) {
    return "";
  }
  return t`lameta does not recognize the Language name "${trimmed}"`;
}

export const OnePersonLanguageEditor: React.FunctionComponent<{
  language: IPersonLanguage;
  languageFinder: LanguageFinder;
  onChange: (code: string) => void;
  autoFocus?: boolean;
}> = observer((props) => {
  const tooltip = getUnrecognizedLanguageTooltip(props.language.code, props.languageFinder);
  const validationClass = tooltip ? "languageNotRecognized" : "";

  return (
    <div
      className={"field language"}
      css={css`
        flex-grow: 1;
      `}
    >
      <ToggleIconButton
        title={t`Mark as a primary language.`}
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
        title={tooltip || undefined}
        autoFocus={props.autoFocus}
      />
      <ToggleIconButton
        title={t`Mark as a primary language of the mother.`}
        onImagePath={"assets/mother-selected.svg"}
        offImagePath={"assets/mother-unselected.svg"}
        isOn={!!props.language.mother}
        onChange={(isOn) => (props.language.mother = isOn)}
      />
      <ToggleIconButton
        title={t`Mark as primary language of the father.`}
        onImagePath={"assets/father-selected.svg"}
        offImagePath={"assets/father-unselected.svg"}
        isOn={!!props.language.father}
        onChange={(isOn) => (props.language.father = isOn)}
      />
    </div>
  );
});
