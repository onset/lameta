import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import {
  createSessionLicense,
  getSessionLicenseId,
  createLdacAccessTypeDefinitions,
  RoCrateLicense
} from "./RoCrateLicenseManager";

import { addFieldEntries, addChildFileEntries } from "./RoCrateExporter";
import {
  getContactPersonReference,
  setContactPersonProperties,
  createUnknownContributorEntity
} from "./RoCrateEntityResolver";
import { makeEntriesFromParticipant } from "./RoCratePeople";
import { RoCrateLanguages } from "./RoCrateLanguages";
import { ensureSubjectLanguage } from "./RoCrateValidator";
import {
  createSessionId,
  createPersonId,
  createUnresolvedContributorId
} from "./RoCrateUtils";

type PublisherDetails = {
  reference: { "@id": string };
  entity: { [key: string]: unknown };
};

export async function createSessionEntry(
  project: Project,
  session: Session,
  isStandaloneSession: boolean = false,
  rocrateLanguages: RoCrateLanguages,
  rocrateLicense: RoCrateLicense,
  publisher?: PublisherDetails
): Promise<object[]> {
  const sessionTypes = isStandaloneSession
    ? ["Dataset", "RepositoryObject", "CollectionEvent"]
    : ["RepositoryObject", "CollectionEvent"];

  const mainSessionEntry: any = {
    "@id": isStandaloneSession ? "./" : createSessionId(session),
    "@type": sessionTypes,
    conformsTo: {
      "@id": "https://w3id.org/ldac/profile#Object"
    },
    name:
      session.metadataFile?.getTextProperty("title") ||
      "No title provided for this session.",
    description:
      session.metadataFile?.getTextProperty("description") ||
      "No description provided for this session.",
    datePublished: new Date().toISOString(),
    hasPart: [],
    // Sessions need the CollectionEvent type plus the LDAC Session classification so
    // downstream tools recognise them as event objects rather than generic datasets.
    collectionEventType: "https://w3id.org/ldac/terms#Session"
  };

  if (publisher) {
    mainSessionEntry.publisher = publisher.reference;
  }

  const { reference: contactPersonReference, isUnknown: isUnknownContact } =
    getContactPersonReference(project);

  // Keep author/accountablePerson/rightsHolder in sync with the contact person metadata
  setContactPersonProperties(mainSessionEntry, contactPersonReference);

  // Add bidirectional pcdm:memberOf link for sessions that are part of a collection
  if (!isStandaloneSession) {
    mainSessionEntry["pcdm:memberOf"] = { "@id": "./" };
  }

  // Add session-specific properties for Events
  if (!isStandaloneSession) {
    const startDate = session.metadataFile?.getTextProperty("date");
    if (startDate) {
      mainSessionEntry.startDate = startDate;
    }

    const location = session.metadataFile?.getTextProperty("location");
    if (location) {
      mainSessionEntry.location = { "@id": `#${location}` };
    }

    const keywords = session.metadataFile?.getTextProperty("keyword");
    if (keywords) {
      mainSessionEntry.keywords = keywords;
    }
  }

  const boilerplateSessionGraph = [
    {
      "@id": "ro-crate-metadata.json",
      "@type": "CreativeWork",
      conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" },
      about: { "@id": "./" }
    }
  ];

  const otherEntries: any[] = [];

  if (isStandaloneSession && isUnknownContact) {
    // Standalone sessions still need a concrete node when no contact information exists
    otherEntries.push(createUnknownContributorEntity());
  }

  await addFieldEntries(
    project,
    session,
    mainSessionEntry,
    otherEntries,
    rocrateLanguages
  );

  // Ensure session has ldac:subjectLanguage (fallback if no languages field processed)
  if (!mainSessionEntry["ldac:subjectLanguage"]) {
    ensureSubjectLanguage(mainSessionEntry, rocrateLanguages, ["und"]);
  }

  const allEntries: any[] = [mainSessionEntry];

  // Add participant properties and person entries
  addParticipantProperties(mainSessionEntry, session, project);
  allEntries.push(
    ...(await makeEntriesFromParticipant(project, session, rocrateLicense))
  );

  // Add files to session hasPart
  addChildFileEntries(
    session,
    mainSessionEntry,
    otherEntries,
    rocrateLicense,
    project
  );

  // Create Place entity if location is specified
  const location = session.metadataFile?.getTextProperty("location");
  if (location && !isStandaloneSession) {
    otherEntries.push({
      "@id": `#${location}`,
      "@type": "Place",
      name: location
    });
  }

  // Update the session entry to reference the normalized license
  mainSessionEntry.license = { "@id": getSessionLicenseId(session, project) };

  // For standalone sessions, include the license object and LDAC definitions
  if (isStandaloneSession) {
    const license = createSessionLicense(session, project);
    allEntries.push(license);

    // Add LDAC access type definitions to the graph
    otherEntries.push(...createLdacAccessTypeDefinitions());

    if (publisher) {
      // Standalone exports share the same archive-level publisher entity as collections
      otherEntries.push(publisher.entity);
    }
  }

  allEntries.push(...boilerplateSessionGraph, ...otherEntries);

  // Add used language entities from the RoCrateLanguages system
  allEntries.push(...rocrateLanguages.getUsedLanguageEntities());

  return allEntries;
}

export function addParticipantProperties(
  sessionEntry: any,
  session: Session,
  project: Project
): void {
  const roleGroups: { [key: string]: string[] } = {};

  // Collect all contributions and group by role
  session.getAllContributionsToAllFiles().forEach((contribution) => {
    const personName = contribution.personReference.trim();
    const role = contribution.role.trim().toLowerCase();

    if (!roleGroups[role]) {
      roleGroups[role] = [];
    }

    const person = project.findPerson(personName);
    const personId = person
      ? createPersonId(person)
      : createUnresolvedContributorId(personName);

    // Avoid duplicates
    if (!roleGroups[role].includes(personId)) {
      roleGroups[role].push(personId);
    }
  });

  // Add LDAC-specific role properties
  for (const role of Object.keys(roleGroups)) {
    const ldacProperty = `ldac:${role}`;
    const personIds = roleGroups[role];

    // Always wrap in arrays for consistency with LDAC profile expectations
    if (personIds.length > 0) {
      sessionEntry[ldacProperty] = personIds.map((id) => ({ "@id": id }));
    }
  }
}
