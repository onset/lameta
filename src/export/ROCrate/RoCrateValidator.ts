import { RoCrateLanguages } from "./RoCrateLanguages";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates RO-Crate export for LDAC profile compliance
 */
export class RoCrateValidator {
  private rocrateLanguages: RoCrateLanguages;

  constructor(rocrateLanguages: RoCrateLanguages) {
    this.rocrateLanguages = rocrateLanguages;
  }

  /**
   * Check if a type represents a file
   */
  private isFileType(type: string | string[]): boolean {
    const types = Array.isArray(type) ? type : [type];
    return types.some(
      (t) =>
        t === "File" ||
        t === "AudioObject" ||
        t === "VideoObject" ||
        t === "ImageObject" ||
        t === "DigitalDocument"
    );
  }

  /**
   * Validate the complete RO-Crate structure
   */
  validate(roCrate: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!roCrate["@graph"] || !Array.isArray(roCrate["@graph"])) {
      errors.push("RO-Crate must have a @graph array");
      return { isValid: false, errors, warnings };
    }

    const graph = roCrate["@graph"];

    // Find root collection and sessions/objects
    const rootCollection = graph.find(
      (item: any) => item["@id"] === "./" && item["@type"]?.includes("Dataset")
    );

    const objects = graph.filter(
      (item: any) =>
        (item["@type"]?.includes("Object") ||
          item["@type"]?.includes("Event")) &&
        !this.isFileType(item["@type"])
    );

    const files = graph.filter((item: any) => this.isFileType(item["@type"]));

    // Validate root collection has ldac:subjectLanguage
    if (rootCollection) {
      this.validateEntityLanguages(
        rootCollection,
        "Root Collection",
        errors,
        warnings
      );
    } else {
      errors.push("No root collection found in @graph");
    }

    // Validate each object/session has ldac:subjectLanguage
    objects.forEach((obj: any) => {
      this.validateEntityLanguages(
        obj,
        `Object ${obj["@id"]}`,
        errors,
        warnings
      );
    });

    // Validate all files have licenses
    files.forEach((file: any) => {
      this.validateFileLicense(file, errors, warnings);
    });

    // Check for unused language entities
    const unusedLanguages = this.rocrateLanguages.getUnusedLanguageEntities();
    if (unusedLanguages.length > 0) {
      warnings.push(
        `Found ${
          unusedLanguages.length
        } unused language entities: ${unusedLanguages
          .map((l) => l.code)
          .join(", ")}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate that an entity has required ldac:subjectLanguage property
   */
  private validateEntityLanguages(
    entity: any,
    entityName: string,
    errors: string[],
    warnings: string[]
  ): void {
    const subjectLanguages = entity["ldac:subjectLanguage"];

    if (!subjectLanguages) {
      errors.push(
        `${entityName} is missing required ldac:subjectLanguage property`
      );
      return;
    }

    if (!Array.isArray(subjectLanguages)) {
      errors.push(`${entityName} ldac:subjectLanguage must be an array`);
      return;
    }

    if (subjectLanguages.length === 0) {
      errors.push(`${entityName} ldac:subjectLanguage array is empty`);
      return;
    }

    // Validate language references
    subjectLanguages.forEach((langRef: any, index: number) => {
      if (!langRef || typeof langRef !== "object" || !langRef["@id"]) {
        errors.push(
          `${entityName} ldac:subjectLanguage[${index}] must have an @id property`
        );
      } else if (!langRef["@id"].startsWith("#language_")) {
        warnings.push(
          `${entityName} ldac:subjectLanguage[${index}] @id "${langRef["@id"]}" does not follow #language_* pattern`
        );
      }
    });
  }

  /**
   * Validate that a file has a license property
   */
  private validateFileLicense(
    file: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (!file.license) {
      errors.push(`File ${file["@id"]} is missing required license property`);
      return;
    }

    if (typeof file.license !== "object" || !file.license["@id"]) {
      errors.push(
        `File ${file["@id"]} license must be an object with @id property`
      );
    }
  }
}

/**
 * Ensure an entity has at least one ldac:subjectLanguage entry
 */
export function ensureSubjectLanguage(
  entity: any,
  rocrateLanguages: RoCrateLanguages,
  defaultLanguageCodes: string[] = ["und"]
): void {
  if (!entity["ldac:subjectLanguage"]) {
    entity["ldac:subjectLanguage"] = [];
  }

  // Ensure it's an array
  if (!Array.isArray(entity["ldac:subjectLanguage"])) {
    entity["ldac:subjectLanguage"] = [entity["ldac:subjectLanguage"]];
  }

  // If empty, add default language(s)
  if (entity["ldac:subjectLanguage"].length === 0) {
    defaultLanguageCodes.forEach((code) => {
      const reference = rocrateLanguages.getLanguageReference(code);
      entity["ldac:subjectLanguage"].push(reference);
      rocrateLanguages.trackUsage(code, entity["@id"]);
    });
  }
}
