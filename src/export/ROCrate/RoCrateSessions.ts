import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import {
  createSessionLicense,
  getSessionLicenseId,
  createLdacAccessTypeDefinitions
} from "./RoCrateLicenseUtils";
import { createLdacMaterialTypeDefinitions } from "./RoCrateMaterialTypes";
import { addFieldEntries, addChildFileEntries } from "./RoCrateExporter";
import { makeEntriesFromParticipant } from "./RoCratePeople";
import { RoCrateLanguages } from "./RoCrateLanguages";
import { RoCrateLicense } from "./RoCrateLicenseManager";
import { ensureSubjectLanguage } from "./RoCrateValidator";
import {
  sanitizeForIri,
  createSessionId,
  createPersonId,
  createUnresolvedContributorId
} from "./RoCrateUtils";

export async function createSessionEntry(
  project: Project,
  session: Session,
  isStandaloneSession: boolean = false,
  rocrateLanguages: RoCrateLanguages,
  rocrateLicense: RoCrateLicense
): Promise<object[]> {
  const mainSessionEntry: any = {
    "@id": isStandaloneSession ? "./" : createSessionId(session),
    "@type": ["Dataset", "pcdm:Object", "Event"],
    conformsTo: {
      "@id": "https://w3id.org/ldac/profile#Object"
    },
    name:
      session.metadataFile?.getTextProperty("title") ||
      "No title provided for this session.",
    description:
      session.metadataFile?.getTextProperty("description") ||
      "No description provided for this session.",
    publisher: { "@id": "https://github.com/onset/lameta" },
    datePublished: new Date().toISOString(),
    hasPart: []
  };

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
    otherEntries.push(...createLdacMaterialTypeDefinitions());

    // Add publisher organization entity for standalone sessions
    const publisherEntity = {
      "@id": "https://github.com/onset/lameta",
      "@type": "Organization",
      name: "LaMeta Project",
      url: "https://github.com/onset/lameta",
      description: "A metadata tool for language documentation projects"
    };
    otherEntries.push(publisherEntity);
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
