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

interface LdacRequiredInput {
  id: string;
  multiple?: boolean;
  aliases: string[];
  primaryAlias: string;
}

interface LdacClassRule {
  name: string;
  inputs: LdacRequiredInput[];
  aliasMap: Record<string, LdacRequiredInput>;
}

const namespaceAliasHints: Array<{ marker: string; prefix: string }> = [
  { marker: "w3id.org/ldac/terms", prefix: "ldac" },
  { marker: "purl.org/dc/terms", prefix: "dct" },
  { marker: "pcdm.org/models", prefix: "pcdm" }
];

const typeAliasCache = new Map<string, string[]>();
const propertyAliasCache = new Map<string, string[]>();

function collectTypeAliases(typeName: string): string[] {
  if (!typeName) {
    return [];
  }

  if (typeAliasCache.has(typeName)) {
    return typeAliasCache.get(typeName)!;
  }

  const aliases = new Set<string>([typeName]);
  const hashFragment = extractFragment(typeName);
  if (hashFragment) {
    aliases.add(hashFragment);
  }

  const colonShortName = extractPrefixedLocalName(typeName);
  if (colonShortName) {
    aliases.add(colonShortName);
  }

  const result = Array.from(aliases).filter(Boolean);
  typeAliasCache.set(typeName, result);
  return result;
}

function collectPropertyAliases(propertyId: string): string[] {
  if (!propertyId) {
    return [];
  }

  if (propertyAliasCache.has(propertyId)) {
    return propertyAliasCache.get(propertyId)!;
  }

  const aliases = new Set<string>([propertyId]);
  const localName = extractFragment(propertyId) ?? extractPathLeaf(propertyId);
  if (localName) {
    aliases.add(localName);
    namespaceAliasHints.forEach(({ marker, prefix }) => {
      if (propertyId.includes(marker)) {
        aliases.add(`${prefix}:${localName}`);
      }
    });
  } else {
    const prefixedName = extractPrefixedLocalName(propertyId);
    if (prefixedName) {
      aliases.add(prefixedName);
    }
  }

  const result = Array.from(aliases).filter(Boolean);
  propertyAliasCache.set(propertyId, result);
  return result;
}

function extractFragment(identifier: string): string | undefined {
  if (!identifier || !identifier.includes("#")) {
    return undefined;
  }
  const fragment = identifier.split("#").pop();
  return fragment && fragment.length > 0 ? fragment : undefined;
}

function extractPathLeaf(identifier: string): string | undefined {
  if (!identifier.includes("/")) {
    return undefined;
  }
  const segment = identifier.split("/").pop();
  return segment && segment.length > 0 ? segment : undefined;
}

function extractPrefixedLocalName(identifier: string): string | undefined {
  if (!identifier || !identifier.includes(":")) {
    return undefined;
  }
  if (identifier.startsWith("http")) {
    return undefined;
  }
  const [, localName] = identifier.split(":");
  return localName && localName.length > 0 ? localName : undefined;
}

const subjectLanguagePropertyAliases = collectPropertyAliases(
  "https://w3id.org/ldac/terms#subjectLanguage"
);

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

      const matchedInputs = new Map<
        string,
        { rule: LdacRequiredInput; value: any }
      >();
      Object.entries(entity).forEach(([key, value]) => {
        const rule = classRule.aliasMap[key];
        if (!rule) {
          return;
        }

        const dedupeKey = `${classRule.name}:${rule.primaryAlias}`;
        if (matchedInputs.has(dedupeKey)) {
          return;
        }

        matchedInputs.set(dedupeKey, { rule, value });
      });

      classRule.inputs.forEach((input) => {
        const dedupeKey = `${classRule.name}:${input.primaryAlias}`;
        if (evaluatedProperties.has(dedupeKey)) {
          return;
        }

        const match = matchedInputs.get(dedupeKey);
        if (!match || this.isEmptyValue(match.value)) {
          errors.push(
            `${entityName} (${classRule.name}) is missing required ${input.primaryAlias} property`
          );
          evaluatedProperties.add(dedupeKey);
          return;
        }

        if (input.multiple === false && Array.isArray(match.value)) {
          errors.push(
            `${entityName} (${classRule.name}) expects ${input.primaryAlias} to be a single value`
          );
          evaluatedProperties.add(dedupeKey);
          return;
        }

        if (Array.isArray(match.value) && match.value.length === 0) {
          errors.push(
            `${entityName} (${classRule.name}) has an empty ${input.primaryAlias} array`
          );
          evaluatedProperties.add(dedupeKey);
          return;
        }

        evaluatedProperties.add(dedupeKey);
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
    const subjectLanguages = this.getPropertyByAliases(
      entity,
      subjectLanguagePropertyAliases
    );

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

  private getPropertyByAliases(entity: any, aliases: string[]): any {
    for (const alias of aliases) {
      if (alias in entity) {
        return entity[alias];
      }
    }
    return undefined;
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
    const inputs = (metadata.inputs ?? [])
      .filter((input) => Boolean(input.required))
      .map((input) => {
        const aliases = collectPropertyAliases(input.id);
        const rule: LdacRequiredInput = {
          id: input.id,
          multiple: input.multiple,
          aliases,
          primaryAlias: aliases[1] ?? aliases[0] ?? input.id
        };
        return rule;
      });

    const aliasMap: Record<string, LdacRequiredInput> = {};
    inputs.forEach((inputRule) => {
      inputRule.aliases.forEach((alias) => {
        aliasMap[alias] = inputRule;
      });
    });

    const rule: LdacClassRule = {
      name: className,
      inputs,
      aliasMap
    };

    collectTypeAliases(className).forEach((alias) => {
      if (!alias) {
        return;
      }
      index[alias] = rule;
    });
  });

  return index;
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
