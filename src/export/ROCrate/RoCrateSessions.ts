import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";
import {
  createSessionLicense,
  getSessionLicenseId,
  createLdacAccessTypeDefinitions
} from "./RoCrateLicenses";
import { createLdacMaterialTypeDefinitions } from "./RoCrateMaterialTypes";
import { addFieldEntries, addChildFileEntries } from "./RoCrateExporter";
import { makeEntriesFromParticipant } from "./RoCratePeople";

export async function createSessionEntry(
  project: Project,
  session: Session,
  isStandaloneSession: boolean = false
): Promise<object[]> {
  const mainSessionEntry: any = {
    "@id": isStandaloneSession ? "./" : `Sessions/${session.filePrefix}/`,
    "@type": isStandaloneSession
      ? ["Dataset", "Object", "RepositoryObject"]
      : ["Event", "Object", "RepositoryObject"],
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
      conformsTo: { "@id": "https://w3id.org/ro/crate/1.2-DRAFT" },
      about: { "@id": "./" }
    }
  ];

  const otherEntries: any[] = [];

  await addFieldEntries(project, session, mainSessionEntry, otherEntries);

  const allEntries: any[] = [mainSessionEntry];

  // Add participant properties and person entries
  addParticipantProperties(mainSessionEntry, session, project);
  allEntries.push(...(await makeEntriesFromParticipant(project, session)));

  // Add files to session hasPart
  addChildFileEntries(session, mainSessionEntry, otherEntries);

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
  }

  allEntries.push(...boilerplateSessionGraph, ...otherEntries);
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
    const personId = person ? `People/${person.filePrefix}/` : personName;

    // Avoid duplicates
    if (!roleGroups[role].includes(personId)) {
      roleGroups[role].push(personId);
    }
  });

  // Add LDAC-specific role properties
  for (const role of Object.keys(roleGroups)) {
    const ldacProperty = `ldac:${role}`;
    const personIds = roleGroups[role];

    if (personIds.length === 1) {
      sessionEntry[ldacProperty] = { "@id": personIds[0] };
    } else if (personIds.length > 1) {
      sessionEntry[ldacProperty] = personIds.map((id) => ({ "@id": id }));
    }
  }
}

// now we need an array of role elements, one for each unique role in the session
export function getRoles(session: Session) {
  const uniqueRoles = new Set<string>();
  session.getAllContributionsToAllFiles().forEach((contribution) => {
    uniqueRoles.add(contribution.role.trim());
  });
  return Array.from(uniqueRoles).map((role) => {
    return {
      "@id": `role_${role}`,
      "@type": "Role",
      name: role
    };
  });
}
