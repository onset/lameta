import React, { useEffect, useState } from "react";
import {
  Person,
  maxOtherLanguages,
} from "../../../model/Project/Person/Person";
import { OldPersonLanguagesEditor } from "./OldPersonLanguagesEditor";
import { Trans } from "@lingui/macro";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";

export const OtherLanguageEdit: React.FunctionComponent<{
  person: Person;
  languageFinder: LanguageFinder;
}> = (props) => {
  return <div>This control is no longer used</div>;
  // // we use `iteration` just to cause this to update when you click "Add Language"
  // const [iteration, setIteration] = useState(0);
  // const [showAdd, setShowAdd] = useState(false);
  // const [langElements, setLangElements] = useState<JSX.Element[]>([]);
  // const father = props.person.properties.getTextField("fathersLanguage");
  // const mother = props.person.properties.getTextField("mothersLanguage");

  // useEffect(() => {
  //   // gather up the existing "other languages"
  //   const languages: string[] = new Array(maxOtherLanguages)
  //     .fill(0)
  //     .map((ignore, index) => {
  //       const lang: string = props.person.properties.getTextStringOrEmpty(
  //         "otherLanguage" + index
  //       );
  //       return lang.length > 0 ? lang : null;
  //     })
  //     .filter((l) => l != null) as string[];

  //   //collapse away any empty lines
  //   for (let i = 0; i < maxOtherLanguages; i++) {
  //     if (i < languages.length) {
  //       props.person.properties.setText("otherLanguage" + i, languages[i]);
  //     } else {
  //       props.person.properties.setText("otherLanguage" + i, "");
  //     }
  //   }
  //   // make a blank one to fill out, if we aren't already at the max
  //   if (languages.length < maxOtherLanguages) {
  //     languages.push("");
  //   }
  //   setShowAdd(languages.length < maxOtherLanguages);

  //   // create elements for each of those slots
  //   setLangElements(
  //     languages.map((l, index) => (
  //       <OldPersonLanguagesEditor
  //         key={index}
  //         language={props.person.properties.getTextField(
  //           "otherLanguage" + index
  //         )}
  //         fatherLanguage={father}
  //         motherLanguage={mother}
  //         languageFinder={props.languageFinder}
  //       />
  //     ))
  //   );
  // }, [iteration]);

  // return (
  //   <>
  //     {langElements}
  //     {showAdd ? (
  //       <a onClick={(x) => setIteration(iteration + 1)}>
  //         <Trans>Add Language</Trans>
  //       </a>
  //     ) : null}
  //   </>
  // );
};
