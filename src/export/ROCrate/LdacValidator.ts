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

export function collectPropertyAliases(propertyId: string): string[] {
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

// Known LDAC types that are valid alternatives to Schema.org types
export const KNOWN_LDAC_TYPES = new Set([
  "ldac:DataReuseLicense",
  "ldac:CollectionProtocol",
  "ldac:CollectionEvent"
]);

/**
 * Validates entities against the LDAC profile requirements
 */
export class LdacValidator {
  /**
   * Validate an entity against LDAC profile required properties
   */
  validateEntityAgainstLdacProfile(
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

  /**
   * Validate that an entity has required ldac:subjectLanguage property
   */
  validateEntityLanguages(
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

  /**
   * Validate that a file's license, when present, is well-formed.
   */
  validateFileLicense(file: any, errors: string[], warnings: string[]): void {
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

  /**
   * Validate the LDAC hierarchy structure:
   * - RepositoryCollection (project/corpus) contains RepositoryObjects (sessions)
   * - RepositoryObjects contain Files
   * - Proper bidirectional relationships (hasPart/isPartOf, pcdm:hasMember/pcdm:memberOf)
   */
  validateCrateHierarchy(
    entities: any[],
    errors: string[],
    warnings: string[]
  ): void {
    const entityById = new Map<string, any>();
    const collections: any[] = [];
    const objects: any[] = [];
    const files: any[] = [];

    // Index entities by @id and categorize by type
    entities.forEach((entity) => {
      if (entity["@id"]) {
        entityById.set(entity["@id"], entity);
      }
      const types = this.normalizeTypeList(entity["@type"]);
      if (types.includes("RepositoryCollection")) {
        collections.push(entity);
      }
      if (types.includes("RepositoryObject")) {
        objects.push(entity);
      }
      if (types.includes("File")) {
        files.push(entity);
      }
    });

    // Validate RepositoryObjects have pcdm:memberOf pointing to a Collection
    objects.forEach((obj) => {
      const memberOf = this.getPropertyByAliases(obj, [
        "pcdm:memberOf",
        "memberOf",
        "http://pcdm.org/models#memberOf"
      ]);
      if (!memberOf) {
        errors.push(
          `RepositoryObject "${obj["@id"]}" must have pcdm:memberOf referencing a RepositoryCollection`
        );
      } else {
        // Validate the reference points to an actual collection
        const refs = Array.isArray(memberOf) ? memberOf : [memberOf];
        refs.forEach((ref) => {
          const refId = typeof ref === "object" ? ref["@id"] : ref;
          const target = entityById.get(refId);
          if (target) {
            const targetTypes = this.normalizeTypeList(target["@type"]);
            if (!targetTypes.includes("RepositoryCollection")) {
              errors.push(
                `RepositoryObject "${obj["@id"]}" pcdm:memberOf references "${refId}" which is not a RepositoryCollection`
              );
            }
          }
        });
      }

      // Warn if object has no files (SHOULD have files)
      // Check for files via direct hasPart OR via subjectOf -> Dataset -> hasPart
      // This supports the dual hierarchy model where:
      // - RepositoryObject is the conceptual entity (the session/event)
      // - Dataset is the physical container (the directory with files)
      // - They are linked via subjectOf/about relationships
      const hasPart = this.getPropertyByAliases(obj, [
        "hasPart",
        "http://schema.org/hasPart"
      ]);
      const hasDirectFiles =
        hasPart && (!Array.isArray(hasPart) || hasPart.length > 0);

      // Check for files via subjectOf -> Dataset -> hasPart
      let hasFilesViaDataset = false;
      const subjectOf = this.getPropertyByAliases(obj, [
        "subjectOf",
        "http://schema.org/subjectOf"
      ]);
      if (subjectOf) {
        const subjectOfRefs = Array.isArray(subjectOf)
          ? subjectOf
          : [subjectOf];
        for (const ref of subjectOfRefs) {
          const refId = typeof ref === "object" ? ref["@id"] : ref;
          const dataset = entityById.get(refId);
          if (dataset) {
            const datasetTypes = this.normalizeTypeList(dataset["@type"]);
            if (datasetTypes.includes("Dataset")) {
              const datasetHasPart = this.getPropertyByAliases(dataset, [
                "hasPart",
                "http://schema.org/hasPart"
              ]);
              if (
                datasetHasPart &&
                (!Array.isArray(datasetHasPart) || datasetHasPart.length > 0)
              ) {
                hasFilesViaDataset = true;
                break;
              }
            }
          }
        }
      }

      if (!hasDirectFiles && !hasFilesViaDataset) {
        warnings.push(
          `RepositoryObject "${obj["@id"]}" (Session) should have files linked via hasPart or via subjectOf->Dataset->hasPart`
        );
      }
    });

    // Validate Files have isPartOf pointing to a RepositoryObject or a Dataset about a RepositoryObject
    // This supports the dual hierarchy model where:
    // - Files belong to a Dataset (physical containment)
    // - The Dataset is "about" a RepositoryObject (semantic relationship)
    files.forEach((file) => {
      const isPartOf = this.getPropertyByAliases(file, [
        "isPartOf",
        "http://schema.org/isPartOf"
      ]);
      if (!isPartOf) {
        errors.push(
          `File "${file["@id"]}" must have isPartOf referencing a RepositoryObject or Dataset`
        );
      } else {
        // Validate the reference points to an actual object or a Dataset about an object
        const refs = Array.isArray(isPartOf) ? isPartOf : [isPartOf];
        refs.forEach((ref) => {
          const refId = typeof ref === "object" ? ref["@id"] : ref;
          const target = entityById.get(refId);
          if (target) {
            const targetTypes = this.normalizeTypeList(target["@type"]);
            const isRepositoryObject = targetTypes.includes("RepositoryObject");
            const isDataset = targetTypes.includes("Dataset");

            if (!isRepositoryObject && !isDataset) {
              warnings.push(
                `File "${file["@id"]}" isPartOf references "${refId}" which is not a RepositoryObject or Dataset`
              );
            } else if (isDataset && !isRepositoryObject) {
              // It's a Dataset - check if it has an "about" link to a RepositoryObject
              // This is valid in the dual hierarchy model
              const about = this.getPropertyByAliases(target, [
                "about",
                "http://schema.org/about"
              ]);
              if (about) {
                const aboutId =
                  typeof about === "object" ? about["@id"] : about;
                const aboutEntity = entityById.get(aboutId);
                if (aboutEntity) {
                  const aboutTypes = this.normalizeTypeList(
                    aboutEntity["@type"]
                  );
                  if (!aboutTypes.includes("RepositoryObject")) {
                    // Dataset exists but isn't about a RepositoryObject - this is still
                    // valid for project-level files (DescriptionDocuments, OtherDocuments, etc.)
                    // Only warn if it seems like it should be session-related
                    const fileId = file["@id"];
                    if (
                      typeof fileId === "string" &&
                      fileId.startsWith("Sessions/")
                    ) {
                      warnings.push(
                        `File "${file["@id"]}" isPartOf references Dataset "${refId}" which is not about a RepositoryObject`
                      );
                    }
                  }
                }
              }
              // No about link is fine - it's a directory Dataset for organizational purposes
            }
          }
        });
      }
    });

    // Validate bidirectional consistency: pcdm:hasMember <-> pcdm:memberOf
    collections.forEach((collection) => {
      const hasMember = this.getPropertyByAliases(collection, [
        "pcdm:hasMember",
        "hasMember",
        "http://pcdm.org/models#hasMember"
      ]);
      if (hasMember) {
        const members = Array.isArray(hasMember) ? hasMember : [hasMember];
        members.forEach((memberRef) => {
          const memberId =
            typeof memberRef === "object" ? memberRef["@id"] : memberRef;
          const member = entityById.get(memberId);
          if (member) {
            const memberOf = this.getPropertyByAliases(member, [
              "pcdm:memberOf",
              "memberOf",
              "http://pcdm.org/models#memberOf"
            ]);
            const memberOfIds = this.extractIds(memberOf);
            if (!memberOfIds.includes(collection["@id"])) {
              warnings.push(
                `Bidirectional inconsistency: Collection "${collection["@id"]}" has pcdm:hasMember "${memberId}" but member lacks pcdm:memberOf back-reference`
              );
            }
          }
        });
      }
    });

    // Validate bidirectional consistency: hasPart <-> isPartOf
    objects.forEach((obj) => {
      const hasPart = this.getPropertyByAliases(obj, [
        "hasPart",
        "http://schema.org/hasPart"
      ]);
      if (hasPart) {
        const parts = Array.isArray(hasPart) ? hasPart : [hasPart];
        parts.forEach((partRef) => {
          const partId = typeof partRef === "object" ? partRef["@id"] : partRef;
          const part = entityById.get(partId);
          if (part) {
            const isPartOf = this.getPropertyByAliases(part, [
              "isPartOf",
              "http://schema.org/isPartOf"
            ]);
            const isPartOfIds = this.extractIds(isPartOf);
            if (!isPartOfIds.includes(obj["@id"])) {
              warnings.push(
                `Bidirectional inconsistency: RepositoryObject "${obj["@id"]}" has hasPart "${partId}" but part lacks isPartOf back-reference`
              );
            }
          }
        });
      }
    });
  }

  private extractIds(value: any): string[] {
    if (!value) {
      return [];
    }
    const items = Array.isArray(value) ? value : [value];
    return items.map((item) => (typeof item === "object" ? item["@id"] : item));
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

  private getPropertyByAliases(entity: any, aliases: string[]): any {
    for (const alias of aliases) {
      if (alias in entity) {
        return entity[alias];
      }
    }
    return undefined;
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
