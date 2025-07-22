import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import { IChoice } from "../model/field/Field";

/**
 * Creates a session-specific license object for RO-Crate
 * @param session The session to create a license for
 * @param project The project containing the session
 * @returns The license object to add to the RO-Crate graph
 */
export function createSessionLicense(session: Session, project: Project): any {
  const access = session.metadataFile?.getTextProperty("access");
  const ldacAccessCategory =
    access && access !== "unspecified" && access !== ""
      ? getLdacAccessCategory(access, project.authorityLists)
      : "ldac:OpenAccess"; // Default to OpenAccess for unspecified access

  const license: any = {
    "@id": `#license-${session.filePrefix}`,
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
 * Gets the license ID for a session
 * @param session The session to get the license ID for
 * @returns The license ID string
 */
export function getSessionLicenseId(session: Session): string {
  return `#license-${session.filePrefix}`;
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
