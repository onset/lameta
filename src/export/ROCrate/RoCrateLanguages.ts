import { staticLanguageFinder } from "../../languageFinder/LanguageFinder";

export interface LanguageEntity {
  "@id": string;
  "@type": "Language";
  code: string;
  name: string;
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
    const name =
      staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(code);
    const entity: LanguageEntity = {
      "@id": `#language_${normalizedCode}`,
      "@type": "Language",
      code: normalizedCode,
      name: name
    };

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
