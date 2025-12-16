import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { collectExportWarning } from "./ExportWarningCollector";
import {
  translateGenreToLanguage,
  translateRoleToLanguage
} from "../other/localization";

export type TranslatorFn = (value: string, lang: string) => string | undefined;

/**
 * Handles vocabulary translation (genre, role, etc.) for IMDI export.
 * Caches translator functions for efficiency since they're called repeatedly
 * during export.
 */
export class ImdiVocabularyTranslator {
  private project: Project | undefined;
  private cachedGenreTranslator: TranslatorFn | undefined;
  private cachedRoleTranslator: TranslatorFn | undefined;

  constructor(project?: Project) {
    this.project = project;
  }

  /**
   * Gets a genre translation function that includes project-level translations.
   * The translator is cached for the lifetime of this instance.
   */
  getGenreTranslator(): TranslatorFn {
    if (!this.cachedGenreTranslator) {
      this.cachedGenreTranslator = (
        value: string,
        lang: string
      ): string | undefined => {
        const projectTranslation =
          this.project?.vocabularyTranslations?.getGenreTranslation(
            value,
            lang
          );
        return translateGenreToLanguage(value, lang, () => projectTranslation);
      };
    }
    return this.cachedGenreTranslator;
  }

  /**
   * Gets a role translation function that includes project-level translations.
   * The translator is cached for the lifetime of this instance.
   */
  getRoleTranslator(): TranslatorFn {
    if (!this.cachedRoleTranslator) {
      this.cachedRoleTranslator = (
        value: string,
        lang: string
      ): string | undefined => {
        const projectTranslation =
          this.project?.vocabularyTranslations?.getRoleTranslation(value, lang);
        return translateRoleToLanguage(value, lang, () => projectTranslation);
      };
    }
    return this.cachedRoleTranslator;
  }

  /**
   * Check for missing vocabulary translations and collect warnings.
   * Should be called at the start of session/corpus generation.
   */
  collectTranslationWarnings(session: Session): void {
    const metadataSlots = Project.getMetadataLanguageSlots();
    if (metadataSlots.length <= 1) return; // No need for translations if only one language

    // Check genre translation
    const genre = session.properties.getTextStringOrEmpty("genre");
    if (genre && genre.trim().length > 0) {
      const genreTranslator = this.getGenreTranslator();
      for (const slot of metadataSlots) {
        const translation = genreTranslator(genre, slot.tag);
        if (!translation) {
          const displayName = slot.autonym || slot.name || slot.label;
          collectExportWarning(
            `Missing ${displayName} translation for genre "${genre}" in session "${session.displayName}". ` +
              `Add translation in Project > Vocabulary Translations.`
          );
        }
      }
    }

    // Check role translations for all contributions
    const contributions = session.getAllContributionsToAllFiles();
    for (const contribution of contributions) {
      const role = contribution.role;
      if (role && role.trim().length > 0) {
        const roleTranslator = this.getRoleTranslator();
        for (const slot of metadataSlots) {
          const translation = roleTranslator(role, slot.tag);
          if (!translation) {
            const displayName = slot.autonym || slot.name || slot.label;
            collectExportWarning(
              `Missing ${displayName} translation for role "${role}" in session "${session.displayName}". ` +
                `Add translation in Project > Vocabulary Translations.`
            );
          }
        }
      }
    }
  }
}
