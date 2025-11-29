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

// Known Schema.org types that are commonly used
const SCHEMA_ORG_TYPES = new Set([
  "Thing",
  "CreativeWork",
  "Dataset",
  "File",
  "MediaObject",
  "AudioObject",
  "VideoObject",
  "ImageObject",
  "DigitalDocument",
  "Person",
  "Organization",
  "Place",
  "Event",
  "Action",
  "CreateAction",
  "UpdateAction",
  "SoftwareApplication",
  "SoftwareSourceCode",
  "ComputerLanguage",
  "PropertyValue",
  "ContactPoint",
  "GeoCoordinates",
  "GeoShape",
  "PostalAddress",
  "Language",
  "DefinedTerm",
  "DefinedTermSet",
  "ScholarlyArticle",
  "WebPage",
  "WebSite",
  "Intangible",
  "StructuredValue",
  "Role",
  "OrganizationRole",
  "PerformanceRole",
  "IndividualProduct",
  "Product",
  "Offer",
  "DataDownload",
  "HowTo",
  "Comment",
  "Review",
  "Rating",
  "ListItem",
  "ItemList",
  "BreadcrumbList",
  "CollectionEvent",
  "RepositoryCollection",
  "RepositoryObject",
  "Profile"
]);

// Properties that reference other entities and must use {@id} form
// Note: encodingFormat is NOT included because MIME type strings are valid per RO-Crate spec
const REFERENCE_PROPERTIES = new Set([
  "author",
  "creator",
  "contributor",
  "publisher",
  "funder",
  "sponsor",
  "affiliation",
  "memberOf",
  "hasPart",
  "isPartOf",
  "about",
  "subjectOf",
  "mainEntity",
  "mainEntityOfPage",
  "mentions",
  "citation",
  "isBasedOn",
  "license",
  "contentLocation",
  "spatialCoverage",
  "temporalCoverage",
  "thumbnail",
  "image",
  "programmingLanguage",
  "instrument",
  "object",
  "result",
  "agent",
  "participant",
  "location",
  "geo",
  "address",
  "contactPoint",
  "distribution",
  "workExample",
  "exampleOfWork",
  "conformsTo",
  "ldac:subjectLanguage",
  "subjectLanguage"
]);

// File types that are considered as File data entities
const FILE_TYPES = new Set([
  "File",
  "AudioObject",
  "VideoObject",
  "ImageObject",
  "DigitalDocument",
  "MediaObject"
]);

// Known LDAC types that are valid alternatives to Schema.org types
const KNOWN_LDAC_TYPES = new Set([
  "ldac:DataReuseLicense",
  "ldac:CollectionProtocol",
  "ldac:CollectionEvent"
]);

/**
 * Validates RO-Crate export for LDAC profile compliance and RO-Crate 1.2 specification
 */
export class RoCrateValidator {
  /**
   * Check if a type represents a file
   */
  private isFileType(type: string | string[]): boolean {
    const types = Array.isArray(type) ? type : [type];
    return types.some((t) => FILE_TYPES.has(t));
  }

  /**
   * Check if a type represents a Dataset
   */
  private isDatasetType(type: string | string[]): boolean {
    const types = Array.isArray(type) ? type : [type];
    return types.includes("Dataset");
  }

  /**
   * Check if an @id is a valid URI reference
   * RO-Crate 1.2: @id identifiers must be valid URI references
   */
  private isValidUriReference(id: string): boolean {
    if (!id || typeof id !== "string") return false;
    // Allow relative paths, absolute URIs, and fragment identifiers
    // Relative paths should use / separator and may contain encoded characters
    if (id.startsWith("#") || id.startsWith("_:")) return true; // Fragment or blank node
    if (id.startsWith("http://") || id.startsWith("https://")) return true;
    if (id.startsWith("urn:") || id.startsWith("arcp:")) return true;
    // Relative URI path - should not contain backslashes
    if (id.includes("\\")) return false;
    return true;
  }

  /**
   * Validate the complete RO-Crate structure
   */
  validate(roCrate: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // RO-Crate 1.2 line 138: Must have @graph array (flattened form)
    if (!roCrate["@graph"] || !Array.isArray(roCrate["@graph"])) {
      errors.push(
        "RO-Crate must have a @graph array (line 138: flattened document form)"
      );
      return { isValid: false, errors, warnings };
    }

    // RO-Crate 1.2 line 674: Check for nested entities (must be flat)
    this.validateFlatStructure(roCrate["@graph"], errors);

    // RO-Crate 1.2 line 429: Must use RO-Crate JSON-LD Context
    this.validateContext(roCrate, errors, warnings);

    const graph = roCrate["@graph"];

    // RO-Crate 1.2 line 1606: @graph MUST NOT have duplicate @id
    this.validateUniqueIds(graph, errors);

    // RO-Crate 1.2 line 822: Must have metadata descriptor
    const metadataDescriptor = this.validateMetadataDescriptor(
      graph,
      errors,
      warnings
    );

    // Validate all entities have @id and @type (lines 648-649)
    this.validateAllEntities(graph, errors, warnings);

    // Find root collection and sessions/objects
    const rootCollection = graph.find(
      (item: any) => item["@id"] === "./" && item["@type"]?.includes("Dataset")
    );

    // RO-Crate 1.2 line 192: Root Data Entity MUST have @type Dataset
    if (rootCollection) {
      this.validateRootDataEntity(rootCollection, errors, warnings);
    }

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
      // Sessions declare CollectionEvent (and RepositoryObject) types, so treat them as LDAC objects.
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

    // Build entity index for reference validation
    const entityIndex = new Map<string, any>();
    graph.forEach((entity: any) => {
      if (entity["@id"]) {
        entityIndex.set(entity["@id"], entity);
      }
    });

    // RO-Crate 1.2 line 653: Validate property references use {@id} form
    graph.forEach((entity: any) => {
      this.validatePropertyReferences(entity, entityIndex, errors, warnings);
    });

    // RO-Crate 1.2 line 431 & 654: Validate contextual entities are linked
    this.validateContextualEntityLinkage(
      graph,
      entityIndex,
      rootCollection,
      warnings
    );

    // RO-Crate 1.2 line 1032: Validate data entities are linked from root via hasPart
    this.validateDataEntityLinkage(
      graph,
      entityIndex,
      rootCollection,
      errors,
      warnings
    );

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
   * RO-Crate 1.2 line 674: Validate no nested entities in @graph (must be flat)
   */
  private validateFlatStructure(graph: any[], errors: string[]): void {
    graph.forEach((entity: any) => {
      const entityId = entity["@id"] || "(no @id)";
      Object.entries(entity).forEach(([key, value]) => {
        if (key === "@id" || key === "@type" || key === "@context") return;
        this.checkForNestedEntities(value, entityId, key, errors);
      });
    });
  }

  private checkForNestedEntities(
    value: any,
    entityId: string,
    propertyName: string,
    errors: string[]
  ): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.checkForNestedEntities(
          item,
          entityId,
          `${propertyName}[${index}]`,
          errors
        );
      });
    } else if (value && typeof value === "object") {
      // Valid reference objects have only @id
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === "@id") {
        return; // Valid reference
      }
      // PropertyValue and similar inline objects are allowed
      if (value["@type"] && !value["@id"]) {
        errors.push(
          `Entity "${entityId}" has nested entity in ${propertyName} that should be a separate entity in @graph (line 674)`
        );
      } else if (value["@type"] && value["@id"]) {
        // Has both @type and @id - should be separate entity
        errors.push(
          `Entity "${entityId}" has nested entity "${value["@id"]}" in ${propertyName} - must be in @graph (line 674)`
        );
      }
    }
  }

  /**
   * RO-Crate 1.2 line 192, 884-891: Validate Root Data Entity requirements
   */
  private validateRootDataEntity(
    rootEntity: any,
    errors: string[],
    warnings: string[]
  ): void {
    const types = this.normalizeTypeList(rootEntity["@type"]);

    // Line 192: Root Data Entity MUST have @type Dataset
    if (!types.includes("Dataset")) {
      errors.push("Root Data Entity must have @type Dataset (line 192)");
    }

    // Line 479: @id MUST be ./ or a URI
    const rootId = rootEntity["@id"];
    if (rootId !== "./" && !rootId.startsWith("http")) {
      errors.push(
        `Root Data Entity @id must be "./" or an absolute URI (line 479), found: "${rootId}"`
      );
    }

    // Line 884-891: Required properties
    // datePublished MUST be present
    if (!rootEntity.datePublished) {
      errors.push(
        "Root Data Entity must have datePublished property (line 884-891)"
      );
    } else {
      // Validate ISO 8601 date format
      this.validateDateFormat(
        rootEntity.datePublished,
        "Root Data Entity datePublished",
        errors
      );
    }

    // name SHOULD be present
    if (!rootEntity.name) {
      warnings.push(
        "Root Data Entity should have a name property (line 884-891)"
      );
    }

    // description SHOULD be present
    if (!rootEntity.description) {
      warnings.push(
        "Root Data Entity should have a description property (line 884-891)"
      );
    }

    // license SHOULD be present
    if (!rootEntity.license) {
      warnings.push(
        "Root Data Entity should have a license property (line 884-891)"
      );
    }
  }

  /**
   * Validate ISO 8601 date format
   */
  private validateDateFormat(
    date: any,
    context: string,
    errors: string[]
  ): void {
    if (typeof date !== "string") {
      errors.push(`${context} must be a string in ISO 8601 format`);
      return;
    }
    // Basic ISO 8601 validation - YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const iso8601Regex =
      /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/;
    if (!iso8601Regex.test(date)) {
      errors.push(
        `${context} must be in ISO 8601 date format (line 884-891), found: "${date}"`
      );
    }
  }

  /**
   * RO-Crate 1.2 line 653: Validate property references use {@id} form
   */
  private validatePropertyReferences(
    entity: any,
    entityIndex: Map<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    const entityId = entity["@id"] || "(no @id)";

    Object.entries(entity).forEach(([key, value]) => {
      if (key === "@id" || key === "@type" || key === "@context") return;

      // Check if this property typically references other entities
      if (REFERENCE_PROPERTIES.has(key)) {
        this.validateReferenceValue(
          value,
          entityId,
          key,
          entityIndex,
          errors,
          warnings
        );
      }
    });
  }

  private validateReferenceValue(
    value: any,
    entityId: string,
    propertyName: string,
    entityIndex: Map<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.validateSingleReference(
          item,
          entityId,
          `${propertyName}[${index}]`,
          entityIndex,
          errors,
          warnings
        );
      });
    } else {
      this.validateSingleReference(
        value,
        entityId,
        propertyName,
        entityIndex,
        errors,
        warnings
      );
    }
  }

  private validateSingleReference(
    value: any,
    entityId: string,
    propertyName: string,
    entityIndex: Map<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    if (value === null || value === undefined) return;

    // String values for reference properties should be {@id} objects
    if (typeof value === "string") {
      // Some properties like license can be a URL string directly
      if (propertyName === "license" && value.startsWith("http")) {
        return; // Allow URL strings for license
      }
      warnings.push(
        `Entity "${entityId}" property ${propertyName} should use {"@id": "..."} form instead of string (line 653)`
      );
      return;
    }

    if (typeof value === "object" && value["@id"]) {
      // Valid reference - optionally check if target exists
      const targetId = value["@id"];
      if (!targetId.startsWith("http") && !entityIndex.has(targetId)) {
        warnings.push(
          `Entity "${entityId}" ${propertyName} references "${targetId}" which is not described in the RO-Crate (line 431)`
        );
      }
    }
  }

  /**
   * RO-Crate 1.2 line 431 & 654: Validate contextual entities are linked
   */
  private validateContextualEntityLinkage(
    graph: any[],
    entityIndex: Map<string, any>,
    rootEntity: any,
    warnings: string[]
  ): void {
    // Build a set of all referenced entity IDs
    const referencedIds = new Set<string>();

    graph.forEach((entity: any) => {
      Object.entries(entity).forEach(([key, value]) => {
        if (key === "@id" || key === "@type" || key === "@context") return;
        this.collectReferencedIds(value, referencedIds);
      });
    });

    // Check each entity (except root and metadata descriptor) is referenced
    graph.forEach((entity: any) => {
      const id = entity["@id"];
      if (!id) return;
      if (
        id === "./" ||
        id === "ro-crate-metadata.json" ||
        id === "ro-crate-metadata.jsonld"
      )
        return;

      if (!referencedIds.has(id)) {
        warnings.push(
          `Entity "${id}" is not referenced by any other entity (line 431, 654)`
        );
      }
    });
  }

  private collectReferencedIds(value: any, referencedIds: Set<string>): void {
    if (Array.isArray(value)) {
      value.forEach((item) => this.collectReferencedIds(item, referencedIds));
    } else if (value && typeof value === "object" && value["@id"]) {
      referencedIds.add(value["@id"]);
    }
  }

  /**
   * RO-Crate 1.2 line 1032: Validate data entities are linked from root via hasPart
   */
  private validateDataEntityLinkage(
    graph: any[],
    entityIndex: Map<string, any>,
    rootEntity: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (!rootEntity) return;

    // Collect all data entities (Files and Datasets that are not root)
    const dataEntities = graph.filter((entity: any) => {
      const id = entity["@id"];
      if (!id || id === "./" || id.startsWith("#") || id.startsWith("_:"))
        return false;
      if (id === "ro-crate-metadata.json" || id === "ro-crate-metadata.jsonld")
        return false;
      if (id.startsWith("http")) return false; // Web-based entities don't need hasPart

      const types = this.normalizeTypeList(entity["@type"]);
      return this.isFileType(types) || this.isDatasetType(types);
    });

    // Build set of entities reachable from root via hasPart
    const reachableFromRoot = new Set<string>();
    this.collectHasPartEntities(rootEntity, entityIndex, reachableFromRoot);

    // Check each data entity is reachable
    dataEntities.forEach((entity: any) => {
      const id = entity["@id"];
      if (!reachableFromRoot.has(id)) {
        warnings.push(
          `Data entity "${id}" is not linked from Root Data Entity via hasPart (line 1032)`
        );
      }
    });
  }

  private collectHasPartEntities(
    entity: any,
    entityIndex: Map<string, any>,
    collected: Set<string>,
    visited: Set<string> = new Set()
  ): void {
    const id = entity["@id"];
    if (!id || visited.has(id)) return;
    visited.add(id);

    const hasPart = entity.hasPart;
    if (!hasPart) return;

    const parts = Array.isArray(hasPart) ? hasPart : [hasPart];
    parts.forEach((part: any) => {
      const partId = typeof part === "object" ? part["@id"] : part;
      if (partId) {
        collected.add(partId);
        // Recursively collect from nested datasets
        const partEntity = entityIndex.get(partId);
        if (partEntity) {
          this.collectHasPartEntities(
            partEntity,
            entityIndex,
            collected,
            visited
          );
        }
      }
    });
  }

  /**
   * RO-Crate 1.2 line 650: Validate @type includes Schema.org type
   * Also accepts known LDAC types as valid alternatives
   */
  private validateSchemaOrgType(
    types: string[],
    entityId: string,
    warnings: string[]
  ): void {
    const hasSchemaOrgType = types.some((t) => SCHEMA_ORG_TYPES.has(t));
    const hasKnownLdacType = types.some((t) => KNOWN_LDAC_TYPES.has(t));
    if (!hasSchemaOrgType && !hasKnownLdacType) {
      warnings.push(
        `Entity "${entityId}" @type should include at least one Schema.org type (line 650)`
      );
    }
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

  /**
   * RO-Crate 1.2 line 429: Validate @context uses RO-Crate JSON-LD Context
   */
  private validateContext(
    roCrate: any,
    errors: string[],
    warnings: string[]
  ): void {
    const context = roCrate["@context"];
    if (!context) {
      errors.push(
        "RO-Crate must have @context (line 429: must use RO-Crate JSON-LD Context)"
      );
      return;
    }

    // Context can be a string, array, or object
    const contextArray = Array.isArray(context) ? context : [context];
    const hasRoCrateContext = contextArray.some((c: any) => {
      if (typeof c === "string") {
        return c.startsWith("https://w3id.org/ro/crate/");
      }
      return false;
    });

    if (!hasRoCrateContext) {
      warnings.push(
        "RO-Crate @context should reference https://w3id.org/ro/crate/ (line 429)"
      );
    }
  }

  /**
   * RO-Crate 1.2 line 1606: @graph MUST NOT have duplicate @id
   */
  private validateUniqueIds(graph: any[], errors: string[]): void {
    const seenIds = new Map<string, number>();
    graph.forEach((entity: any, index: number) => {
      const id = entity["@id"];
      if (id) {
        if (seenIds.has(id)) {
          errors.push(
            `Duplicate @id "${id}" found in @graph (line 1606: @graph MUST NOT list multiple entities with the same @id)`
          );
        } else {
          seenIds.set(id, index);
        }
      }
    });
  }

  /**
   * RO-Crate 1.2 line 822: Validate metadata descriptor exists
   * The RO-Crate Metadata Document MUST contain a self-describing RO-Crate Metadata Descriptor
   * with @id "ro-crate-metadata.json" and @type CreativeWork with about property
   */
  private validateMetadataDescriptor(
    graph: any[],
    errors: string[],
    warnings: string[]
  ): any {
    const descriptor = graph.find(
      (item: any) =>
        item["@id"] === "ro-crate-metadata.json" ||
        item["@id"] === "ro-crate-metadata.jsonld"
    );

    if (!descriptor) {
      errors.push(
        'RO-Crate must have a metadata descriptor with @id "ro-crate-metadata.json" (line 822)'
      );
      return null;
    }

    // Check @type includes CreativeWork
    const types = this.normalizeTypeList(descriptor["@type"]);
    if (!types.includes("CreativeWork")) {
      errors.push(
        "Metadata descriptor must have @type CreativeWork (line 822)"
      );
    }

    // Check about property references root data entity
    if (!descriptor.about) {
      errors.push(
        "Metadata descriptor must have about property referencing root data entity (line 822)"
      );
    } else {
      const aboutId =
        typeof descriptor.about === "object"
          ? descriptor.about["@id"]
          : descriptor.about;
      if (!aboutId) {
        errors.push(
          "Metadata descriptor about property must reference root data entity @id (line 822)"
        );
      }
    }

    // Check conformsTo (line 845)
    if (descriptor.conformsTo) {
      const conformsToArray = Array.isArray(descriptor.conformsTo)
        ? descriptor.conformsTo
        : [descriptor.conformsTo];
      const hasRoCrateConformsTo = conformsToArray.some((c: any) => {
        const id = typeof c === "object" ? c["@id"] : c;
        return id && id.startsWith("https://w3id.org/ro/crate/");
      });
      if (!hasRoCrateConformsTo) {
        warnings.push(
          "Metadata descriptor conformsTo should reference https://w3id.org/ro/crate/ (line 845)"
        );
      }
    } else {
      warnings.push(
        "Metadata descriptor should have conformsTo property (line 845)"
      );
    }

    return descriptor;
  }

  /**
   * RO-Crate 1.2 lines 648-654: Validate all entities have required properties
   */
  private validateAllEntities(
    graph: any[],
    errors: string[],
    warnings: string[]
  ): void {
    graph.forEach((entity: any) => {
      const entityId = entity["@id"] || "(no @id)";

      // Line 648: Entity MUST have @id
      if (!entity["@id"]) {
        errors.push(`Entity is missing required @id property (line 648)`);
        return;
      }

      // Check @id is valid URI reference (line 1050)
      if (!this.isValidUriReference(entity["@id"])) {
        errors.push(
          `Entity "${entityId}" has invalid @id - must be valid URI reference (line 1050)`
        );
      }

      // Line 649: Entity MUST have @type
      if (!entity["@type"]) {
        errors.push(
          `Entity "${entityId}" is missing required @type property (line 649)`
        );
        return;
      }

      // Line 651: Entity SHOULD have name (warning)
      if (
        !entity.name &&
        entityId !== "ro-crate-metadata.json" &&
        entityId !== "ro-crate-metadata.jsonld"
      ) {
        // Only warn for non-descriptor entities without http @id
        if (!entityId.startsWith("http")) {
          warnings.push(
            `Entity "${entityId}" should have a name property (line 651)`
          );
        }
      }

      const types = this.normalizeTypeList(entity["@type"]);

      // Line 650: @type SHOULD include at least one Schema.org type
      this.validateSchemaOrgType(types, entityId, warnings);

      // Line 653: Property references to other entities MUST use {"@id": "..."} form
      // Validated in validatePropertyReferences()

      // Validate File entities (lines 1129-1132)
      if (this.isFileType(types)) {
        this.validateFileEntity(entity, errors, warnings);
      }

      // Validate Dataset/Directory entities (lines 1160-1165)
      if (this.isDatasetType(types) && entityId !== "./") {
        this.validateDatasetEntity(entity, errors, warnings);
      }
    });
  }

  /**
   * RO-Crate 1.2 lines 1129-1138: Validate File data entity
   */
  private validateFileEntity(
    entity: any,
    errors: string[],
    warnings: string[]
  ): void {
    const entityId = entity["@id"];
    const types = this.normalizeTypeList(entity["@type"]);

    // Line 1131: @type MUST be File or array where File is one value
    // We accept File aliases like AudioObject, VideoObject etc.

    // Line 1132: @id MUST be a relative or absolute URI
    if (!this.isValidUriReference(entityId)) {
      errors.push(
        `File "${entityId}" @id must be a valid URI reference (line 1132)`
      );
    }

    // For local files (not starting with # or http), check path format
    const isLocalFile =
      !entityId.startsWith("#") &&
      !entityId.startsWith("http") &&
      !entityId.startsWith("_:");

    if (isLocalFile) {
      // Line 1050: Paths should use / separator
      if (entityId.includes("\\")) {
        errors.push(
          `File "${entityId}" @id should use / separator, not \\ (line 1050)`
        );
      }
    }

    // Line 1144: File entities SHOULD have encodingFormat
    if (!entity.encodingFormat) {
      warnings.push(
        `File "${entityId}" should have encodingFormat property (line 1144)`
      );
    }

    // Line 1253: Web-based data entities SHOULD have sdDatePublished
    if (entityId.startsWith("http") && !entity.sdDatePublished) {
      warnings.push(
        `Web-based File "${entityId}" should have sdDatePublished property (line 1253)`
      );
    }

    // Line 1154: Files with @id starting with # should have localPath
    if (entityId.startsWith("#") && !entity.localPath) {
      warnings.push(
        `File "${entityId}" with # @id should have localPath property (line 1154)`
      );
    }
  }

  /**
   * RO-Crate 1.2 lines 1160-1165: Validate Dataset/Directory data entity
   */
  private validateDatasetEntity(
    entity: any,
    errors: string[],
    warnings: string[]
  ): void {
    const entityId = entity["@id"];

    // Line 1162: @type MUST be Dataset or array where Dataset is one value
    // Already validated by isDatasetType check

    // Line 1163-1164: For attached crates, @id should end with /
    const isLocalDataset =
      !entityId.startsWith("#") &&
      !entityId.startsWith("http") &&
      !entityId.startsWith("_:");

    if (isLocalDataset) {
      if (!entityId.endsWith("/")) {
        warnings.push(
          `Dataset "${entityId}" @id should end with / (line 1164)`
        );
      }
    }

    // Line 1169: Dataset entities SHOULD have name and description
    if (!entity.name) {
      warnings.push(
        `Dataset "${entityId}" should have name property (line 1169)`
      );
    }

    // Line 1177: Datasets with # @id are not data entities but can describe file sets
    if (entityId.startsWith("#") && !entity.description) {
      warnings.push(
        `Dataset "${entityId}" with # @id should have description property (line 1177)`
      );
    }

    // Line 1175: Directories on the web SHOULD have distribution
    if (entityId.startsWith("http") && !entity.distribution) {
      warnings.push(
        `Web-based Dataset "${entityId}" should have distribution property (line 1175)`
      );
    }
  }

  /**
   * RO-Crate 1.2 line 907: Validate PropertyValue identifier
   */
  private validatePropertyValueIdentifier(
    entity: any,
    entityId: string,
    errors: string[],
    warnings: string[]
  ): void {
    const identifier = entity.identifier;
    if (!identifier) return;

    const identifiers = Array.isArray(identifier) ? identifier : [identifier];
    identifiers.forEach((id: any, index: number) => {
      if (typeof id === "object" && id["@type"] === "PropertyValue") {
        if (!id.value) {
          errors.push(
            `Entity "${entityId}" identifier[${index}] PropertyValue must have a human-readable value (line 907)`
          );
        }
      }
    });
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
