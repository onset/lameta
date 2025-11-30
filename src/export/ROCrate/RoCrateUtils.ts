import * as Path from "path";
import genresData from "../../model/Project/Session/genres.json";

export const LDAC_TERMS_NAMESPACE = "https://w3id.org/ldac/terms#";

export function expandLdacId(value: string): string {
  if (!value) {
    return value;
  }

  if (value.startsWith("ldac:")) {
    return value;
  }

  if (value.startsWith(LDAC_TERMS_NAMESPACE)) {
    return `ldac:${value.substring(LDAC_TERMS_NAMESPACE.length)}`;
  }

  return value;
}

export function isLdacIdentifier(value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }

  return value.startsWith("ldac:") || value.startsWith(LDAC_TERMS_NAMESPACE);
}

export interface VocabularyDefinition {
  id: string;
  label: string;
  definition: string;
  examples?: string[];
  mapping?: { vocabulary: string; term: string }[];
}

// Get vocabulary definitions directly from imported data
function getVocabularyData(vocabularyFile: string): VocabularyDefinition[] {
  // For now, we only support genres.json, but this could be extended
  // to support other vocabulary files in the future
  if (vocabularyFile === "genres.json") {
    return genresData as VocabularyDefinition[];
  }

  throw new Error(`Unsupported vocabulary file: ${vocabularyFile}`);
}

/**
 * Sanitizes a string for use in an IRI (Internationalized Resource Identifier).
 * Per RFC 3987, IRIs allow Unicode characters directly, so we only encode
 * characters that are actually problematic:
 * - Spaces -> %20 (percent-encoded, reversible via decodeURIComponent)
 * - Reserved delimiters that conflict with IRI structure: # ? /
 * - Parentheses (can cause issues in some contexts)
 *
 * Non-Latin characters (é, ñ, 中文, العربية, etc.) are preserved as-is
 * since they are valid in IRIs.
 *
 * IMPORTANT: We use percent-encoding (%20) for spaces instead of underscores
 * so that the original path can be recovered via decodeURIComponent() when
 * generating HTML src/href attributes that need to point to actual files.
 */
export function sanitizeForIri(input: string | undefined): string {
  if (!input) {
    return ""; // Return empty string for null, undefined, or empty input
  }
  return input
    .replace(/ /g, "%20") // Spaces to %20 (reversible encoding)
    .replace(/#/g, "%23") // Hash would start a new fragment
    .replace(/\?/g, "%3F") // Question mark would start query string
    .replace(/\//g, "%2F") // Slash would be path separator
    .replace(/\(/g, "%28") // Parentheses can cause issues
    .replace(/\)/g, "%29");
}

/**
 * Creates a fragment identifier with a prefix and sanitized value.
 * This is the base helper for generating consistent RO-Crate entity IDs.
 * @param prefix - The type prefix (e.g., 'session', 'contributor')
 * @param value - The value to sanitize and append
 * @returns A fragment identifier in the format `#prefix-sanitizedValue`
 *
 * Uses sanitizeForIri() for proper handling of non-Latin characters via
 * percent-encoding, ensuring consistent IDs across all character sets.
 */
export function createFragmentId(prefix: string, value: string): string {
  const trimmed = value.trim();
  // Use sanitizeForIri for proper encoding of special and non-Latin characters
  // This preserves the original information via percent-encoding (e.g., "محمد" -> "%D9%85...")
  const sanitized = sanitizeForIri(trimmed);
  const fragment = sanitized.length > 0 ? sanitized : prefix;
  return `#${prefix}-${fragment}`;
}

/**
 * Creates a consistent file ID for RO-Crate entities.
 * Unlike other entity IDs, file IDs use path-based identifiers rather than
 * fragment identifiers because they reference actual files in the crate.
 */
export function createFileId(folder: any, fileName: string): string {
  const sanitizedFileName = sanitizeForIri(fileName);

  // Use duck typing to check folder type since we can't import the classes here
  // to avoid circular dependencies
  if (folder.filePrefix !== undefined) {
    if (folder.getAllContributionsToAllFiles !== undefined) {
      // This is a Session
      return `Sessions/${sanitizeForIri(
        folder.filePrefix
      )}/${sanitizedFileName}`;
    } else if (folder.sessions !== undefined) {
      // This is a Project. Project files (like .sprj) live at the RO-Crate root alongside
      // ro-crate-metadata.json, so they need root-relative @id values (./...).
      return `./${sanitizedFileName}`;
    } else if (folder.knownFields !== undefined && folder.files !== undefined) {
      // This is a Person
      return `People/${sanitizeForIri(folder.filePrefix)}/${sanitizedFileName}`;
    }
  }

  // Default case for other folder types
  return sanitizedFileName;
}

/**
 * Creates a consistent Session ID for RO-Crate entities.
 * Uses createFragmentId to ensure consistent fragment identifier format.
 */
export function createSessionId(session: any): string {
  const baseValue = (session?.filePrefix || "session").toString();
  const sanitized = sanitizeForIri(baseValue) || "session";
  return `#session-${sanitized}`;
}

/**
 * Creates a consistent session directory Dataset ID.
 * LAM-100: https://linear.app/lameta/issue/LAM-100/new-session-structure
 *
 * The session directory Dataset contains files and is linked to its
 * corresponding CollectionEvent via about/subjectOf relationships.
 *
 * Format: Sessions/{sanitized-filePrefix}/
 * Uses sanitizeForIri to handle special characters properly.
 */
export function createSessionDirectoryId(session: any): string {
  const baseValue = (session?.filePrefix || "session").toString();
  const sanitized = sanitizeForIri(baseValue) || "session";
  return `Sessions/${sanitized}/`;
}

/**
 * Creates a consistent Person ID for RO-Crate entities.
 * Person IDs use a bare fragment without a prefix per LDAC guidance.
 * Uses sanitizeForIri() for proper handling of non-Latin characters via
 * percent-encoding, ensuring consistent IDs across all character sets.
 */
export function createPersonId(person: any): string {
  const baseValue = (person?.filePrefix || "person") as string;
  // Use sanitizeForIri to handle non-Latin characters properly (e.g., "محمد" -> "%D9%85...")
  const sanitized = sanitizeForIri(baseValue.trim()) || "person";
  return `#${sanitized}`;
}

/**
 * Creates a consistent Dataset ID for grouping a person's files.
 * LAM-98: https://linear.app/lameta/issue/LAM-98/dataset-for-each-person
 * This creates an intermediate Dataset to group all files associated with a person
 * (photos, consent forms, .person metadata files) under a single container.
 * Format: #<sanitized-name>-files
 * Non-Latin characters are properly encoded via sanitizeForIri().
 */
export function createPersonFilesDatasetId(person: any): string {
  const baseValue = (person?.filePrefix || "person") as string;
  // Use sanitizeForIri to handle non-Latin characters properly
  const sanitized = sanitizeForIri(baseValue);
  return `#${sanitized}-files`;
}

/**
 * Creates a consistent fragment identifier for unresolved contributors.
 * Unresolved contributors are people mentioned in sessions who don't have
 * matching Person records in the project. Uses a bare fragment identifier
 * (e.g., #Hatton) to match the format used for Person IDs with folders.
 */
export function createUnresolvedContributorId(contributorName: string): string {
  const trimmed = contributorName.trim();
  const sanitized = sanitizeForIri(trimmed) || "contributor";
  return `#${sanitized}`;
}

export function getVocabularyMapping(
  termId: string,
  vocabularyFile: string,
  projectTitle?: string
): {
  id: string;
  term: string;
  originalTerm: string;
  definition: VocabularyDefinition | null;
} {
  const vocabularyData = getVocabularyData(vocabularyFile);

  // First try to find by id (exact match)
  let term = vocabularyData.find((item) => item.id === termId);

  // If not found, try to find by label (case-insensitive)
  if (!term) {
    term = vocabularyData.find(
      (item) => item.label.toLowerCase() === termId.toLowerCase()
    );
  }

  if (!term) {
    // Return custom term ID
    const customId = createCustomTermId(termId, projectTitle);
    return {
      id: customId,
      term: customId,
      originalTerm: termId,
      definition: null
    };
  }

  // Check if it has an LDAC mapping
  const ldacMapping = term.mapping?.find((m) => m.vocabulary === "LDAC");
  if (ldacMapping) {
    const expandedLdacId = expandLdacId(ldacMapping.term);
    return {
      id: expandedLdacId,
      term: expandedLdacId,
      originalTerm: termId,
      definition: term
    };
  }

  // Create custom term ID if no LDAC mapping
  const customId = createCustomTermId(term.label, projectTitle);
  return {
    id: customId,
    term: customId,
    originalTerm: termId,
    definition: term
  };
}

export function createTermDefinition(mapping: {
  id: string;
  term: string;
  originalTerm: string;
  definition: VocabularyDefinition | null;
}): any {
  if (mapping.definition) {
    // Use the definition from vocabulary file
    const result: any = {
      "@id": mapping.id,
      "@type": "DefinedTerm",
      name: mapping.definition.label,
      description: mapping.definition.definition
    };

    if (isLdacIdentifier(mapping.id)) {
      result.inDefinedTermSet = {
        "@id": expandLdacId("ldac:LinguisticGenreTerms")
      };
    } else {
      result.inDefinedTermSet = { "@id": "#CustomGenreTerms" };
    }

    return result;
  } else {
    // Custom term not in vocabulary file - create a basic definition
    const originalTerm = mapping.originalTerm;
    // Clean up the name for display - remove angle brackets from unknown terms
    const cleanName = originalTerm === "<Unknown>" ? "Unknown" : originalTerm;

    return {
      "@id": mapping.id,
      "@type": "DefinedTerm",
      name: cleanName,
      description: `Custom term: ${cleanName}`,
      inDefinedTermSet: { "@id": "#CustomGenreTerms" }
    };
  }
}

export function getTermSets(
  hasLdacTerms: boolean,
  hasCustomTerms: boolean
): any[] {
  const termSets: any[] = [];

  if (hasLdacTerms) {
    termSets.push({
      "@id": expandLdacId("ldac:LinguisticGenreTerms"),
      "@type": "DefinedTermSet",
      name: "Linguistic Genre Terms"
    });
  }

  if (hasCustomTerms) {
    termSets.push({
      "@id": "#CustomGenreTerms",
      "@type": "DefinedTermSet",
      name: "Custom Project Genres"
    });
  }

  return termSets;
}

export function getCustomUri(path: string, projectTitle?: string): string {
  if (projectTitle) {
    return `tag:lameta,${projectTitle}:${path}`;
  }

  // Fallback for when no project title is available - extract the last part for ID generation
  const lastSegment = path.split("/").pop() || path;
  return (
    "#" +
    lastSegment
      .split(/[^a-zA-Z0-9]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("")
  );
}

function createCustomTermId(termLabel: string, projectTitle?: string): string {
  // Check for unknown/placeholder values and use simplified ID
  const normalizedTerm = termLabel.toLowerCase().trim();
  if (
    normalizedTerm === "unknown" ||
    normalizedTerm === "unspecified" ||
    normalizedTerm === "<unknown>" ||
    normalizedTerm === "" ||
    normalizedTerm === "null" ||
    normalizedTerm === "undefined"
  ) {
    return "tag:lameta/unknown";
  }

  return getCustomUri(`genre/${termLabel}`, projectTitle);
}

// ============================================================================
// Containment Relationship Utilities
// ============================================================================
// These utilities handle hasPart/isPartOf relationships consistently across
// the RO-Crate export. In RO-Crate 1.2, data entities must be reachable from
// root via hasPart chain. LDAC expects hasPart/isPartOf pairs for proper
// containment representation.
// ============================================================================

/**
 * Creates a bidirectional containment relationship between parent and child entities.
 * Adds the child to the parent's hasPart array (if not skipped) and sets isPartOf on the child.
 *
 * @param parentEntry - The parent entity (Dataset, RepositoryCollection, etc.)
 * @param childEntry - The child entity (File, Dataset, etc.)
 * @param options - Optional configuration
 * @param options.skipHasPart - If true, only sets isPartOf on child (for non-owned references)
 * @param options.parentIdOverride - Use this ID instead of parent's @id for isPartOf
 */
export function linkContainment(
  parentEntry: any,
  childEntry: any,
  options?: {
    skipHasPart?: boolean;
    parentIdOverride?: string;
  }
): void {
  const parentId = options?.parentIdOverride || parentEntry["@id"];
  const childId = childEntry["@id"];

  if (!options?.skipHasPart) {
    if (!parentEntry.hasPart) {
      parentEntry.hasPart = [];
    }
    const alreadyPresent = parentEntry.hasPart.some(
      (item: any) => item["@id"] === childId
    );
    if (!alreadyPresent) {
      parentEntry.hasPart.push({ "@id": childId });
    }
  }

  childEntry.isPartOf = { "@id": parentId };
}

/**
 * Creates hasPart reference objects for multiple child IDs.
 * Use this when building a new entity with a hasPart array.
 *
 * @param childIds - Array of @id values for child entities
 * @returns Array of reference objects with @id properties
 */
export function createHasPartReferences(
  childIds: string[]
): { "@id": string }[] {
  return childIds.map((id) => ({ "@id": id }));
}

/**
 * Creates an isPartOf reference object.
 * Use this when setting the isPartOf property on a child entity.
 *
 * @param parentId - The @id of the parent entity
 * @returns Reference object with @id property
 */
export function createIsPartOfReference(parentId: string): { "@id": string } {
  return { "@id": parentId };
}

/**
 * Adds a child ID to a parent's hasPart array if not already present.
 * Creates the hasPart array if it doesn't exist.
 *
 * @param parentEntry - The parent entity
 * @param childId - The @id of the child to add
 */
export function addToHasPart(parentEntry: any, childId: string): void {
  if (!parentEntry.hasPart) {
    parentEntry.hasPart = [];
  }
  const alreadyPresent = parentEntry.hasPart.some(
    (item: any) => item["@id"] === childId
  );
  if (!alreadyPresent) {
    parentEntry.hasPart.push({ "@id": childId });
  }
}
