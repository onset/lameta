import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { maxOtherLanguages } from "./Person";
import { Field } from "../../field/Field";
import { FieldSet } from "../../field/FieldSet";
import { IPersonLanguage } from "../../PersonLanguage";

// see https://trello.com/c/f6hVbGoY and https://trello.com/c/zWaSIuSj
export function migrateLegacyIndividualPersonLanguageFieldsToCurrentListOfLanguages(
  properties: FieldSet,
  languages: IPersonLanguage[],
  languageFinder: LanguageFinder
) {
  // we don't try merging in the old fields; if we already have this modern languages list, then we
  // ignore the new fields.
  if (languages.length) return;
  const primary = properties.getTextFieldOrUndefined("primaryLanguage");
  if (primary && primary.text)
    languages.push({
      tag: primary.text,
      primary: true,
      mother: false,
      father: false,
    });
  let x = properties.getTextFieldOrUndefined("mothersLanguage");
  if (x && x.text) {
    const match = languages.find((l) => l.tag === x!.text);
    if (match) {
      match.mother = true;
    } else {
      languages.push({
        tag: x.text,
        primary: false,
        mother: true,
        father: false,
      });
    }
  }
  x = properties.getTextFieldOrUndefined("fathersLanguage");
  if (x && x.text) {
    const match = languages.find((l) => l.tag === x!.text);
    if (match) {
      match.father = true;
    } else {
      languages.push({
        tag: x.text,
        primary: false,
        mother: false,
        father: true,
      });
    }
  }
  for (let i = 0; i < maxOtherLanguages; i++) {
    x = properties.getTextFieldOrUndefined("otherLanguage" + i);
    if (x && x.text) {
      const match = languages.find((l) => l.tag === x!.text);
      if (!match) {
        languages.push({
          tag: x.text,
          primary: false,
          mother: false,
          father: false,
        });
      }
    }
  }

  // preserve contents of the legacy primaryLanguageLearnedIn field which was labeled as "detail" in some versions.
  const legacyLearnedin = properties.getTextFieldOrUndefined(
    "primaryLanguageLearnedIn"
  );
  if (legacyLearnedin) {
    const primaryLanguageName =
      primary && primary.text
        ? languageFinder.findOneLanguageNameFromCode_Or_ReturnCode(primary.text)
        : "???";
    const d = properties.getTextStringOrEmpty("description");
    properties.setText(
      "description",
      `${d} Info about ${primaryLanguageName}: ${legacyLearnedin}`
    );
  }
}

// Note: this migration happened a couple months before we switched to the new PersonLanguages structure
export function migrateLegacyPersonLanguagesFromNameToCode(
  properties: FieldSet,
  languageFinder: LanguageFinder
) {
  [
    "primaryLanguage",
    "fathersLanguage",
    "mothersLanguage",
  ].forEach((fieldName) =>
    migrateOnePersonLanguageFromNameToCode(
      properties.getTextFieldOrUndefined(fieldName),
      languageFinder
    )
  );
  for (let i = 0; i < maxOtherLanguages; i++) {
    migrateOnePersonLanguageFromNameToCode(
      properties.getTextFieldOrUndefined("otherLanguage" + i),
      languageFinder
    );
  }
}
// Note: this migration happened a couple months before we switched to the new PersonLanguages structure
// public and static to make it easier to unit test
export function migrateOnePersonLanguageFromNameToCode(
  field: Field | undefined,
  languageFinder: LanguageFinder
) {
  try {
    if (!field) return;
    const nameOrCode = field.text;
    if (!nameOrCode) {
      return; // leave it alone
    }
    //In SayMore and lameta < 0.8.7, this was stored as a name, rather than a code.
    const possibleCode = languageFinder.findOne639_3CodeFromName(
      nameOrCode,
      undefined
    );

    if (possibleCode === "und") {
      // just leave it alone. If we don't recognize a language name, it's better to just not convert it than
      // to lose it.
      return;
    }
    let code;
    if (possibleCode === undefined && nameOrCode.length === 3) {
      code = nameOrCode;
    }
    // I don't suppose this would ever happen, but it would be unambiguous
    else if (
      possibleCode &&
      nameOrCode.length === 3 &&
      possibleCode === nameOrCode
    ) {
      code = nameOrCode;
    }
    // ambiguous, but a sampling suggests that 3 letter language names are always given a matching 3 letter code.
    else if (
      possibleCode &&
      nameOrCode.length === 3 &&
      possibleCode !== nameOrCode
    ) {
      // let's error on the side of having the correct code already. Could theoretically
      // give wrong code for some field filled out in a pre-release version of
      code = nameOrCode;
    }
    // otherwise, go with the name to code lookup
    else {
      code = possibleCode;
    }
    field.setValueFromString(code);

    //console.log(`Migrate person lang ${key}:${nameOrCode} --> ${code}`);
  } catch (err) {
    const ex = err as Error;
    ex.message = `${err} (migrateOnePersonLanguage: nameOrCode = '${
      field!.text
    }')`;
    throw ex;
  }
}
