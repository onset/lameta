import { NavigationTarget } from "../../navigation/NavigationTarget";
import { getCommonFieldDefinition, getFieldDefinition } from "../field/ConfiguredFieldDefinitions";
import { translateGenreToLanguage, translateRoleToLanguage } from "../../other/localization";
import { Project } from "./Project";

// Whether the user enters the translations of this field's values on the Translations
// tab of the Project tab (VocabularyTranslationsTab) instead of in the field itself.
// That tab has a section for genre and for role, shown when the archive configuration
// makes the field multilingual.
export function isTranslatedOnTranslationsTab(fieldKey: string): fieldKey is "genre" | "role" {
  const definition =
    fieldKey === "genre"
      ? getFieldDefinition("session", "genre")
      : fieldKey === "role"
        ? getCommonFieldDefinition("role")
        : undefined;
  return definition?.multilingual ?? false;
}

// Where the user enters the translations of `value` of the field: its row on the
// Translations tab. Undefined when the user types the field's translations into the
// field itself, so a problem about a missing translation goes to the field.
export function whereToTranslate(fieldKey: string, value: string): NavigationTarget | undefined {
  if (!value.trim() || !isTranslatedOnTranslationsTab(fieldKey)) return undefined;
  return { folderType: "project", vocabularyTranslation: { fieldKey, value: value.trim() } };
}

// The translation of a value of a field that isTranslatedOnTranslationsTab(), from
// lameta's built-in translations or the project's own
export function translateVocabularyValue(
  fieldKey: "genre" | "role",
  value: string,
  languageTag: string,
): string | undefined {
  const projectTranslations = Project.getVocabularyTranslations();
  return fieldKey === "genre"
    ? translateGenreToLanguage(value, languageTag, (v, tag) =>
        projectTranslations?.getGenreTranslation(v, tag),
      )
    : translateRoleToLanguage(value, languageTag, (v, tag) =>
        projectTranslations?.getRoleTranslation(v, tag),
      );
}
