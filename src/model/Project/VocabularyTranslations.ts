import * as fs from "fs-extra";
import * as Path from "path";
import { makeAutoObservable, runInAction } from "mobx";
import { NotifyError } from "../../components/Notify";

/**
 * Represents translations for a single vocabulary value.
 * The key in the translations object is the ISO 639-1/3 language code.
 */
export interface VocabularyValueTranslation {
  /** "project" = custom value added by user, "builtin" = from built-in vocab with missing translations */
  source: "project" | "builtin";
  /** Map of language code to translation string. Empty string means no translation yet. */
  translations: Record<string, string>;
}

/**
 * Represents all vocabulary values for a single field (e.g., "genre" or "role").
 * The key is the vocabulary value as stored in session/person files.
 */
export type FieldVocabularyTranslations = Record<
  string,
  VocabularyValueTranslation
>;

/**
 * The complete vocabulary translations file structure.
 */
export interface VocabularyTranslationsFile {
  version: number;
  fields: {
    genre?: FieldVocabularyTranslations;
    role?: FieldVocabularyTranslations;
  };
}

const VOCABULARY_TRANSLATIONS_FILENAME = "vocabulary-translations.json";
const CURRENT_VERSION = 1;

/**
 * Manages project-level vocabulary translations.
 * Provides translations for custom vocabulary values (genres, roles) that
 * aren't covered by the built-in translations in genres.csv and roles.csv.
 */
export class VocabularyTranslations {
  private projectDirectory: string;
  private data: VocabularyTranslationsFile;
  private dirty: boolean = false;
  
  // Revision counter to help MobX observers detect changes.
  // Incremented on every data update so observers can trigger re-renders.
  public revision: number = 0;

  constructor(projectDirectory: string) {
    this.projectDirectory = projectDirectory;
    this.data = this.createEmptyData();
    makeAutoObservable(this);
  }

  private createEmptyData(): VocabularyTranslationsFile {
    return {
      version: CURRENT_VERSION,
      fields: {}
    };
  }

  public get filePath(): string {
    return Path.join(this.projectDirectory, VOCABULARY_TRANSLATIONS_FILENAME);
  }

  /**
   * Load translations from the JSON file if it exists.
   */
  public load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(content) as VocabularyTranslationsFile;
        runInAction(() => {
          this.data = parsed;
          this.dirty = false;
        });
      }
    } catch (error) {
      console.error("Error loading vocabulary translations:", error);
      // Start fresh if file is corrupted
      runInAction(() => {
        this.data = this.createEmptyData();
      });
    }
  }

  /**
   * Save translations to the JSON file.
   */
  public save(): void {
    if (!this.dirty) return;

    try {
      const content = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(this.filePath, content, "utf8");
      runInAction(() => {
        this.dirty = false;
      });
    } catch (error) {
      console.error("Error saving vocabulary translations:", error);
      NotifyError("Failed to save vocabulary translations: " + error);
    }
  }

  /**
   * Get all genre translations.
   */
  public get genres(): FieldVocabularyTranslations {
    return this.data.fields.genre || {};
  }

  /**
   * Get all role translations.
   */
  public get roles(): FieldVocabularyTranslations {
    return this.data.fields.role || {};
  }

  /**
   * Check if a genre value exists in the translations.
   */
  public hasGenre(value: string): boolean {
    const genres = this.data.fields.genre;
    if (!genres) return false;
    const valueLower = value.toLowerCase();
    return Object.keys(genres).some((key) => key.toLowerCase() === valueLower);
  }

  /**
   * Check if a role value exists in the translations.
   */
  public hasRole(value: string): boolean {
    const roles = this.data.fields.role;
    if (!roles) return false;
    const valueLower = value.toLowerCase();
    return Object.keys(roles).some((key) => key.toLowerCase() === valueLower);
  }

  /**
   * Add or update a genre translation entry.
   */
  public setGenre(
    value: string,
    source: "project" | "builtin",
    translations: Record<string, string>
  ): void {
    runInAction(() => {
      if (!this.data.fields.genre) {
        this.data.fields.genre = {};
      }
      this.data.fields.genre[value] = { source, translations };
      this.dirty = true;
    });
  }

  /**
   * Add or update a role translation entry.
   */
  public setRole(
    value: string,
    source: "project" | "builtin",
    translations: Record<string, string>
  ): void {
    runInAction(() => {
      if (!this.data.fields.role) {
        this.data.fields.role = {};
      }
      this.data.fields.role[value] = { source, translations };
      this.dirty = true;
    });
  }

  /**
   * Update a single translation for a genre.
   * Lookup is case-insensitive to handle variations in how values are stored.
   */
  public updateGenreTranslation(
    value: string,
    languageCode: string,
    translation: string
  ): void {
    runInAction(() => {
      const genres = this.data.fields.genre;
      if (!genres) return;
      
      // Case-insensitive lookup
      const valueLower = value.toLowerCase();
      const key = Object.keys(genres).find(k => k.toLowerCase() === valueLower);
      if (!key) return;
      
      genres[key].translations[languageCode] = translation;
      this.dirty = true;
      this.revision++;
    });
  }

  /**
   * Update a single translation for a role.
   * Lookup is case-insensitive to handle variations in how values are stored.
   */
  public updateRoleTranslation(
    value: string,
    languageCode: string,
    translation: string
  ): void {
    runInAction(() => {
      const roles = this.data.fields.role;
      if (!roles) return;
      
      // Case-insensitive lookup
      const valueLower = value.toLowerCase();
      const key = Object.keys(roles).find(k => k.toLowerCase() === valueLower);
      if (!key) return;
      
      roles[key].translations[languageCode] = translation;
      this.dirty = true;
      this.revision++;
    });
  }

  /**
   * Get a genre translation for a specific language.
   * Returns undefined if not found.
   * Lookup is case-insensitive to handle variations in how values are stored.
   */
  public getGenreTranslation(
    value: string,
    languageCode: string
  ): string | undefined {
    const genres = this.data.fields.genre;
    if (!genres) return undefined;
    
    // Case-insensitive lookup
    const valueLower = value.toLowerCase();
    const key = Object.keys(genres).find(k => k.toLowerCase() === valueLower);
    if (!key) return undefined;
    
    const entry = genres[key];
    const translation = entry.translations[languageCode];
    return translation && translation.trim().length > 0
      ? translation
      : undefined;
  }

  /**
   * Get a role translation for a specific language.
   * Returns undefined if not found.
   * Lookup is case-insensitive to handle variations in how values are stored.
   */
  public getRoleTranslation(
    value: string,
    languageCode: string
  ): string | undefined {
    const roles = this.data.fields.role;
    if (!roles) return undefined;
    
    // Case-insensitive lookup
    const valueLower = value.toLowerCase();
    const key = Object.keys(roles).find(k => k.toLowerCase() === valueLower);
    if (!key) return undefined;
    
    const entry = roles[key];
    const translation = entry.translations[languageCode];
    return translation && translation.trim().length > 0
      ? translation
      : undefined;
  }

  /**
   * Check if any translations are missing for a genre value.
   * Returns true if any of the provided language codes have empty translations.
   * @param value The genre value to check
   * @param languageCodes The language codes to check
   * @param getBuiltInTranslation Optional function to check for built-in translations
   */
  public isGenreMissingTranslations(
    value: string,
    languageCodes: string[],
    getBuiltInTranslation?: (value: string, lang: string) => string | undefined
  ): boolean {
    const entry = this.data.fields.genre?.[value];
    if (!entry) return true;
    // Filter out English since the key itself is the English value
    const nonEnglishCodes = languageCodes.filter(
      (code) => code !== "en" && code !== "eng"
    );
    return nonEnglishCodes.some((code) => {
      const projectTranslation = entry.translations[code];
      if (projectTranslation && projectTranslation.trim().length > 0) return false;
      // Check built-in translation if provided
      if (getBuiltInTranslation) {
        const builtInTranslation = getBuiltInTranslation(value, code);
        if (builtInTranslation && builtInTranslation.trim().length > 0) return false;
      }
      return true;
    });
  }

  /**
   * Check if any translations are missing for a role value.
   * Returns true if any of the provided language codes have empty translations.
   * @param value The role value to check
   * @param languageCodes The language codes to check
   * @param getBuiltInTranslation Optional function to check for built-in translations
   */
  public isRoleMissingTranslations(
    value: string,
    languageCodes: string[],
    getBuiltInTranslation?: (value: string, lang: string) => string | undefined
  ): boolean {
    const entry = this.data.fields.role?.[value];
    if (!entry) return true;
    // Filter out English since the key itself is the English value
    const nonEnglishCodes = languageCodes.filter(
      (code) => code !== "en" && code !== "eng"
    );
    return nonEnglishCodes.some((code) => {
      const projectTranslation = entry.translations[code];
      if (projectTranslation && projectTranslation.trim().length > 0) return false;
      // Check built-in translation if provided
      if (getBuiltInTranslation) {
        const builtInTranslation = getBuiltInTranslation(value, code);
        if (builtInTranslation && builtInTranslation.trim().length > 0) return false;
      }
      return true;
    });
  }

  /**
   * Get count of genres with missing translations.
   * @param languageCodes The language codes to check
   * @param getBuiltInTranslation Optional function to check for built-in translations
   */
  public getGenreMissingCount(
    languageCodes: string[],
    getBuiltInTranslation?: (value: string, lang: string) => string | undefined
  ): number {
    const genres = this.data.fields.genre || {};
    return Object.keys(genres).filter((value) =>
      this.isGenreMissingTranslations(value, languageCodes, getBuiltInTranslation)
    ).length;
  }

  /**
   * Get count of roles with missing translations.
   * @param languageCodes The language codes to check
   * @param getBuiltInTranslation Optional function to check for built-in translations
   */
  public getRoleMissingCount(
    languageCodes: string[],
    getBuiltInTranslation?: (value: string, lang: string) => string | undefined
  ): number {
    const roles = this.data.fields.role || {};
    return Object.keys(roles).filter((value) =>
      this.isRoleMissingTranslations(value, languageCodes, getBuiltInTranslation)
    ).length;
  }

  /**
   * Ensure a genre entry exists for the given value with placeholders for all languages.
   * If the entry already exists, adds any missing language placeholders.
   * English is excluded since the key itself is the English value.
   */
  public ensureGenreEntry(
    value: string,
    source: "project" | "builtin",
    languageCodes: string[]
  ): void {
    // Filter out English since the key itself is the English value
    const nonEnglishCodes = languageCodes.filter(
      (code) => code !== "en" && code !== "eng"
    );

    runInAction(() => {
      if (!this.data.fields.genre) {
        this.data.fields.genre = {};
      }

      const existing = this.data.fields.genre[value];
      if (existing) {
        // Add any missing language placeholders
        for (const code of nonEnglishCodes) {
          if (existing.translations[code] === undefined) {
            existing.translations[code] = "";
            this.dirty = true;
          }
        }
      } else {
        // Create new entry with all language placeholders
        const translations: Record<string, string> = {};
        for (const code of nonEnglishCodes) {
          translations[code] = "";
        }
        this.data.fields.genre[value] = { source, translations };
        this.dirty = true;
      }
    });
  }

  /**
   * Ensure a role entry exists for the given value with placeholders for all languages.
   * If the entry already exists, adds any missing language placeholders.
   * English is excluded since the key itself is the English value.
   */
  public ensureRoleEntry(
    value: string,
    source: "project" | "builtin",
    languageCodes: string[]
  ): void {
    // Filter out English since the key itself is the English value
    const nonEnglishCodes = languageCodes.filter(
      (code) => code !== "en" && code !== "eng"
    );

    runInAction(() => {
      if (!this.data.fields.role) {
        this.data.fields.role = {};
      }

      const existing = this.data.fields.role[value];
      if (existing) {
        // Add any missing language placeholders
        for (const code of nonEnglishCodes) {
          if (existing.translations[code] === undefined) {
            existing.translations[code] = "";
            this.dirty = true;
          }
        }
      } else {
        // Create new entry with all language placeholders
        const translations: Record<string, string> = {};
        for (const code of nonEnglishCodes) {
          translations[code] = "";
        }
        this.data.fields.role[value] = { source, translations };
        this.dirty = true;
      }
    });
  }

  /**
   * Check if there are unsaved changes.
   */
  public get isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Get all field data for display in UI.
   */
  public getAllFields(): VocabularyTranslationsFile["fields"] {
    return this.data.fields;
  }
}
