import { staticLanguageFinder } from "../../../languageFinder/LanguageFinder";
import { maxOtherLanguages } from "./Person";
import { Field } from "../../field/Field";
import { FieldSet } from "../../field/FieldSet";
import { IPersonLanguage } from "../../PersonLanguage";
import { runInAction } from "mobx";

// see https://trello.com/c/f6hVbGoY and https://trello.com/c/zWaSIuSj
export function migrateLegacyIndividualPersonLanguageFieldsToCurrentListOfLanguages(
  properties: FieldSet,
  languages: IPersonLanguage[]
) {
  // we don't try merging in the old fields; if we already have this modern languages list, then we
  // ignore the new fields.
  if (languages.length) return;
  runInAction(() => {
    const primary = properties.getTextFieldOrUndefined("primaryLanguage");
    if (primary && primary.text)
      languages.push({
        code: primary.text,
        primary: true,
        mother: false,
        father: false
      });
    properties.remove("primaryLanguage");
    let x = properties.getTextFieldOrUndefined("mothersLanguage");
    if (x && x.text) {
      const match = languages.find((l) => l.code === x!.text);
      if (match) {
        match.mother = true;
      } else {
        languages.push({
          code: x.text,
          primary: false,
          mother: true,
          father: false
        });
      }
    }

    properties.remove("mothersLanguage");
    x = properties.getTextFieldOrUndefined("fathersLanguage");
    if (x && x.text) {
      const match = languages.find((l) => l.code === x!.text);
      if (match) {
        match.father = true;
      } else {
        languages.push({
          code: x.text,
          primary: false,
          mother: false,
          father: true
        });
      }
    }
    properties.remove("fathersLanguage");
    for (let i = 0; i < maxOtherLanguages; i++) {
      const key = "otherLanguage" + i;
      x = properties.getTextFieldOrUndefined(key);
      if (x && x.text) {
        const match = languages.find((l) => l.code === x!.text);
        if (!match) {
          languages.push({
            code: x.text,
            primary: false,
            mother: false,
            father: false
          });
        }
      }
      properties.remove(key);
    }

    // preserve contents of the legacy primaryLanguageLearnedIn field which was labeled as "detail" in some versions.
    const legacyLearnedin = properties.getTextFieldOrUndefined(
      "primaryLanguageLearnedIn"
    );
    if (legacyLearnedin && legacyLearnedin.text) {
      if (primary && primary.text) {
        const primaryLanguageName =
          staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
            primary.text
          );
        const d = properties.getTextStringOrEmpty("description");
        const descriptionToAdd = `${primaryLanguageName} learned in ${legacyLearnedin}.`;
        // if they are going back and forth with SayMore, we might already have this text. In which case do not add it again.
        if (d.indexOf(descriptionToAdd) === -1) {
          properties.setText("description", `${d} ${descriptionToAdd}`.trim());
        }
      }
    }
  });
}

// Note: this migration happened a couple months before we switched to the new PersonLanguages structure
export function migrateLegacyPersonLanguagesFromNameToCode(
  properties: FieldSet
) {
  // const x = properties.getTextStringOrEmpty("fathersLanguage"); //??
  // console.log("fl: " + x);
  ["primaryLanguage", "fathersLanguage", "mothersLanguage"].forEach(
    (fieldName) =>
      migrateOnePersonLanguageFromNameToCode(
        properties.getTextFieldOrUndefined(fieldName)
      )
  );
  for (let i = 0; i < maxOtherLanguages; i++) {
    migrateOnePersonLanguageFromNameToCode(
      properties.getTextFieldOrUndefined("otherLanguage" + i)
    );
  }
}
// Note: this migration happened a couple months before we switched to the new PersonLanguages structure
// public and static to make it easier to unit test
export function migrateOnePersonLanguageFromNameToCode(
  field: Field | undefined
) {
  try {
    if (!field) return;
    const nameOrCode = field.text;
    if (!nameOrCode) {
      return; // leave it alone
    }
    const foundCode =
      staticLanguageFinder.findCodeFromCodeOrLanguageName(nameOrCode);
    const valueToUse = foundCode === "und" ? nameOrCode : foundCode;
    return field.setValueFromString(valueToUse);

    //console.log(`Migrate person lang ${key}:${nameOrCode} --> ${code}`);
  } catch (err) {
    const ex = err as Error;
    ex.message = `${err} (migrateOnePersonLanguage: nameOrCode = '${
      field!.text
    }')`;
    throw ex;
  }
}
