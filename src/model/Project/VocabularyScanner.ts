/**
 * VocabularyScanner - Scans a project to find vocabulary values needing translations.
 *
 * This module identifies genres and roles used in a project that need translations
 * for the project's metadata languages. It distinguishes between:
 * - Custom values (user-defined, not in built-in lists) - always need translations
 * - Built-in values (from genres.json or OLAC roles) - only flagged if missing
 *   translations for the project's non-English metadata languages
 *
 * The scan results can be used to populate VocabularyTranslations with entries
 * that users need to provide translations for.
 */

import { Project } from "./Project";
import { Session } from "./Session/Session";
import { VocabularyTranslations } from "./VocabularyTranslations";
import genresJSON from "./Session/genres.json";
import { loadOLACRoles } from "./AuthorityLists/AuthorityLists";
import { translateGenreToLanguage, translateRoleToLanguage } from "../../other/localization";

// Built-in genre IDs from genres.json
const builtInGenreIds = new Set(genresJSON.map((g: any) => g.id.toLowerCase()));
const builtInGenreLabels = new Set(
  genresJSON.map((g: any) => g.label.toLowerCase())
);

/**
 * Genres that are hardcoded in export code (e.g., ImdiBundler).
 * These need to always be included in vocabulary scanning so users
 * can provide translations for them, even if they don't manually
 * create sessions with these genres.
 */
export const HARDCODED_EXPORT_GENRES = ["Consent", "Collection description"];

/**
 * Check if a genre value is built-in (exists in genres.json).
 * Checks both ID and label since users may enter either.
 */
export function isBuiltInGenre(value: string): boolean {
  const lower = value.toLowerCase();
  return builtInGenreIds.has(lower) || builtInGenreLabels.has(lower);
}

/**
 * Check if a role value is built-in (exists in OLAC roles).
 */
export function isBuiltInRole(value: string): boolean {
  const olacRoles = loadOLACRoles();
  const lower = value.toLowerCase();
  return olacRoles.some(
    (r) => r.id.toLowerCase() === lower || r.label.toLowerCase() === lower
  );
}

/**
 * Check if a built-in genre is missing translations for any of the given languages.
 * Returns true if at least one language has no translation in genres.csv.
 */
export function isBuiltInGenreMissingTranslations(
  value: string,
  languageCodes: string[]
): boolean {
  // Skip English since it's always available
  const nonEnglishCodes = languageCodes.filter(
    (code) => code !== "en" && code !== "eng"
  );
  if (nonEnglishCodes.length === 0) return false;

  return nonEnglishCodes.some((code) => {
    const translation = translateGenreToLanguage(value, code);
    return !translation || translation.trim().length === 0;
  });
}

/**
 * Check if a built-in role is missing translations for any of the given languages.
 * Returns true if at least one language has no translation in roles.csv.
 */
export function isBuiltInRoleMissingTranslations(
  value: string,
  languageCodes: string[]
): boolean {
  // Skip English since it's always available
  const nonEnglishCodes = languageCodes.filter(
    (code) => code !== "en" && code !== "eng"
  );
  if (nonEnglishCodes.length === 0) return false;

  return nonEnglishCodes.some((code) => {
    const translation = translateRoleToLanguage(value, code);
    return !translation || translation.trim().length === 0;
  });
}

/**
 * Scan result containing found vocabulary values.
 */
export interface ScanResult {
  /** Custom genre values (not in built-in list) */
  customGenres: Set<string>;
  /** Built-in genre values that are missing translations */
  builtInGenresMissingTranslations: Set<string>;
  /** Custom role values (not in OLAC list) */
  customRoles: Set<string>;
  /** Built-in role values that are missing translations */
  builtInRolesMissingTranslations: Set<string>;
  /** Total sessions scanned */
  sessionsScanned: number;
  /** Total people scanned */
  peopleScanned: number;
}

/**
 * Scan a project to find all vocabulary values that need translations.
 * This scans all sessions and people to find:
 * - Custom genre values (user-added, not in genres.json)
 * - Built-in genre values that lack translations for the project's metadata languages
 * - Custom role values (user-added, not in OLAC roles)
 * - Built-in role values that lack translations for the project's metadata languages
 *
 * @param project The project to scan
 * @param languageCodes The metadata language codes to check for missing translations
 * @param progressCallback Optional callback for progress updates (0-100)
 */
export async function scanProjectForVocabulary(
  project: Project,
  languageCodes: string[],
  progressCallback?: (progress: number, message: string) => void
): Promise<ScanResult> {
  const result: ScanResult = {
    customGenres: new Set(),
    builtInGenresMissingTranslations: new Set(),
    customRoles: new Set(),
    builtInRolesMissingTranslations: new Set(),
    sessionsScanned: 0,
    peopleScanned: 0
  };

  const sessions = project.sessions.items as Session[];
  const people = project.persons.items;
  const totalItems = sessions.length + people.length;
  let processedItems = 0;

  // Scan sessions for genres and roles
  for (const session of sessions) {
    if (progressCallback) {
      const progress = Math.round((processedItems / totalItems) * 100);
      progressCallback(progress, `Scanning session ${session.displayName}...`);
    }

    // Get genre value
    const genre = session.properties.getTextStringOrEmpty("genre");
    if (genre && genre.trim().length > 0) {
      processGenreValue(genre.trim(), languageCodes, result);
    }

    // Get roles from contributions
    const contributions = session.getAllContributionsToAllFiles();
    for (const contribution of contributions) {
      if (contribution.role && contribution.role.trim().length > 0) {
        processRoleValue(contribution.role.trim(), languageCodes, result);
      }
    }

    result.sessionsScanned++;
    processedItems++;

    // Yield to UI
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Scan people for roles in their contributions (if stored at person level)
  // Note: Currently roles are stored at session/file level, but we scan people
  // for completeness and future compatibility
  for (const person of people) {
    if (progressCallback) {
      const progress = Math.round((processedItems / totalItems) * 100);
      progressCallback(progress, `Scanning person ${person.displayName}...`);
    }

    result.peopleScanned++;
    processedItems++;

    // Yield to UI
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Always include hardcoded export genres (e.g., "Consent" for consent bundles)
  // so users can provide translations for them even if they haven't manually
  // created sessions with these genres
  for (const genre of HARDCODED_EXPORT_GENRES) {
    processGenreValue(genre, languageCodes, result);
  }

  if (progressCallback) {
    progressCallback(100, "Scan complete");
  }

  return result;
}

/**
 * Process a genre value and add it to the appropriate set in the result.
 */
function processGenreValue(
  genre: string,
  languageCodes: string[],
  result: ScanResult
): void {
  if (isBuiltInGenre(genre)) {
    // Check if built-in genre is missing translations
    if (isBuiltInGenreMissingTranslations(genre, languageCodes)) {
      result.builtInGenresMissingTranslations.add(genre);
    }
  } else {
    // Custom genre - always needs translations
    result.customGenres.add(genre);
  }
}

/**
 * Process a role value and add it to the appropriate set in the result.
 */
function processRoleValue(
  role: string,
  languageCodes: string[],
  result: ScanResult
): void {
  if (isBuiltInRole(role)) {
    // Check if built-in role is missing translations
    if (isBuiltInRoleMissingTranslations(role, languageCodes)) {
      result.builtInRolesMissingTranslations.add(role);
    }
  } else {
    // Custom role - always needs translations
    result.customRoles.add(role);
  }
}

/**
 * Update the VocabularyTranslations with scan results.
 * Adds new entries and ensures all language placeholders exist.
 */
export function updateTranslationsFromScan(
  translations: VocabularyTranslations,
  scanResult: ScanResult,
  languageCodes: string[]
): void {
  // Add custom genres
  for (const genre of scanResult.customGenres) {
    translations.ensureGenreEntry(genre, "project", languageCodes);
  }

  // Add built-in genres with missing translations
  for (const genre of scanResult.builtInGenresMissingTranslations) {
    translations.ensureGenreEntry(genre, "builtin", languageCodes);
  }

  // Add custom roles
  for (const role of scanResult.customRoles) {
    translations.ensureRoleEntry(role, "project", languageCodes);
  }

  // Add built-in roles with missing translations
  for (const role of scanResult.builtInRolesMissingTranslations) {
    translations.ensureRoleEntry(role, "builtin", languageCodes);
  }

  // Save changes
  translations.save();
}

/**
 * Get the English label for a genre value.
 * For built-in genres, returns the proper label from genres.json.
 * For custom genres, returns the value as-is.
 */
export function getGenreEnglishLabel(value: string): string {
  const lower = value.toLowerCase();
  const builtIn = genresJSON.find(
    (g: any) => g.id.toLowerCase() === lower || g.label.toLowerCase() === lower
  );
  return builtIn ? builtIn.label : value;
}

/**
 * Get the English label for a role value.
 * For built-in roles, returns the proper label from OLAC.
 * For custom roles, returns the value as-is.
 */
export function getRoleEnglishLabel(value: string): string {
  const olacRoles = loadOLACRoles();
  const lower = value.toLowerCase();
  const builtIn = olacRoles.find(
    (r) => r.id.toLowerCase() === lower || r.label.toLowerCase() === lower
  );
  return builtIn ? builtIn.label : value;
}
