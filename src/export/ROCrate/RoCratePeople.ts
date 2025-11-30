import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import { Person, PersonMetadataFile } from "../../model/Project/Person/Person";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";
import { RoCrateLicense } from "./RoCrateLicenseManager";
import {
  addChildFileEntries,
  getRoCrateTemplate,
  getElementUsingTemplate,
  findFirstSessionWithDate
} from "./RoCrateExporter";
import {
  sanitizeForIri,
  createPersonId,
  createUnresolvedContributorId
} from "./RoCrateUtils";

// LDAC Profile compliant fields that should be preserved as-is
const LDAC_COMPLIANT_FIELDS = new Set([
  "name",
  "gender"
  // Add other LDAC compliant fields as needed
]);

// Fields that should be moved to description for LDAC compliance
const NON_LDAC_FIELDS = new Set([
  "education",
  "primaryOccupation",
  "birthYear" // Will be converted to ldac:age instead
]);

/**
 * Converts a Person object to be LDAC profile compliant
 * - Converts birthYear to ldac:age based on session date
 * - Moves non-profile fields to description
 * - Preserves profile-compliant fields
 */
export function makeLdacCompliantPersonEntry(
  person: Person,
  sessionDate: Date | undefined,
  personElement: any
): void {
  const descriptionParts: string[] = [];
  const existingDescription = person.metadataFile
    ?.getTextProperty("description")
    ?.trim();

  if (existingDescription) {
    descriptionParts.push(existingDescription);
  }

  // determing ldac:age by comparing the birthYear of the person with the date this session was recorded
  const birthYear = person.metadataFile?.getTextProperty("birthYear")?.trim();
  if (birthYear && sessionDate && birthYear !== "?" && birthYear !== "") {
    const age = person.ageOn(sessionDate);
    if (age && age !== "") {
      // Note: Some LLM validators will argue this should be a number. They appear to be wrong, because
      // the LDAC spec calls for http://schema.org/Text
      personElement["ldac:age"] = age;
    }
  }

  // Process known fields
  for (const field of person.knownFields) {
    // don't export if we know it has been migrated
    if (field.deprecated && field.deprecated.indexOf("migrated") > -1) {
      continue;
    }

    const value = person.metadataFile?.getTextProperty(field.key)?.trim();

    if (!value || value === "unspecified" || value === "") {
      continue;
    }

    // Skip PII fields entirely - they should not be exported to RO-Crate
    if (field.personallyIdentifiableInformation) {
      continue;
    }

    if (LDAC_COMPLIANT_FIELDS.has(field.key)) {
      // Keep LDAC compliant fields as-is
      personElement[field.key] = value;
    } else if (NON_LDAC_FIELDS.has(field.key)) {
      // Move non-LDAC fields to description, except birthYear which is handled above
      if (field.key !== "birthYear" && field.key !== "description") {
        const fieldLabel = field.englishLabel || field.key;
        descriptionParts.push(`${fieldLabel}: ${value}.`);
      }
    }
  }

  // Handle custom fields - FILTER THEM OUT since we don't know if they contain PII
  // Custom fields on Person entities are not exported to RO-Crate because
  // we cannot determine if they contain personally identifiable information.
  // This is a conservative approach to protect privacy.
  person.metadataFile?.properties.forEach((key, field) => {
    if (!field.definition.isCustom) return;

    // Skip if this was already handled as a known field
    if (person.knownFields.some((k) => k.key === key)) {
      return;
    }

    // Custom fields are completely filtered out for Person entities
    // to avoid potential PII exposure
    // Note: We do not add these to description or export them in any form
  });

  // Set the consolidated description
  if (descriptionParts.length > 0) {
    personElement["description"] = descriptionParts.join(" ");
  }
}

export async function makeEntriesFromParticipant(
  project: Project,
  session: Session,
  rocrateLicense: RoCrateLicense
) {
  const uniqueContributors: { [key: string]: Set<string> } = {};

  session.getAllContributionsToAllFiles().forEach((contribution) => {
    const personName = contribution.personReference.trim();
    const role = contribution.role.trim();

    if (!uniqueContributors[personName]) {
      uniqueContributors[personName] = new Set();
    }
    uniqueContributors[personName].add(role);
  });

  const personField = fieldDefinitionsOfCurrentConfig.common.find(
    (f) => f.key === "person"
  );
  if (!personField) {
    // If person field definition is not available, skip generating person entries
    return [];
  }
  const template = getRoCrateTemplate(personField);

  const entriesForAllContributors: object[] = [];

  // Get session date for age calculation - handle cases where session might not have proper date access
  // If this session has no date, fall back to the first session in the project that has a date
  let sessionDate: Date | undefined;
  try {
    sessionDate = session.properties?.getDateField?.("date")?.asDate?.();
  } catch (error) {
    // If session doesn't have proper date field access, sessionDate remains undefined
    sessionDate = undefined;
  }
  
  // Fall back to first dated session if current session has no date
  if (!sessionDate) {
    sessionDate = findFirstSessionWithDate(project);
  }

  for (const name of Object.keys(uniqueContributors)) {
    const person = project.findPerson(name);

    // Review: if the person is not found, currently we output what we can, which is their ID and their roles.

    // add in the ro-crate stuff like @id and @type
    const personElement = getElementUsingTemplate(
      template,
      person ? createPersonId(person) : createUnresolvedContributorId(name)
    );

    if (person) {
      // Use LDAC compliant processing instead of generic field processing
      makeLdacCompliantPersonEntry(person, sessionDate, personElement);

      // Person languages are not included in RO-Crate as they create unreferenced entities
      // Only session/project languages with proper ldac:subjectLanguage references are included
      addChildFileEntries(
        person,
        personElement,
        entriesForAllContributors,
        rocrateLicense
      );
    } else {
      // Create a stub entity for contributors without matching person records by omitting
      // description fields instead of inventing placeholder text
      (personElement as any).name = name;
    }
    // Note: roles are now handled in the participant property of the Event, not on Person entities
    entriesForAllContributors.push(personElement);
  }
  return entriesForAllContributors;
}
