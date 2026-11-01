import type { ProblemSeverity } from "./problemSeverity";

// lameta's checks of a whole project (see lametaChecks.ts) are turned on by name in the
// `checks` of a configuration's settings.json5, each with its severity and whatever
// settings it needs:
//
//   checks: {
//     sessionWithoutFiles: { severity: "error" },
//     fileNameLength: { severity: "error", maxLength: 20 },
//     contributorWithoutConsent: false, // turns off a check that lameta's list turns on
//   }
//
// Every configuration starts from the checks in archive-configurations/lameta/settings.json5.
// Its own `checks` add to that list: a check that it names gets the settings it gives,
// over those of lameta's list, and `false` turns a check off.

// A check's settings: its severity, then what it needs, by the names in kChecks
export type CheckSettings = { severity: ProblemSeverity } & Record<string, unknown>;

// The `checks` of a settings.json5
export type ChecksOfConfiguration = Record<string, Partial<CheckSettings> | false>;

type SettingKind = "string[]" | "number[]" | "number" | "pattern" | "fileKinds";

interface ICheckDefinition {
  // what each setting must be; every setting is required
  settings: Record<string, SettingKind>;
  // A check that no configuration can turn off. It still takes its severity from the
  // configuration's list when that names it.
  alwaysOn?: { severity: ProblemSeverity };
}

// Every check that a configuration can name
export const kChecks: Record<string, ICheckDefinition> = {
  // Export leaves out a session or person whose metadata lameta could not read, and
  // saves nothing more to it, so the user must hear about it whatever the archive
  metadataUnreadable: { settings: {}, alwaysOn: { severity: "error" } },
  fileNameNotAllowed: { settings: {} },
  sessionWithoutFiles: { settings: {} },
  sessionWithoutContributors: { settings: {} },
  contributorWithoutPerson: { settings: {} },
  contributorWithoutConsent: { settings: {} },
  languageNameVariations: { settings: {} },
  sessionContributorsWithoutFullName: { settings: {} },
  // the file extensions, without the ".", that are allowed for media files and for
  // other files
  fileExtension: { settings: { mediaExtensions: "string[]", writtenExtensions: "string[]" } },
  // the most characters that a file name may have before its first "."
  fileNameLength: { settings: { maxLength: "number" } },
  // a regular expression that the part of a file name before its first "." must match
  fileNameCharacters: { settings: { pattern: "pattern" } },
  // the ids of sessions whose files need not contain the id
  fileNameContainsSessionId: { settings: { exceptSessions: "string[]" } },
  // which files need a _YYYYMMDD date stamp before their extension: "media", "written";
  // and the ids of sessions whose files need none
  fileNameDateStamp: { settings: { appliesTo: "fileKinds", exceptSessions: "string[]" } },
  // The sizes, in GB, that a file may not reach. A file is reported with the largest
  // one that it reaches.
  fileSize: { settings: { limitsInGigabytes: "number[]" } },
  // a regular expression that the project's name must match, and its most characters
  projectName: { settings: { pattern: "pattern", maxLength: "number" } },
  // the genres that the archive lists, in English; case does not matter
  genreInList: { settings: { genres: "string[]" } },
  // An MP3 next to a WAV of the same name, apart from a _YYYYMMDD date stamp
  mp3WithWavOfSameName: { settings: {} },
  // A FLExText file next to an EAF of the same name, apart from a date stamp, and next
  // to other EAF files, which only the depositor knows whether are of the same text
  flextextWithEafOfSameName: { settings: {} },
  flextextWithOtherEaf: { settings: {} },
  // the resource types that the IMDI may give a file, such as "Audio" or "ELAN"
  resourceType: { settings: { allowedTypes: "string[]" } },
  // a contributor with no role, or one whose role the IMDI has without English, in a
  // wrong "English / Translation" form, or with no translation
  contributorWithoutRole: { settings: {} },
  roleWithoutEnglish: { settings: {} },
  roleFormat: { settings: {} },
  roleTranslation: { settings: {} },
  // a genre with no translation
  genreTranslation: { settings: {} },
  // the access levels whose access explanation needs a translation, such as ["S"]
  accessDescriptionTranslation: { settings: { accessLevels: "string[]" } },
};

// lameta's list of checks with a configuration's own `checks` over it
export function mergeChecks(
  base: ChecksOfConfiguration | undefined,
  overrides: ChecksOfConfiguration | undefined,
): ChecksOfConfiguration {
  const merged: ChecksOfConfiguration = { ...base };
  for (const [id, settings] of Object.entries(overrides ?? {})) {
    const before = merged[id];
    // anything else, such as null, is kept so that problemsWithChecks() reports it
    merged[id] =
      typeof settings === "object" && settings !== null ? { ...before, ...settings } : settings;
  }
  return merged;
}

// What is wrong with a configuration's checks, after merging: names that are not
// checks, a missing or wrong severity, and settings that are missing or of the wrong
// kind. Empty when nothing is.
export function problemsWithChecks(checks: ChecksOfConfiguration): string[] {
  const problems: string[] = [];
  for (const [id, settings] of Object.entries(checks)) {
    const definition = kChecks[id];
    if (!definition) {
      problems.push(`"${id}" is not one of lameta's checks.`);
      continue;
    }
    if (settings === false) {
      if (definition.alwaysOn) problems.push(`"${id}" cannot be turned off.`);
      continue;
    }
    if (typeof settings !== "object" || settings === null) {
      problems.push(`"${id}" must be false or an object of settings.`);
      continue;
    }
    if (settings.severity !== "error" && settings.severity !== "warning")
      problems.push(`"${id}" needs a severity of "error" or "warning".`);
    for (const [name, value] of Object.entries(settings)) {
      if (name === "severity") continue;
      const kind = definition.settings[name];
      if (!kind) problems.push(`"${id}" has no setting "${name}".`);
      else if (!isOfKind(value, kind))
        problems.push(`"${id}" needs "${name}" to be ${describeKind(kind)}.`);
    }
    for (const name of Object.keys(definition.settings)) {
      if (!(name in settings)) problems.push(`"${id}" needs the setting "${name}".`);
    }
  }
  return problems;
}

function isOfKind(value: unknown, kind: SettingKind): boolean {
  switch (kind) {
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "string[]":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
    case "number[]":
      return Array.isArray(value) && value.every((v) => typeof v === "number");
    case "fileKinds":
      return Array.isArray(value) && value.every((v) => v === "media" || v === "written");
    case "pattern":
      if (typeof value !== "string") return false;
      try {
        new RegExp(value);
        return true;
      } catch {
        return false;
      }
  }
}

function describeKind(kind: SettingKind): string {
  switch (kind) {
    case "number":
      return "a number";
    case "string[]":
      return "a list of strings";
    case "number[]":
      return "a list of numbers";
    case "fileKinds":
      return 'a list of "media" and "written"';
    case "pattern":
      return "a regular expression";
  }
}

// The checks that are on, with their settings. A check that is always on is in the
// list even when the configuration leaves it out.
export function enabledChecks(
  checks: ChecksOfConfiguration | undefined,
): Map<string, CheckSettings> {
  const key = checks ?? kNoChecks;
  let enabled = enabledByChecks.get(key);
  if (!enabled) {
    enabled = findEnabledChecks(checks);
    enabledByChecks.set(key, enabled);
  }
  return enabled;
}
// the checks run after each edit, so work this out once for each configuration
const kNoChecks: ChecksOfConfiguration = {};
const enabledByChecks = new WeakMap<ChecksOfConfiguration, Map<string, CheckSettings>>();

function findEnabledChecks(checks: ChecksOfConfiguration | undefined): Map<string, CheckSettings> {
  const enabled = new Map<string, CheckSettings>();
  for (const [id, definition] of Object.entries(kChecks)) {
    if (definition.alwaysOn) enabled.set(id, { ...definition.alwaysOn });
  }
  for (const [id, settings] of Object.entries(checks ?? {})) {
    const definition = kChecks[id];
    // problemsWithChecks() reports these; a check that cannot run is left out
    if (!definition || settings === false || problemsWithChecks({ [id]: settings }).length)
      continue;
    enabled.set(id, settings as CheckSettings);
  }
  return enabled;
}
