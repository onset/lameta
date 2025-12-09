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
 * Gets the description text from an access choice id
 * @param choiceId The access choice id/code (e.g., "U" or "Level 1")
 * @param authorityLists The authority lists containing access choices
 * @returns The description text for the access choice
 */
function getDescriptionFromAccessChoice(
  choiceId: string,
  authorityLists: AuthorityLists
): string {
  const choice = authorityLists.accessChoicesOfCurrentProtocol.find(
    (c: IChoice) => c.id === choiceId
  );
  if (!choice) return "";
  return choice.description;
}

/**
 * Gets the LDAC access category from an access choice id
 * @param choiceId The access choice id/code (e.g., "U" or "Level 1")
 * @param authorityLists The authority lists containing access choices
 * @returns The LDAC access category URI (ldac:OpenAccess or ldac:AuthorizedAccess)
 */
function getLdacAccessCategory(
  choiceId: string,
  authorityLists: AuthorityLists
): string {
  const choice = authorityLists.accessChoicesOfCurrentProtocol.find(
    (c: IChoice) => c.id === choiceId
  );

  // If the choice has an ldacAccessCategory property, use it
  if (choice && (choice as any).ldacAccessCategory) {
    return expandLdacId((choice as any).ldacAccessCategory);
  }

  // Handle common public access terms that might not be in authority lists
  const publicTerms = ["public", "open", "free", "unrestricted"];
  const lowerChoice = choiceId.toLowerCase();
  if (publicTerms.some((term) => lowerChoice.includes(term))) {
    return expandLdacId("ldac:OpenAccess");
  }

  // Fallback to AuthorizedAccess if no specific category is defined
  return expandLdacId("ldac:AuthorizedAccess");
}

function sanitizeAccessValue(access?: string | null): string | null {
  if (!access) {
    return null;
  }
  const trimmed = access.trim();
  if (!trimmed || trimmed === "unspecified") {
    return null;
  }
  return trimmed;
}

// =============================================================================
// Exported utility functions
// =============================================================================

export function createAccessLicense(access: string | undefined, project: Project): any {
  const sanitizedAccess = sanitizeAccessValue(access);
  const normalizedAccess = sanitizedAccess || "public";
  const ldacAccessCategory = sanitizedAccess
    ? getLdacAccessCategory(sanitizedAccess, project.authorityLists)
    : expandLdacId("ldac:OpenAccess");

  const archiveConfigurationName =
    project.metadataFile?.getTextProperty("archiveConfigurationName") ||
    "current archive";

  const license: any = {
    "@id": getNormalizedLicenseId(normalizedAccess, project),
    "@type": expandLdacId("ldac:DataReuseLicense"),
    name: `${archiveConfigurationName} ${normalizedAccess} License`,
    "ldac:access": { "@id": ldacAccessCategory }
  };

  if (sanitizedAccess) {
    const accessDescription = getDescriptionFromAccessChoice(
      sanitizedAccess,
      project.authorityLists
    );
    if (accessDescription) {
      license.description = `Marked with the ${archiveConfigurationName}-specific term, '${sanitizedAccess}' which means '${accessDescription}'`;
    } else {
      license.description = `Marked with the ${archiveConfigurationName}-specific term, '${sanitizedAccess}'`;
    }
  } else {
    license.description = `Marked with the ${archiveConfigurationName}-specific term, 'public' which means 'This is an open access license.'`;
  }

  return license;
}

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
  return createAccessLicense(access, project);
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
  project: Project,
  additionalAccessValues: string[] = []
): any[] {
  const distinctLicenses = new Map<string, any>();

  const addAccess = (access?: string) => {
    const license = createAccessLicense(access, project);
    const licenseId = license["@id"];
    if (!distinctLicenses.has(licenseId)) {
      distinctLicenses.set(licenseId, license);
    }
  };

  sessions.forEach((session) => {
    addAccess(session.metadataFile?.getTextProperty("access"));
  });

  additionalAccessValues.forEach((access) => addAccess(access));

  return Array.from(distinctLicenses.values());
}

/**
 * Creates LDAC access type definitions for the RO-Crate graph.
 * Only includes definitions for access types that are actually used.
 *
 * LAM-92: Previously, this function always returned ALL LDAC access type definitions
 * regardless of what was actually used, causing orphaned entity warnings.
 * https://linear.app/lameta/issue/LAM-92/ro-crate-contextual-entities-not-referenced-orphaned-entities-hewya
 *
 * @param usedAccessTypes Set of access type IDs that are actually referenced by licenses
 * @returns Array of LDAC access type definition objects for only the used types
 */
export function createLdacAccessTypeDefinitions(
  usedAccessTypes: Set<string>
): object[] {
  // If no access types are used, return empty array to avoid orphaned entities
  if (usedAccessTypes.size === 0) {
    return [];
  }

  const definitions: object[] = [];

  // Always include the AccessTypes container (DefinedTermSet) if any access types are used
  definitions.push({
    "@id": expandLdacId("ldac:AccessTypes"),
    "@type": "DefinedTermSet",
    name: "Access Types"
  });

  // Only include OpenAccess if it's actually used
  if (usedAccessTypes.has(expandLdacId("ldac:OpenAccess"))) {
    definitions.push({
      "@id": expandLdacId("ldac:OpenAccess"),
      "@type": "DefinedTerm",
      name: "Open Access",
      description:
        "Data covered by this license may be accessed as long as the license is served alongside it, and does not require any specific authorization step.",
      inDefinedTermSet: { "@id": expandLdacId("ldac:AccessTypes") }
    });
  }

  // Only include AuthorizedAccess if it's actually used
  if (usedAccessTypes.has(expandLdacId("ldac:AuthorizedAccess"))) {
    definitions.push({
      "@id": expandLdacId("ldac:AuthorizedAccess"),
      "@type": "DefinedTerm",
      name: "Authorized Access",
      description:
        "Data covered by this license requires explicit authorization for access.",
      inDefinedTermSet: { "@id": expandLdacId("ldac:AccessTypes") }
    });
  }

  // LAM-92: Do NOT include ldac:DataReuseLicense class definition.
  // It's used as "@type": "ldac:DataReuseLicense" in licenses, not as an @id reference.
  // Including it causes orphaned entity warnings since nothing references it by @id.

  return definitions;
}

/**
 * Clears the LDAC access type definitions cache.
 * This is now a no-op since LAM-92 removed caching (results depend on input parameters).
 * Kept for backward compatibility with existing tests.
 */
export function clearLdacAccessTypeDefinitionsCache(): void {
  // No-op: caching was removed in LAM-92 because createLdacAccessTypeDefinitions
  // now takes a usedAccessTypes parameter and returns different results based on input.
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

  ensureDocumentAccessLicense(file: File, project?: Project): string | undefined {
    if (!project) {
      return undefined;
    }
    const accessValue = sanitizeAccessValue(
      file.getTextProperty?.("access") || file.properties?.getTextStringOrEmpty?.("access")
    );
    if (!accessValue) {
      return undefined;
    }
    const filePath = file.metadataFilePath || file.getActualFilePath();
    const licenseId = getNormalizedLicenseId(accessValue, project);
    this.setFileLicense(filePath, licenseId);
    return licenseId;
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
