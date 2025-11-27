import { staticLanguageFinder } from "../../languageFinder/LanguageFinder";

export interface LanguageEntity {
  "@id": string;
  "@type": "Language";
  code: string;
  name: string;
  description?: string;
}

/**
 * Manages language entities for RO-Crate export, ensuring each ISO 639-3 code
 * generates exactly one node and handles deduplication.
 */
export class RoCrateLanguages {
  private languageMap = new Map<string, LanguageEntity>();
  private usageMap = new Map<string, Set<string>>(); // Track which entities use which languages

  /**
   * Get or create a language entity for the given ISO code
   */
  getLanguageEntity(code: string): LanguageEntity {
    const normalizedCode = code.trim().toLowerCase();

    if (this.languageMap.has(normalizedCode)) {
      return this.languageMap.get(normalizedCode)!;
    }

    // Create new language entity
    const name = staticLanguageFinder
      ? staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(code)
      : `Language ${code}`;

    // Existing precedent: LDAC examples and other RO-Crate guidance frequently reference Lexvo for language resources,
    // so using it keeps us in line with what validators and downstream tooling expect.
    const uriForUndetermined = "https://lexvo.org/id/iso639-3/und";

    const entity: LanguageEntity = {
      "@id":
        normalizedCode === "und"
          ? uriForUndetermined
          : `#language_${normalizedCode}`,
      "@type": "Language",
      code: normalizedCode,
      name: name
    };

    // Lexvo's undetermined identifier is globally resolvable; local placeholders such as
    // #language_und fail validation. Keep other languages as fragments but use the Lexvo URI
    // when the metadata only indicates an undetermined language.
    if (normalizedCode === "und") {
      entity.description =
        "Language marked as undetermined because no working language was specified in lameta";
      entity.name = "Undetermined";
    }

    this.languageMap.set(normalizedCode, entity);
    return entity;
  }

  /**
   * Get a reference to a language entity
   */
  getLanguageReference(code: string): { "@id": string } {
    const entity = this.getLanguageEntity(code);
    return { "@id": entity["@id"] };
  }

  /**
   * Track usage of a language by an entity
   */
  trackUsage(languageCode: string, entityId: string): void {
    const normalizedCode = languageCode.trim().toLowerCase();
    if (!this.usageMap.has(normalizedCode)) {
      this.usageMap.set(normalizedCode, new Set());
    }
    this.usageMap.get(normalizedCode)!.add(entityId);
  }

  /**
   * Get all language entities
   */
  getAllLanguageEntities(): LanguageEntity[] {
    return Array.from(this.languageMap.values());
  }

  /**
   * Get only language entities that are actually used
   */
  getUsedLanguageEntities(): LanguageEntity[] {
    const used = Array.from(this.languageMap.entries())
      .filter(
        ([code, _]) =>
          this.usageMap.has(code) && this.usageMap.get(code)!.size > 0
      )
      .map(([_, entity]) => entity);

    return used;
  }

  /**
   * Get unused language entities
   */
  getUnusedLanguageEntities(): LanguageEntity[] {
    return Array.from(this.languageMap.entries())
      .filter(
        ([code, _]) =>
          !this.usageMap.has(code) || this.usageMap.get(code)!.size === 0
      )
      .map(([_, entity]) => entity);
  }

  /**
   * Clear all language entities and usage tracking
   */
  clear(): void {
    this.languageMap.clear();
    this.usageMap.clear();
  }

  /**
   * Get usage count for a language (for unit tests)
   */
  getUsageCount(code: string): number {
    const normalizedCode = code.trim().toLowerCase();
    return this.usageMap.get(normalizedCode)?.size || 0;
  }
}

// Singleton instance for the export process
export const rocrateLanguages = new RoCrateLanguages();
