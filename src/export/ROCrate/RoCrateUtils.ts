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
 * Uses the standard encodeURIComponent function and additionally encodes
 * parentheses, which can cause issues in file paths and IRIs even though
 * they are technically allowed by RFC 3986.
 */
export function sanitizeForIri(input: string | undefined): string {
  if (!input) {
    return ""; // Return empty string for null, undefined, or empty input
  }
  // Use encodeURIComponent for standard encoding, then encode parentheses
  // which are allowed by RFC 3986 but can cause issues in practice
  return encodeURIComponent(input)
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/!/g, "%21");
}

/**
 * Creates a fragment identifier with a prefix and sanitized value.
 * This is the base helper for generating consistent RO-Crate entity IDs.
 * @param prefix - The type prefix (e.g., 'session', 'contributor')
 * @param value - The value to sanitize and append
 * @returns A fragment identifier in the format `#prefix-sanitizedValue`
 */
export function createFragmentId(prefix: string, value: string): string {
  const sanitized = value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
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
      // LAM-60: https://linear.app/lameta/issue/LAM-60/wrong-id-for-lameta-project-file-sprj
      // This is a Project. Project files (like .sprj) live at the RO-Crate root
      // alongside ro-crate-metadata.json, so they need root-relative @id values (./...).
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
 * Creates a consistent Person ID for RO-Crate entities.
 * Person IDs use a bare fragment without a prefix per LDAC guidance.
 */
export function createPersonId(person: any): string {
  const baseValue = (person?.filePrefix || "person") as string;
  const normalized = baseValue
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const fragment = normalized.length > 0 ? normalized : "person";
  return `#${fragment}`;
}

/**
 * Creates a consistent fragment identifier for unresolved contributors.
 * Unresolved contributors are people mentioned in sessions who don't have
 * matching Person records in the project. Uses createFragmentId for consistency.
 */
export function createUnresolvedContributorId(contributorName: string): string {
  return createFragmentId("contributor", contributorName);
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
