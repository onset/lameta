import ldacProfile from "../comprehensive-ldac.json";
import { RoCrateLanguages } from "./RoCrateLanguages";

type LdacProfileClass = {
  inputs?: Array<{
    id: string;
    name?: string;
    required?: boolean;
    multiple?: boolean;
  }>;
};

interface LdacClassRule {
  name: string;
  inputs: Array<{
    id: string;
    required: boolean;
    multiple?: boolean;
    aliases: string[];
    primaryAlias: string;
  }>;
}

const ldacClassIndex = buildLdacClassIndex(
  (ldacProfile as { classes?: Record<string, LdacProfileClass> }).classes ?? {}
);
const enforcedLdacClasses = new Set<string>([
  "Dataset",
  "RepositoryCollection",
  "RepositoryObject",
  "File",
  "Person",
  "Organization",
  "Place",
  "Language",
  "ldac:CollectionEvent"
]);

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates RO-Crate export for LDAC profile compliance
 */
export class RoCrateValidator {
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

    const objects = graph.filter((item: any) => {
      const rawType = item["@type"];
      const typeList = Array.isArray(rawType)
        ? rawType
        : rawType
        ? [rawType]
        : [];
      const isRepositoryObject = typeList.includes("RepositoryObject");
      const isObjectType = typeList.includes("Object");
      const isLegacyEvent = typeList.includes("Event");
      const isCollectionEvent = typeList.includes("CollectionEvent");
      // LAM-61 https://linear.app/lameta/issue/LAM-61/sessions-should-be-collectionevent
      // Sessions now declare CollectionEvent (and RepositoryObject) types, so treat them as LDAC objects.
      const isRelevantType =
        isRepositoryObject ||
        isObjectType ||
        isLegacyEvent ||
        isCollectionEvent;
      return isRelevantType && !this.isFileType(rawType);
    });

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

    // Validate that any files that have licenses have valid license declarations
    files.forEach((file: any) => {
      this.validateFileLicense(file, errors, warnings);
    });

    // Validate LDAC-required properties for every typed entity
    graph.forEach((entity: any) => {
      const entityName = entity["@id"] || "Unnamed entity";
      this.validateEntityAgainstLdacProfile(entity, entityName, errors);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateEntityAgainstLdacProfile(
    entity: any,
    entityName: string,
    errors: string[]
  ): void {
    const types = this.normalizeTypeList(entity?.["@type"]);
    const evaluatedProperties = new Set<string>();

    types.forEach((type) => {
      const classRule = ldacClassIndex[type];
      if (!classRule || !enforcedLdacClasses.has(classRule.name)) {
        return;
      }

      classRule.inputs.forEach((input) => {
        if (!input.required) {
          return;
        }

        const valueKey = input.aliases.find((alias) => alias in entity);
        if (!valueKey || this.isEmptyValue(entity[valueKey])) {
          // Avoid spamming duplicate errors when multiple types share the same property
          const dedupeKey = `${classRule.name}:${input.primaryAlias}`;
          if (!evaluatedProperties.has(dedupeKey)) {
            errors.push(
              `${entityName} (${classRule.name}) is missing required ${input.primaryAlias} property`
            );
            evaluatedProperties.add(dedupeKey);
          }
          return;
        }

        const value = entity[valueKey];
        const dedupeKey = `${classRule.name}:${input.primaryAlias}`;
        if (evaluatedProperties.has(dedupeKey)) {
          return;
        }

        if (input.multiple === false && Array.isArray(value)) {
          errors.push(
            `${entityName} (${classRule.name}) expects ${input.primaryAlias} to be a single value`
          );
          evaluatedProperties.add(dedupeKey);
          return;
        }

        if (Array.isArray(value) && value.length === 0) {
          errors.push(
            `${entityName} (${classRule.name}) has an empty ${input.primaryAlias} array`
          );
          evaluatedProperties.add(dedupeKey);
        }
      });
    });
  }

  private normalizeTypeList(type: string | string[] | undefined): string[] {
    if (!type) {
      return [];
    }
    return Array.isArray(type) ? type : [type];
  }

  private isEmptyValue(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === "string") {
      return value.trim().length === 0;
    }
    if (typeof value === "object") {
      return Object.keys(value).length === 0;
    }
    return false;
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
      } else if (
        !langRef["@id"].startsWith("#language_") &&
        !langRef["@id"].startsWith("http")
      ) {
        warnings.push(
          `${entityName} ldac:subjectLanguage[${index}] @id "${langRef["@id"]}" does not follow #language_* pattern`
        );
      }
    });
  }

  /**
   * Validate that a file's license, when present, is well-formed.
   */
  private validateFileLicense(
    file: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (!file.license) {
      warnings.push(
        `File ${file["@id"]} does not declare a license; add one if required by the archive or LDAC profile`
      );
      return;
    }

    if (typeof file.license !== "object" || !file.license["@id"]) {
      errors.push(
        `File ${file["@id"]} license must be an object with @id property`
      );
    }
  }
}

function buildLdacClassIndex(
  classes: Record<string, LdacProfileClass>
): Record<string, LdacClassRule> {
  const index: Record<string, LdacClassRule> = {};

  Object.entries(classes).forEach(([className, metadata]) => {
    const inputs = (metadata.inputs ?? []).map((input) => {
      const aliases = buildPropertyAliases(input.id);
      return {
        id: input.id,
        required: Boolean(input.required),
        multiple: input.multiple,
        aliases,
        primaryAlias: aliases[1] ?? aliases[0] ?? input.id
      };
    });

    const rule: LdacClassRule = {
      name: className,
      inputs
    };

    buildTypeAliases(className).forEach((alias) => {
      if (!alias) {
        return;
      }
      index[alias] = rule;
    });
  });

  return index;
}

function buildTypeAliases(typeName: string): string[] {
  const aliases = new Set<string>();
  if (typeName) {
    aliases.add(typeName);
    if (typeName.includes(":")) {
      const [, shortName] = typeName.split(":");
      if (shortName) {
        aliases.add(shortName);
      }
    }
    if (typeName.includes("#")) {
      const fragment = typeName.split("#").pop();
      if (fragment) {
        aliases.add(fragment);
      }
    }
  }
  return Array.from(aliases).filter(Boolean);
}

function buildPropertyAliases(propertyId: string): string[] {
  const aliases: string[] = [];
  if (propertyId) {
    aliases.push(propertyId);
    const fragment = propertyId.includes("#")
      ? propertyId.split("#").pop()
      : propertyId.split("/").pop();
    if (fragment) {
      aliases.push(fragment);
      if (propertyId.includes("w3id.org/ldac/terms")) {
        aliases.push(`ldac:${fragment}`);
      }
      if (propertyId.includes("purl.org/dc/terms")) {
        aliases.push(`dct:${fragment}`);
      }
      if (propertyId.includes("pcdm.org/models")) {
        aliases.push(`pcdm:${fragment}`);
      }
    }
  }
  return Array.from(new Set(aliases)).filter(Boolean);
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
