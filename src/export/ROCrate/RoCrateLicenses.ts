import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { IChoice } from "../../model/field/Field";

/**
 * Creates a normalized license object for RO-Crate based on access type
 * @param session The session to create a license for (used to get access value)
 * @param project The project containing the session
 * @returns The license object to add to the RO-Crate graph
 */
export function createSessionLicense(session: Session, project: Project): any {
  const access = session.metadataFile?.getTextProperty("access");
  const normalizedAccess =
    access && access !== "unspecified" && access !== "" ? access : "public";
  const ldacAccessCategory =
    access && access !== "unspecified" && access !== ""
      ? getLdacAccessCategory(access, project.authorityLists)
      : "ldac:OpenAccess"; // Default to OpenAccess for unspecified access

  const license: any = {
    "@id": getNormalizedLicenseId(normalizedAccess, project),
    "@type": "ldac:DataReuseLicense",
    "ldac:access": { "@id": ldacAccessCategory }
  };

  // Add description from access choice with archive-specific format
  const archiveConfigurationName =
    project.metadataFile?.getTextProperty("archiveConfigurationName") ||
    "current archive";

  if (access && access !== "unspecified" && access !== "") {
    const accessDescription = getDescriptionFromAccessChoice(
      access,
      project.authorityLists
    );
    if (accessDescription) {
      license.description = `Marked with the ${archiveConfigurationName}-specific term, '${access}' which means '${accessDescription}'`;
    } else {
      license.description = `Marked with the ${archiveConfigurationName}-specific term, '${access}'`;
    }
  } else {
    license.description = `Marked with the ${archiveConfigurationName}-specific term, 'public' which means 'This is an open access license.'`;
  }

  return license;
}

/**
 * Gets the normalized license ID for a session based on access type and archive
 * @param session The session to get the license ID for
 * @param project The project containing the session
 * @returns The normalized license ID string
 */
export function getSessionLicenseId(
  session: Session,
  project: Project
): string {
  const access = session.metadataFile?.getTextProperty("access");
  const normalizedAccess =
    access && access !== "unspecified" && access !== "" ? access : "public";
  return getNormalizedLicenseId(normalizedAccess, project);
}

/**
 * Creates a normalized license ID based on access type and archive configuration
 * @param access The access choice label (e.g., "F: Free to All" or "Entity")
 * @param project The project containing archive configuration
 * @returns The normalized license ID string
 */
function getNormalizedLicenseId(access: string, project: Project): string {
  const archiveConfigurationName =
    project.metadataFile?.getTextProperty("archiveConfigurationName") ||
    "unknown";

  // Extract the key part from complex access labels
  // For labels like "F: Free to All", extract "F"
  // For simple labels like "Entity", use as-is
  const accessKey = access.includes(":") ? access.split(":")[0].trim() : access;

  // Create a normalized ID using archive name and access key
  const normalizedArchive = archiveConfigurationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");
  const normalizedAccessKey = accessKey
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  return `#license-${normalizedArchive}-${normalizedAccessKey}`;
}

/**
 * Creates a minimal set of distinct licenses for all sessions in a project.
 * Sessions with the same access type and archive configuration will share the same license.
 * This reduces duplication in the RO-Crate graph while ensuring all sessions have appropriate licenses.
 * @param sessions Array of sessions to create licenses for
 * @param project The project containing the sessions
 * @returns Array of distinct license objects (one per unique access/archive combination)
 */
export function createDistinctLicenses(
  sessions: Session[],
  project: Project
): any[] {
  const distinctLicenses = new Map<string, any>();

  sessions.forEach((session) => {
    const license = createSessionLicense(session, project);
    const licenseId = license["@id"];

    // Only add if we haven't seen this license ID before
    // Multiple sessions with the same access type will share the same license
    if (!distinctLicenses.has(licenseId)) {
      distinctLicenses.set(licenseId, license);
    }
  });

  return Array.from(distinctLicenses.values());
}

/**
 * Gets the description text from an access choice label
 * @param choiceLabel The access choice label (e.g., "F: Free to All")
 * @param authorityLists The authority lists containing access choices
 * @returns The description text for the access choice
 */
function getDescriptionFromAccessChoice(
  choiceLabel: string,
  authorityLists: AuthorityLists
): string {
  const choice = authorityLists.accessChoicesOfCurrentProtocol.find(
    (c: IChoice) => c.label === choiceLabel
  );
  if (!choice) return "";
  return choice.description;
}

/**
 * Gets the LDAC access category from an access choice label
 * @param choiceLabel The access choice label (e.g., "F: Free to All")
 * @param authorityLists The authority lists containing access choices
 * @returns The LDAC access category URI (ldac:OpenAccess or ldac:AuthorizedAccess)
 */
function getLdacAccessCategory(
  choiceLabel: string,
  authorityLists: AuthorityLists
): string {
  const choice = authorityLists.accessChoicesOfCurrentProtocol.find(
    (c: IChoice) => c.label === choiceLabel
  );

  // If the choice has an ldacAccessCategory property, use it
  if (choice && (choice as any).ldacAccessCategory) {
    return (choice as any).ldacAccessCategory;
  }

  // Handle common public access terms that might not be in authority lists
  const publicTerms = ["public", "open", "free", "unrestricted"];
  const lowerChoice = choiceLabel.toLowerCase();
  if (publicTerms.some((term) => lowerChoice.includes(term))) {
    return "ldac:OpenAccess";
  }

  // Fallback to AuthorizedAccess if no specific category is defined
  return "ldac:AuthorizedAccess";
}

/**
 * Creates LDAC access type definitions for the RO-Crate graph
 * @returns Array of LDAC access type definition objects
 */
export function createLdacAccessTypeDefinitions(): object[] {
  return [
    {
      "@id": "ldac:AccessTypes",
      "@type": "DefinedTermSet",
      name: "Access Types"
    },
    {
      "@id": "ldac:OpenAccess",
      "@type": "DefinedTerm",
      name: "Open Access",
      description:
        "Data covered by this license may be accessed as long as the license is served alongside it, and does not require any specific authorization step.",
      inDefinedTermSet: { "@id": "ldac:AccessTypes" }
    },
    {
      "@id": "ldac:AuthorizedAccess",
      "@type": "DefinedTerm",
      name: "Authorized Access",
      description:
        "Data covered by this license requires explicit authorization for access.",
      inDefinedTermSet: { "@id": "ldac:AccessTypes" }
    },
    {
      "@id": "ldac:DataReuseLicense",
      "@type": "Class",
      subClassOf: { "@id": "http://schema.org/CreativeWork" },
      description: "A license document, setting out terms for reuse of data."
    }
  ];
}
