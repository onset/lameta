import { Session } from "../../model/Project/Session/Session";
import { File } from "../../model/file/File";
import { Project } from "../../model/Project/Project";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { IChoice } from "../../model/field/Field";
import { expandLdacId } from "./RoCrateUtils";

// =============================================================================
// Centralized license handling
// This module is the single source of truth for all RO-Crate license operations,
// replacing the earlier split between RoCrateLicenseUtils.ts and RoCrateLicenseManager.ts.
// =============================================================================

// Cache for LDAC access type definitions (static content, no need to regenerate)
let cachedLdacAccessTypeDefinitions: object[] | null = null;

/**
 * Check if a license value is a raw access value that needs normalization.
 * Raw access values are archive-specific labels that don't start with "#"
 * and don't look like URLs.
 */
function isRawAccessValue(license: string): boolean {
  return (
    !!license &&
    !license.startsWith("#") &&
    !license.startsWith("http") &&
    !license.startsWith("https") &&
    license.trim().length > 0
  );
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
    return expandLdacId((choice as any).ldacAccessCategory);
  }

  // Handle common public access terms that might not be in authority lists
  const publicTerms = ["public", "open", "free", "unrestricted"];
  const lowerChoice = choiceLabel.toLowerCase();
  if (publicTerms.some((term) => lowerChoice.includes(term))) {
    return expandLdacId("ldac:OpenAccess");
  }

  // Fallback to AuthorizedAccess if no specific category is defined
  return expandLdacId("ldac:AuthorizedAccess");
}

// =============================================================================
// Exported utility functions
// =============================================================================

/**
 * Creates a normalized license object for RO-Crate based on access type
 * @param session The session to create a license for (used to get access value)
 * @param project The project containing the session
 * @returns The license object to add to the RO-Crate graph
 *
 * Lameta has different access types for each archive. This has to map them to ldac's two ideas, basically fully-open and other.
 */
export function createSessionLicense(session: Session, project: Project): any {
  const access = session.metadataFile?.getTextProperty("access");
  const normalizedAccess =
    access && access !== "unspecified" && access !== "" ? access : "public";
  const ldacAccessCategory =
    access && access !== "unspecified" && access !== ""
      ? getLdacAccessCategory(access, project.authorityLists)
      : expandLdacId("ldac:OpenAccess"); // Default to OpenAccess for unspecified access

  const archiveConfigurationName =
    project.metadataFile?.getTextProperty("archiveConfigurationName") ||
    "current archive";

  // LAM-96: License entities must have a human-readable name property per RO-Crate spec line 651
  // https://linear.app/lameta/issue/LAM-96/ro-crate-license-entities-missing-name-property-hewya-project
  const license: any = {
    "@id": getNormalizedLicenseId(normalizedAccess, project),
    "@type": expandLdacId("ldac:DataReuseLicense"),
    name: `${archiveConfigurationName} ${normalizedAccess} License`,
    "ldac:access": { "@id": ldacAccessCategory }
  };

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
 * Creates LDAC access type definitions for the RO-Crate graph.
 * Results are cached since the definitions are static.
 * @returns Array of LDAC access type definition objects
 */
export function createLdacAccessTypeDefinitions(): object[] {
  if (cachedLdacAccessTypeDefinitions) {
    return cachedLdacAccessTypeDefinitions;
  }

  cachedLdacAccessTypeDefinitions = [
    {
      "@id": expandLdacId("ldac:AccessTypes"),
      "@type": "DefinedTermSet",
      name: "Access Types"
    },
    {
      "@id": expandLdacId("ldac:OpenAccess"),
      "@type": "DefinedTerm",
      name: "Open Access",
      description:
        "Data covered by this license may be accessed as long as the license is served alongside it, and does not require any specific authorization step.",
      inDefinedTermSet: { "@id": expandLdacId("ldac:AccessTypes") }
    },
    {
      "@id": expandLdacId("ldac:AuthorizedAccess"),
      "@type": "DefinedTerm",
      name: "Authorized Access",
      description:
        "Data covered by this license requires explicit authorization for access.",
      inDefinedTermSet: { "@id": expandLdacId("ldac:AccessTypes") }
    },
    // LAM-96: Class entity needs name property per RO-Crate spec line 651
    // https://linear.app/lameta/issue/LAM-96/ro-crate-license-entities-missing-name-property-hewya-project
    {
      "@id": expandLdacId("ldac:DataReuseLicense"),
      "@type": "Class",
      name: "Data Reuse License",
      subClassOf: { "@id": "http://schema.org/CreativeWork" },
      description: "A license document, setting out terms for reuse of data."
    }
  ];

  return cachedLdacAccessTypeDefinitions;
}

/**
 * Clears the LDAC access type definitions cache.
 * Primarily used for testing.
 */
export function clearLdacAccessTypeDefinitionsCache(): void {
  cachedLdacAccessTypeDefinitions = null;
}

// =============================================================================
// RoCrateLicense class - manages file-level license assignments
// =============================================================================

/**
 * Manages licenses for RO-Crate export, ensuring every distributable file
 * has appropriate license properties.
 */
export class RoCrateLicense {
  private fileLicenseMap = new Map<string, string>();

  /**
   * Ensure a file has a license, using session license as fallback
   */
  ensureFileLicense(file: File, session: Session, project?: Project): void {
    const filePath = file.metadataFilePath || file.getActualFilePath();

    // Check if file has its own license - safely handle cases where properties might not exist
    const fileLicense = file.properties?.getTextStringOrEmpty("license") || "";

    if (fileLicense) {
      // Always normalize raw license values when project is available
      if (project && isRawAccessValue(fileLicense)) {
        const normalizedLicenseId = this.getSessionLicenseId(session, project);
        if (normalizedLicenseId) {
          this.setFileLicense(filePath, normalizedLicenseId);
        } else {
          this.setFileLicense(filePath, fileLicense);
        }
      } else {
        this.setFileLicense(filePath, fileLicense);
      }
    } else {
      // Always set session license as fallback when no file license exists
      const sessionLicenseId = this.getSessionLicenseId(session, project);
      if (sessionLicenseId) {
        this.setFileLicense(filePath, sessionLicenseId);
      }
    }
  }

  /**
   * Get the license ID for a session
   */
  getSessionLicenseId(session: Session, project?: Project): string | null {
    if (project) {
      // Use the normalized license ID
      return getSessionLicenseId(session, project);
    } else {
      // Fallback to raw access value if no project is provided (for backward compatibility)
      const access = session.metadataFile?.getTextProperty("access") || "";
      return access || null;
    }
  }

  /**
   * Set license for a specific file
   */
  setFileLicense(filePath: string, license: string): void {
    this.fileLicenseMap.set(filePath, license);
  }

  /**
   * Get license for a specific file
   */
  getFileLicense(filePath: string): string | undefined {
    return this.fileLicenseMap.get(filePath);
  }

  /**
   * Clear all license mappings
   */
  clear(): void {
    this.fileLicenseMap.clear();
  }

  /**
   * Get all file licenses (for unit tests)
   */
  getAllFileLicenses(): Map<string, string> {
    return new Map(this.fileLicenseMap);
  }

  /**
   * Get the standard RO-Crate type array for repository collections
   */
  static getRepositoryCollectionTypes(): string[] {
    return ["Dataset", "RepositoryCollection"];
  }
}

// Singleton instance for the export process
export const rocrateLicense = new RoCrateLicense();
