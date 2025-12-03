// Languages for which we enable spell checking in Electron
// These must be valid Chromium spell checker language codes
// See: https://www.electronjs.org/docs/latest/api/session#sessetspellcheckerlanguageslanguages

// NOTE: as of this writing, chromium ignores the @lang attribute so what you seem to get is that the same set of dictionaries are used on all fields, regardless of the language of the field.
export const spellCheckLanguages = [
  "en-US",
  "en-GB",
  "es",
  "fr",
  "de",
  "pt",
  "id"
];

// Map from ISO 639-3 codes (used in lameta) to spell checker codes
// This allows us to check if a language tag has spell checking support
const iso639_3ToSpellCheck: Record<string, string> = {
  eng: "en-US",
  en: "en-US",
  spa: "es",
  es: "es",
  fra: "fr",
  fr: "fr",
  deu: "de",
  de: "de",
  por: "pt",
  pt: "pt",
  ind: "id",
  id: "id"
};

// Check if a language tag (ISO 639-1, 639-3, or BCP 47) has spell checking support
export function hasSpellCheckSupport(languageTag: string | undefined): boolean {
  if (!languageTag) return false;
  const normalized = languageTag.toLowerCase().trim();

  // Direct match in our mapping
  if (iso639_3ToSpellCheck[normalized]) return true;

  // Check if it starts with a supported 2-letter code (e.g., "en-AU" -> "en")
  const twoLetter = normalized.substring(0, 2);
  if (["en", "es", "fr", "de", "pt", "id"].includes(twoLetter)) return true;

  return false;
}
