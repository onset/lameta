// lameta stores a list of languages in one field as "code:Name" pairs joined by semicolons,
// e.g. "eng;qab-x-tolo:Tolo". The semicolon comes from the participants field, which has used
// it for years. The name is carried alongside the tag because a language the user invented is
// not in the language index, so there is nowhere else to look it up.

import { isPrivateUseTag } from "./privateUseLanguages";

export interface ILanguageCodeAndName {
  code: string;
  name: string | undefined;
}

/**
 * Parse one language entry, which may be in any of these forms:
 * - "code : Name" (legacy format, e.g., "pta : Guarani")
 * - "code:Name" (no spaces, e.g., "qab-x-tolo:Tolo")
 * - "code" (plain code, e.g., "fra")
 *
 * Returns { code, name } where name is undefined if not present in the string.
 */
export function parseLanguageCodeAndName(
  languageString: string
): ILanguageCodeAndName {
  const trimmed = languageString.trim();

  // Check for "code : Name" or "code:Name" format
  // Use first colon to split, in case the name contains colons
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex > 0) {
    const code = trimmed.substring(0, colonIndex).trim();
    const name = trimmed.substring(colonIndex + 1).trim();
    return { code, name: name.length > 0 ? name : undefined };
  }

  // Plain code format
  return { code: trimmed, name: undefined };
}

/** Split the whole text of a language field into its entries. */
export function splitLanguageFieldValue(
  fieldText: string
): ILanguageCodeAndName[] {
  return (fieldText || "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(parseLanguageCodeAndName);
}

/**
 * Write the entries of a language field back into the field's text.
 *
 * The name is kept when the file already carried one, whatever the code, and for a language
 * in the qaa..qtz range, because nothing outside the file knows the name of a language that
 * ISO 639-3 does not list. Dropping the name here used to lose it whenever the user dragged
 * the pills into a new order.
 */
export function serializeLanguageFieldValue(
  choices: Array<{ value: string; label: string; hadName?: boolean }>
): string {
  return choices
    .map((o) => {
      const alreadyHasName = o.value.indexOf(":") > 0;
      const needsName =
        !alreadyHasName &&
        (o.hadName || isPrivateUseTag(o.value)) &&
        o.label &&
        o.label !== o.value;
      return needsName ? `${o.value}:${o.label}` : o.value;
    })
    .join(";");
}
