import { Project } from "../model/Project/Project";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { applyCapitalization } from "../model/field/capitalization";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { sentenceCase } from "../other/case";

export interface IVocabularyElementValue {
  text: string;
  // e.g. "ISO639-3:eng"; undefined for an element without a LanguageId
  languageId?: string;
}

// The elements that the IMDI export writes for a value of a vocabulary field, such as a
// genre or a role. The ELAR schema has one for each metadata language that has a
// translation, with its LanguageId, or the English alone when none has. Other schemas
// have the English alone.
export function vocabularyElementValues(
  englishValue: string,
  translateFn: (value: string, lang: string) => string | undefined,
  translationKey: string,
  // the field whose capitalization, if it has one, replaces sentence case
  definition: FieldDefinition | undefined,
  // the ISO 639-3 code that export writes for a language tag
  iso639_3: (tag: string) => string,
): IVocabularyElementValue[] {
  const inCase = (value: string, sentenceCaseIt: boolean) =>
    definition?.capitalization
      ? applyCapitalization(definition, value)
      : sentenceCaseIt
        ? sentenceCase(value)
        : value;
  if (!englishValue || englishValue.trim().length === 0) return [{ text: "" }];
  // Apply sentenceCase to the English only if it starts with a lowercase letter (e.g.,
  // user typed "myth" should become "Myth", but "MixedCase" should stay as-is)
  const english = () => [
    {
      text: inCase(
        englishValue,
        englishValue.length > 0 && englishValue[0] === englishValue[0].toLowerCase(),
      ),
    },
  ];
  if (GetOtherConfigurationSettings().imdiSchema !== "IMDI_3.0_elar.xsd") return english();
  const values: IVocabularyElementValue[] = [];
  for (const slot of Project.getMetadataLanguageSlots()) {
    const translation = translateFn(translationKey, slot.tag);
    if (translation) {
      // Normalize to sentence case for consistent IMDI output
      // (ELAR prefers "Careful speech speaker" not "Careful Speech Speaker")
      values.push({
        text: inCase(translation, true),
        // Always use ISO639-3 (3-letter) codes - archives can't handle 2-letter ISO639-1 codes
        languageId: "ISO639-3:" + iso639_3(slot.tag),
      });
    }
  }
  return values.length > 0 ? values : english();
}

// The English of a role, as the IMDI export writes it
export function roleForExport(role: string): string {
  let roleOutput = "Unspecified";
  if (role && role.length > 0) {
    // replace underscores with spaces
    roleOutput = role.replace(/_/g, " ");
    // upper case the first letter of the first word only (per ELAR's Hanna)
    roleOutput = roleOutput.charAt(0).toUpperCase() + roleOutput.slice(1);
  }
  return roleOutput;
}
