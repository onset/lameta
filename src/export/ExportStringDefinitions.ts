/**
 * Centralized definitions for fixed strings used in IMDI export.
 * These are titles and descriptions for pseudo-session bundles
 * (DescriptionDocuments, OtherDocuments, ConsentDocuments).
 *
 * Each definition includes context to help translators understand
 * what the string is for.
 */

export interface ExportStringDefinition {
  /** The English text - this is also the key for translation lookups */
  english: string;
  /** Context to help translators understand what this string is for */
  context: string;
  /** Category for grouping in the UI */
  category: "bundle-title" | "bundle-description" | "bundle-access-description";
}

/**
 * All export string definitions with their English text and translator context.
 */
const ExportStringCatalog = {
  DescriptionDocuments: {
    title: {
      english: "Description Documents",
      context: "Title for Description Documents bundle",
      category: "bundle-title"
    },
    description: {
      english:
        "This bundle contains descriptive documents about the documentation project.",
      context: "Description for the Description Documents bundle.",
      category: "bundle-description"
    }
  },
  OtherDocuments: {
    title: {
      english: "Other Documents",
      context: "Title for the Other Documents bundle.",
      category: "bundle-title"
    },
    description: {
      english: "This bundle contains other project documents.",
      context: "Description of the Other Documents bundle.",
      category: "bundle-description"
    }
  },
  ConsentDocuments: {
    title: {
      english: "Documentation of consent for the contributors to this collection",
      context: "Title for the Consent Documents bundle.",
      category: "bundle-title"
    },
    description: {
      english:
        "This bundle contains media demonstrating informed consent for sessions in this collection.",
      context: "Description for the Consent Documents bundle.",
      category: "bundle-description"
    },
    accessDescription: {
      english: "Consent documents",
      context:
        "Access description used on each consent file in the Consent Documents bundle.",
      category: "bundle-access-description"
    }
  }
} as const;

export const EXPORT_STRING_DEFINITIONS: ExportStringDefinition[] = [
  ExportStringCatalog.DescriptionDocuments.title,
  ExportStringCatalog.DescriptionDocuments.description,
  ExportStringCatalog.OtherDocuments.title,
  ExportStringCatalog.OtherDocuments.description,
  ExportStringCatalog.ConsentDocuments.title,
  ExportStringCatalog.ConsentDocuments.description,
  ExportStringCatalog.ConsentDocuments.accessDescription
];

/**
 * Convenience array of just the English strings (for use in VocabularyScanner).
 */
export const HARDCODED_EXPORT_STRINGS: string[] = EXPORT_STRING_DEFINITIONS.map(
  (d) => d.english
);

/**
 * Get the context/help text for a given export string.
 * Returns undefined if not found.
 */
export function getExportStringContext(english: string): string | undefined {
  return EXPORT_STRING_DEFINITIONS.find((d) => d.english === english)?.context;
}

/**
 * Bundle-specific string accessors for type-safe access.
 */
export const ExportStrings = {
  DescriptionDocuments: {
    title: ExportStringCatalog.DescriptionDocuments.title.english,
    description: ExportStringCatalog.DescriptionDocuments.description.english
  },
  OtherDocuments: {
    title: ExportStringCatalog.OtherDocuments.title.english,
    description: ExportStringCatalog.OtherDocuments.description.english
  },
  ConsentDocuments: {
    title: ExportStringCatalog.ConsentDocuments.title.english,
    description: ExportStringCatalog.ConsentDocuments.description.english,
    accessDescription: ExportStringCatalog.ConsentDocuments.accessDescription.english
  }
} as const;
