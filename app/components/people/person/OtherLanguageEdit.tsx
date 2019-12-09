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
  const [showAdd, setShowAdd] = useState(false);
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
    if (languages.length < maxOtherLanguages) {
      languages.push("");
    }
    setShowAdd(languages.length < maxOtherLanguages);

    setLangElements(
      languages.map((l, index) => (
        <LanguageEdit
          key={index}
          language={props.person.properties.getTextField(
            "otherLanguage" + index
          )}
          fatherLanguage={father}
          motherLanguage={mother}
        />
      ))
    );
  }, [iteration]);

  return (
    <>
      {langElements}
      {showAdd ? (
        <a onClick={x => setIteration(iteration + 1)}>
          <Trans>Add Language</Trans>
        </a>
      ) : null}
    </>
  );
};
