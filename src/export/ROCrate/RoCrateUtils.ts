import * as Path from "path";
import * as fs from "fs";
import { locateDependencyForFilesystemCall } from "../../other/locateDependency";

export interface VocabularyDefinition {
  id: string;
  label: string;
  definition: string;
  examples?: string[];
  mapping?: { vocabulary: string; term: string }[];
}

interface CachedVocabulary {
  data: VocabularyDefinition[];
  lastModified: number;
}

// Cache for vocabulary files
const vocabularyCache = new Map<string, CachedVocabulary>();

/**
 * Sanitizes a string for use in an IRI (Internationalized Resource Identifier).
 * Replaces invalid characters like spaces and parentheses with valid alternatives.
 * Per RFC 3987, IRIs must not contain certain characters unless percent-encoded.
 */
export function sanitizeForIri(input: string | undefined): string {
  if (!input) {
    return ""; // Return empty string for null, undefined, or empty input
  }
  return (
    input
      // URL encode spaces (and other special characters) for proper IRI compliance
      .replace(/\s+/g, "%20")
      // Replace parentheses with URL encoding
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
      // Replace exclamation marks with URL encoding
      .replace(/!/g, "%21")
  );
}

/**
 * Creates a consistent file ID for RO-Crate entities.
 * This centralizes the logic for generating file @id values to ensure
 * consistency between file entities and their hasPart references.
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
 * This centralizes the logic for generating Session @id values.
 */
export function createSessionId(session: any): string {
  return `Sessions/${sanitizeForIri(session.filePrefix)}/`;
}

/**
 * Creates a consistent Person ID for RO-Crate entities.
 * This centralizes the logic for generating Person @id values.
 */
export function createPersonId(person: any): string {
  return `People/${sanitizeForIri(person.filePrefix)}/`;
}

export async function getVocabularyMapping(
  termId: string,
  vocabularyFile: string,
  projectTitle?: string
): Promise<{
  id: string;
  term: string;
  originalTerm: string;
  definition: VocabularyDefinition | null;
}> {
  const vocabularyData = await loadVocabularyFile(vocabularyFile);

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
    return {
      id: ldacMapping.term,
      term: ldacMapping.term,
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

    if (mapping.id.startsWith("ldac:")) {
      result.inDefinedTermSet = { "@id": "ldac:LinguisticGenreTerms" };
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
      "@id": "ldac:LinguisticGenreTerms",
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

async function loadVocabularyFile(
  vocabularyFile: string
): Promise<VocabularyDefinition[]> {
  const now = Date.now();
  const cached = vocabularyCache.get(vocabularyFile);

  // Check if we have a cached version that's still valid
  if (cached && now - cached.lastModified < 1000) {
    // 1 second cache
    return cached.data;
  }

  try {
    // Use the proper path resolution for vocabulary files
    const vocabularyPath = locateDependencyForFilesystemCall(
      `dist/vocabularies/${vocabularyFile}`
    );

    // Check if the file exists
    if (!fs.existsSync(vocabularyPath)) {
      throw new Error(`Vocabulary file not found: ${vocabularyPath}`);
    }

    // Read and parse the JSON file
    const fileContent = fs.readFileSync(vocabularyPath, "utf-8");
    const data = JSON.parse(fileContent) as VocabularyDefinition[];

    // Cache the data
    vocabularyCache.set(vocabularyFile, {
      data,
      lastModified: now
    });

    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Vocabulary file not found")) {
        throw error;
      } else if (error.message.includes("JSON")) {
        throw new Error(
          `Failed to parse vocabulary file ${vocabularyFile}: ${error.message}`
        );
      } else {
        throw new Error(
          `Failed to load vocabulary file ${vocabularyFile}: ${error.message}`
        );
      }
    }
    throw new Error(`Unknown error loading vocabulary file: ${vocabularyFile}`);
  }
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
