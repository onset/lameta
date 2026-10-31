import { Project } from "../model/Project/Project";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";
import { ILanguageCodeAndName } from "../languageFinder/languageTagFieldValue";
import { getPrimarySubtag } from "../languageFinder/privateUseLanguages";

// The codes and names that export writes for languages. The IMDI export and the check for one
// language code with different names in different sessions (lametaChecks.ts) both use
// these, so that the check sees the names that the export writes.

// SayMore stored languages as names, and a name that lameta cannot find stays as it is, e.g.
// "Aka" or "Lingala (un peu)". Lower-cased, "Aka" would be the code of a different language
// (Akan), so only a value whose primary subtag is two or three letters, all lower case or all
// upper case ("EN"), is a tag. What follows the primary subtag is not checked: lameta 3.0.x
// minted private-use tags such as "qaa-x-Kürbinian".
export function isLanguageName(value: string | undefined): boolean {
  const trimmed = (value || "").trim();
  return trimmed.length > 0 && !/^([a-z]{2,3}|[A-Z]{2,3})(-.*)?$/.test(trimmed);
}

/**
 * The ISO 639-3 code to write for one of the project's languages. `privateUseCodes` is
 * Project.privateUseCodes. A tag absent from it, such as one hand-edited into a session file,
 * falls back to its own primary subtag, so nothing ever reaches IMDI with subtags still
 * attached.
 */
export function iso639_3ForExport(
  tag: string,
  privateUseCodes: Map<string, string>,
  project: Project | undefined,
): string {
  if (isLanguageName(tag)) return tag.trim();
  // Lowercase, because a project written by 3.0.x holds "qaa-x-MyLanguage" while a session
  // that used the picker holds the same tag in lower case. A hand-edited file can hold a
  // language element with no tag at all, so guard against undefined.
  const key = (tag || "").trim().toLowerCase();
  const resolved = privateUseCodes.get(key);
  if (resolved) return resolved;
  const finder = staticLanguageFinder || project?.languageFinder;
  return finder ? finder.getIso639_3Code(key) : getPrimarySubtag(key);
}

/**
 * The name to write for a language. Export must never write a tag such as "qaa-x-Tolo" as a
 * name. The project's own fields are the only place that holds the name of a language that
 * ISO 639-3 does not list, so look there first, ignoring case.
 */
export function languageNameForExport(tag: string, project: Project | undefined): string {
  const key = (tag || "").trim().toLowerCase();
  if (key.length === 0) return "";
  if (isLanguageName(tag)) return tag.trim();
  const fromProject = project
    ?.getAllProjectLanguages()
    .find((l) => (l.iso639_3 || "").toLowerCase() === key);
  if (fromProject?.englishName && fromProject.englishName !== key) return fromProject.englishName;
  const finder = project?.languageFinder || staticLanguageFinder;
  const name = finder?.findOneLanguageNameFromCode_Or_ReturnCode(key) ?? key;
  if (name.toLowerCase() !== key) return name;
  // Nothing knows this language. Its own tag carries the name after "-x-".
  const afterX = (tag || "").trim().split(/-x-/i)[1];
  return afterX || name;
}

/**
 * The name to write for one entry of a language field, such as "etr" or "etr:Edolo": the
 * name that the entry carries, if it has one. Otherwise the name is looked up, through
 * languageNameForExport rather than the finder alone, because for a tag that nothing knows,
 * the finder returns the tag itself.
 */
export function languageEntryNameForExport(
  entry: ILanguageCodeAndName,
  project: Project | undefined,
): string {
  return entry.name || languageNameForExport(entry.code, project);
}
