import { Folder } from "../../model/Folder/Folder";
import { Project } from "../../model/Project/Project";
import { Person } from "../../model/Project/Person/Person";
import { FieldDefinition } from "../../model/field/FieldDefinition";
import { RoCrateLanguages } from "./RoCrateLanguages";
import {
  getVocabularyMapping,
  createTermDefinition,
  getTermSets,
  getCustomUri,
  isLdacIdentifier
} from "./RoCrateUtils";

/**
 * Context object passed to field handlers.
 * Contains all the information needed to process a field.
 */
export interface FieldHandlerContext {
  project: Project;
  folder: Folder;
  field: FieldDefinition;
  values: string[];
  folderEntry: object;
  otherEntries: object[];
  rocrateLanguages: RoCrateLanguages;
  propertyKey: string;
}

/**
 * Field handler function signature.
 * Returns true if the field was handled, false otherwise.
 */
export type FieldHandler = (context: FieldHandlerContext) => boolean;

/**
 * Handles language fields that use the "languages" handler.
 * This unified handler replaces two near-identical blocks in the original code.
 *
 * Processes both:
 * 1. Fields with explicit `handler: "languages"` in rocrate config
 * 2. Language template fields (`type: "languageChoices"` with language templates)
 *
 * @returns true if handled, false otherwise
 */
export function handleLanguageField(context: FieldHandlerContext): boolean {
  const { field, values, folderEntry, rocrateLanguages, propertyKey } = context;

  // Check if this is a language field (explicit handler or language template)
  const hasLanguageHandler = field.rocrate?.handler === "languages";
  const hasLanguageTemplate =
    field.type === "languageChoices" &&
    field.rocrate?.template?.["@id"]?.includes("#language_");

  if (!hasLanguageHandler && !hasLanguageTemplate) {
    return false;
  }

  const languageReferences: { "@id": string }[] = [];

  values.forEach((languageValue: string) => {
    // Parse language value (could be "etr" or "etr: Edolo")
    const [code] = languageValue.split(":").map((s) => s.trim());
    if (code) {
      const reference = rocrateLanguages.getLanguageReference(code);

      // Track usage
      rocrateLanguages.trackUsage(code, folderEntry["@id"] || "./");

      languageReferences.push(reference);
    }
  });

  if (languageReferences.length > 0) {
    // Check if field should be array or single object
    if (field.rocrate?.array === false) {
      folderEntry[propertyKey] = languageReferences[0];
    } else {
      folderEntry[propertyKey] = languageReferences;
    }
  } else {
    // No language values found, fallback to "und" (undetermined language)
    rocrateLanguages.getLanguageEntity("und");
    const reference = rocrateLanguages.getLanguageReference("und");
    rocrateLanguages.trackUsage("und", folderEntry["@id"] || "./");

    if (field.rocrate?.array === false) {
      folderEntry[propertyKey] = reference;
    } else {
      folderEntry[propertyKey] = [reference];
    }
  }

  return true;
}

/**
 * Handles fields with vocabularyFile (e.g., genre fields).
 * Creates DefinedTerm entries and references for vocabulary-based fields.
 *
 * @returns true if handled, false otherwise
 */
export function handleVocabularyField(context: FieldHandlerContext): boolean {
  const { project, field, values, folderEntry, otherEntries, propertyKey } =
    context;

  if (!field.vocabularyFile) {
    return false;
  }

  const termValues = values[0]
    .split(",")
    .map((term) => term.trim())
    .filter((term) => term);
  const termReferences: { "@id": string }[] = [];
  const termDefinitions: object[] = [];
  let hasLdacTerms = false;
  let hasCustomTerms = false;

  for (const termId of termValues) {
    try {
      // Get project title for custom ID generation
      const projectTitle =
        project.metadataFile?.getTextProperty("title") || "unknown-project";

      const mapping = getVocabularyMapping(
        termId,
        field.vocabularyFile,
        projectTitle
      );
      termReferences.push({ "@id": mapping.id });
      termDefinitions.push(createTermDefinition(mapping));

      if (isLdacIdentifier(mapping.id)) {
        hasLdacTerms = true;
      } else {
        hasCustomTerms = true;
      }
    } catch (error) {
      // If vocabulary loading fails, treat as custom term
      console.warn(`Failed to load vocabulary for ${termId}:`, error);

      // Fallback to creating a custom term directly (this should rarely happen now)
      const projectTitle =
        project.metadataFile?.getTextProperty("title") || "unknown-project";
      const customId = getCustomUri(`genre/${termId}`, projectTitle);

      termReferences.push({ "@id": customId });
      termDefinitions.push({
        "@id": customId,
        "@type": "DefinedTerm",
        name: termId,
        description: `Custom term: ${termId}`,
        inDefinedTermSet: { "@id": "#CustomGenreTerms" }
      });
      hasCustomTerms = true;
    }
  }

  // Add term references to the main entry
  if (termReferences.length > 0) {
    folderEntry[propertyKey] = termReferences;
  }

  // Add term definitions and term sets to the graph
  otherEntries.push(...termDefinitions);
  otherEntries.push(...getTermSets(hasLdacTerms, hasCustomTerms));

  return true;
}

/**
 * Handles location fields with Place templates.
 * Combines location with locationRegion, locationCountry, and locationContinent.
 *
 * @returns true if handled, false otherwise
 */
export function handlePlaceField(context: FieldHandlerContext): boolean {
  const { folder, field, values, folderEntry, otherEntries, propertyKey } =
    context;

  const leafTemplate = field.rocrate?.template;
  if (!leafTemplate || leafTemplate["@type"] !== "Place") {
    return false;
  }

  if (field.key !== "location") {
    return false;
  }

  values.forEach((value: string) => {
    // Create the basic Place entity from the template
    const leaf = getElementUsingTemplate(leafTemplate, value);

    // Build description from companion location fields
    const locationParts = [
      "locationRegion",
      "locationCountry",
      "locationContinent"
    ]
      .map((key) => getOptionalFieldValue(folder, key))
      .filter((part): part is string => part !== null);

    // Add description if we have location parts
    if (locationParts.length > 0) {
      leaf["description"] = `Located in ${locationParts.join(", ")}`;
    }

    otherEntries.push(leaf);
    const reference = leaf["@id"];

    if (field.rocrate?.array) {
      if (!folderEntry[propertyKey]) folderEntry[propertyKey] = [];
      folderEntry[propertyKey].push({ "@id": reference });
    } else {
      folderEntry[propertyKey] = { "@id": reference };
    }
  });

  return true;
}

/**
 * Handles fields with rocrate templates (non-language, non-Place).
 * Creates graph entries from templates and links them to the folder entry.
 *
 * @returns true if handled, false otherwise
 */
export function handleDefaultTemplateField(
  context: FieldHandlerContext
): boolean {
  const { field, values, folderEntry, otherEntries, propertyKey } = context;

  const leafTemplate = field.rocrate?.template;
  if (!leafTemplate) {
    return false;
  }

  // Skip Place templates - handled by handlePlaceField
  if (leafTemplate["@type"] === "Place" && field.key === "location") {
    return false;
  }

  // Skip language templates - handled by handleLanguageField
  if (
    field.type === "languageChoices" &&
    leafTemplate["@id"]?.includes("#language_")
  ) {
    return false;
  }

  values.forEach((value: string) => {
    // Create a graph entry from the template filled with the value
    const leaf = getElementUsingTemplate(leafTemplate, value);
    otherEntries.push(leaf);
    const reference = leaf["@id"];

    if (field.rocrate?.array) {
      if (!folderEntry[propertyKey]) folderEntry[propertyKey] = [];
      folderEntry[propertyKey].push({ "@id": reference });
    } else {
      folderEntry[propertyKey] = { "@id": reference };
    }
  });

  return true;
}

/**
 * Handles fields that have a rocrate.key but no template.
 * Simply assigns the value directly with the specified property name.
 *
 * @returns true if handled, false otherwise
 */
export function handleRocrateKeyField(context: FieldHandlerContext): boolean {
  const { field, values, folderEntry, propertyKey } = context;

  // Must have rocrate config but no template
  if (!field.rocrate || field.rocrate.template) {
    return false;
  }

  // Already handled by vocabulary or language handlers
  if (field.vocabularyFile || field.rocrate.handler) {
    return false;
  }

  folderEntry[propertyKey] = values[0];
  return true;
}

/**
 * Handles plain value fields without rocrate definitions.
 * Maps to standard RO-Crate/schema.org properties where appropriate.
 *
 * @returns true if handled, false otherwise
 */
export function handlePlainValueField(context: FieldHandlerContext): boolean {
  const { folder, field, values, folderEntry, propertyKey } = context;

  // Skip fields that should be handled by other mechanisms
  if (field.rocrate) {
    return false;
  }

  // Skip certain fields that are redundant or handled elsewhere
  if (field.key === "access") {
    // Access is now handled through the license system
    return true;
  }
  if (field.key === "collectionDescription") {
    // collectionDescription is mapped to the standard 'description' property
    return true;
  }
  if (field.key === "title" && folderEntry["name"]) {
    // Skip redundant title property when it's identical to name
    const titleValue = values[0];
    const nameValue = folderEntry["name"];
    if (titleValue === nameValue) {
      return true;
    }
  }
  // Skip non-standard properties
  if (
    field.key === "status" ||
    field.key === "topic" ||
    field.key === "id" ||
    field.key === "locationRegion" ||
    field.key === "locationCountry" ||
    field.key === "locationContinent" ||
    field.key === "country" ||
    field.key === "continent"
  ) {
    return true;
  }

  // Skip isAdditional fields that don't have rocrate definitions
  const fieldDef = folder.metadataFile!.properties.getFieldDefinition?.(
    field.key
  );
  if (fieldDef && fieldDef.isAdditional) {
    console.warn(
      `Skipping additional field '${field.key}' in RO-Crate export: no rocrate definition`
    );
    return true;
  }

  // Map 'date' to 'dateCreated' for compliance with the profile
  if (field.key === "date") {
    folderEntry["dateCreated"] = values[0];
  } else {
    folderEntry[propertyKey] = values[0];
  }

  return true;
}

/**
 * Determines if a field should be skipped entirely.
 * Consolidates all skip-field logic in one place.
 */
export function shouldSkipField(
  field: FieldDefinition,
  folder: Folder,
  values: string[]
): boolean {
  // Skip deprecated/migrated fields
  if (field.deprecated && field.deprecated.indexOf("migrated") > -1) {
    return true;
  }

  // Skip archive configuration field (handled via holdingArchive)
  if (field.key === "archiveConfigurationName") {
    return true;
  }

  // Skip depositor field (handled via ldac:depositor)
  if (field.key === "depositor") {
    return true;
  }

  // Skip empty fields (except language fields which need "und" fallback)
  const isLanguageField = field.rocrate?.handler === "languages";
  if (
    (values.length === 0 || values[0] === "unspecified") &&
    !isLanguageField
  ) {
    return true;
  }

  // Skip PII fields for Person entities
  if (folder instanceof Person && field.personallyIdentifiableInformation) {
    return true;
  }

  return false;
}

/**
 * Gets field values with proper handling for different field types.
 */
export function getFieldValues(
  folder: Folder,
  field: FieldDefinition
): string[] {
  if (field.omitExport) return [];

  if (field.rocrate?.handler === "languages") {
    // Handle languages for any folder type (Project, Session, Person)
    const languageString =
      folder.metadataFile?.properties.getTextStringOrEmpty(field.key) || "";
    return languageString
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  } else {
    const v = folder.metadataFile?.properties.getHasValue(field.key)
      ? folder.metadataFile?.getTextProperty(field.key, "").trim()
      : "";

    // Check if this is a language-related field with a template (no handler)
    if (v && field.rocrate?.template && field.type === "languageChoices") {
      // Parse as languages: split by semicolon and trim
      return v
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    return v ? [v] : [];
  }
}

/**
 * Creates a graph element using a template and a value.
 */
export function getElementUsingTemplate(
  template: object,
  value: string
): object {
  const output = {};
  Object.keys(template).forEach((key) => {
    let replacedValue = template[key];

    // For language-related templates, extract just the language code from "code: Name" format
    const extractLanguageCode = (langValue: string): string => {
      // Handle "etr: Edolo" format - extract just "etr"
      const [code] = langValue.split(":").map((s) => s.trim());
      return code || langValue;
    };

    // Replace [v] with the value - but for @id fields with #language_ prefix, use just the code
    if (replacedValue.includes("[v]")) {
      let replacementValue = value;

      // Special handling for language @id fields
      if (key === "@id" && replacedValue.includes("#language_")) {
        replacementValue = extractLanguageCode(value);
      }

      replacedValue = replacedValue.replace("[v]", replacementValue);
    }

    // Replace [code] with sanitized language code for language templates
    if (replacedValue.includes("[code]")) {
      const sanitizedCode = sanitizeLanguageCode(extractLanguageCode(value));
      replacedValue = replacedValue.replace("[code]", sanitizedCode);
    }

    output[key] = replacedValue;
  });

  return output;
}

/**
 * Sanitizes a language code for use as an IRI fragment.
 */
function sanitizeLanguageCode(code: string): string {
  // If already starts with #language_, don't add another prefix
  if (code.startsWith("#language_")) {
    return code;
  }
  // Remove spaces and colons, replace with underscores for valid IDs
  return "#language_" + code.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Retrieves an optional field value from a folder, returning null if the field
 * doesn't exist or has no meaningful value.
 *
 * This helper encapsulates the common pattern of:
 * 1. Trying to get a field value (which may throw if the field doesn't exist)
 * 2. Validating the value is non-empty and not "unspecified"
 * 3. Returning the trimmed value or null
 *
 * @param folder - The folder containing the metadata
 * @param fieldKey - The key of the field to retrieve
 * @returns The trimmed field value, or null if not available
 */
export function getOptionalFieldValue(
  folder: Folder,
  fieldKey: string
): string | null {
  try {
    const field = folder.metadataFile!.properties.getValueOrThrow(fieldKey);
    if (field?.text?.trim() && field.text !== "unspecified") {
      return field.text.trim();
    }
  } catch {
    // Field doesn't exist, skip
  }
  return null;
}
