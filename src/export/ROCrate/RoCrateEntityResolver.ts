import { Project } from "../../model/Project/Project";

/**
 * RoCrateEntityResolver.ts
 *
 * LAM-84: This module centralizes entity reference resolution for RO-Crate export.
 * It consolidates the nearly-identical resolvePublisher and resolveDepositor patterns
 * into a single, generalized approach.
 *
 * Entity references in RO-Crate are JSON-LD references of the form { "@id": "#some-id" }
 * that point to entities defined elsewhere in the @graph.
 */

/**
 * Result of resolving an entity reference.
 */
export interface EntityResolution<T extends RoCrateEntity = RoCrateEntity> {
  /** The reference to use in the parent entity */
  reference: { "@id": string };
  /** The entity definition to add to the graph */
  entity: T;
}

/**
 * Base RO-Crate entity type.
 */
export type RoCrateEntity = {
  "@id": string;
  "@type": string | string[];
  name?: string;
  [key: string]: unknown;
};

/**
 * Configuration for resolving an entity reference from a project field.
 */
interface EntityResolverConfig {
  /** The project field key to read the value from */
  fieldKey: string;
  /** The prefix for the generated @id (e.g., "#publisher-", "#depositor-") */
  idPrefix: string;
  /** The @type to assign to the created entity */
  entityType: "Person" | "Organization";
  /** Values to treat as empty/invalid (case-insensitive) */
  emptyValues?: string[];
}

/**
 * Resolves an entity reference from a project field value.
 *
 * This is a generalized function that replaces the near-duplicate
 * resolvePublisher and resolveDepositor functions.
 *
 * @param project - The project to read the field from
 * @param config - Configuration for the resolver
 * @returns The resolved entity reference, or undefined if the field is empty/invalid
 */
export function resolveEntityReference(
  project: Project,
  config: EntityResolverConfig
): EntityResolution | undefined {
  const rawValue = project.metadataFile
    ?.getTextProperty(config.fieldKey, "")
    .trim();

  if (!rawValue) {
    return undefined;
  }

  // Check for empty/invalid values
  const emptyValues = config.emptyValues || [];
  const loweredValue = rawValue.toLowerCase();
  if (emptyValues.some((v) => v.toLowerCase() === loweredValue)) {
    return undefined;
  }

  // Generate a URL-safe slug from the value
  const slug = generateSlug(rawValue);
  const entityId = `${config.idPrefix}${slug}`;

  return {
    reference: { "@id": entityId },
    entity: {
      "@id": entityId,
      "@type": config.entityType,
      name: rawValue
    }
  };
}

/**
 * Generates a URL-safe slug from a string value.
 * Used for creating @id values from entity names.
 *
 * Note: This deliberately does NOT use sanitizeForIri because that function
 * URL-encodes characters (e.g., space -> %20). For @id fragments, we want
 * human-readable slugs with hyphens instead.
 */
function generateSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .trim() || "unknown"
  );
}

/**
 * Resolves the publisher entity from a project's archive configuration.
 *
 * The publisher is derived from the archiveConfigurationName field.
 * See: https://linear.app/lameta/issue/LAM-35/ro-crate-4-publisher-metadata
 *
 * @param project - The project to resolve the publisher from
 * @returns The resolved publisher entity, or undefined if not available
 */
export function resolvePublisher(
  project: Project
): EntityResolution | undefined {
  return resolveEntityReference(project, {
    fieldKey: "archiveConfigurationName",
    idPrefix: "#publisher-",
    entityType: "Organization",
    emptyValues: ["default", "unknown"]
  });
}

/**
 * Resolves the depositor entity from a project.
 *
 * The depositor is the person who deposited the collection with the archive.
 * See: https://linear.app/lameta/issue/LAM-39/ro-crate-root-dataset-depositor-handling
 *
 * @param project - The project to resolve the depositor from
 * @returns The resolved depositor entity, or undefined if not available
 */
export function resolveDepositor(
  project: Project
): EntityResolution | undefined {
  return resolveEntityReference(project, {
    fieldKey: "depositor",
    idPrefix: "#depositor-",
    entityType: "Person",
    emptyValues: []
  });
}

/**
 * Gets the contact person reference for a project.
 *
 * This extracts the contact person field and returns either:
 * - A direct string reference to the person name (for resolved contacts)
 * - A reference to #unknown-contributor (for unknown/empty contacts)
 *
 * @param project - The project to get the contact person from
 * @returns Object with the reference and a flag indicating if it's unknown
 */
export function getContactPersonReference(project: Project): {
  reference: string | { "@id": string };
  isUnknown: boolean;
} {
  const rawValue =
    project.metadataFile?.getTextProperty("contactPerson", "") ?? "";
  const trimmedValue = rawValue.trim();
  const contactPersonText = trimmedValue || "Unknown";
  const isUnknownContact = contactPersonText === "Unknown";
  const reference = isUnknownContact
    ? { "@id": "#unknown-contributor" }
    : contactPersonText;

  return { reference, isUnknown: isUnknownContact };
}

/**
 * Sets contact person properties on an entry.
 *
 * LAM-84: This consolidates the duplicated pattern of setting
 * author, accountablePerson, and dct:rightsHolder to the contact person.
 *
 * @param entry - The entry to set properties on
 * @param contactPersonReference - The contact person reference value
 */
export function setContactPersonProperties(
  entry: Record<string, unknown>,
  contactPersonReference: string | { "@id": string }
): void {
  entry.author = contactPersonReference;
  entry.accountablePerson = contactPersonReference;
  entry["dct:rightsHolder"] = contactPersonReference;
}

/**
 * Creates the unknown contributor entity.
 * Used when no contact person is specified.
 */
export function createUnknownContributorEntity(): RoCrateEntity {
  return {
    "@id": "#unknown-contributor",
    "@type": "Person",
    name: "Unknown"
  };
}
