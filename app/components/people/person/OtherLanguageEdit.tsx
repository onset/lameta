import React, { useEffect, useState } from "react";
import {
  Person,
  maxOtherLanguages
} from "../../../model/Project/Person/Person";
import LanguageEdit from "./LanguageEdit";
import { Trans } from "@lingui/react";

export const OtherLanguageEdit: React.FunctionComponent<{
  person: Person;
}> = props => {
  const [iteration, setIteration] = useState(0);
  const [langElements, setLangElements] = useState<JSX.Element[]>([]);
  const father = props.person.properties.getTextField("fathersLanguage");
  const mother = props.person.properties.getTextField("mothersLanguage");

  useEffect(() => {
    const languages: string[] = new Array(maxOtherLanguages)
      .fill(0)
      .map((ignore, index) => {
        const lang: string = props.person.properties.getTextStringOrEmpty(
          "otherLanguage" + index
        );
        return lang.length > 0 ? lang : null;
      })
      .filter(l => l != null) as string[];

    //collapse away any empty lines
    for (let i = 0; i < maxOtherLanguages; i++) {
      if (i < languages.length) {
        props.person.properties.setText("otherLanguage" + i, languages[i]);
      } else {
        props.person.properties.setText("otherLanguage" + i, "");
      }
    }
    // make a blank one to fill out
    languages.push("");

    setLangElements(
      languages.map((l, index) => (
        <LanguageEdit
          language={props.person.properties.getTextField(
            "otherLanguage" + index
          )}
          fatherLanguage={father}
          motherLanguage={mother}
        />
      ))
    );
  }, [iteration]);
  // TODO: EITHER just add a new language each time there isn't a blank anymore, OR
  // Add a "new language" button.
  return (
    <>
      {langElements}
      <button key="newLanguage">
        <Trans>Add Language</Trans>
      </button>
    </>
  );
};
