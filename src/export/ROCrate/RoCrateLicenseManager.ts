import { Session } from "../../model/Project/Session/Session";
import { File } from "../../model/file/File";
import { Project } from "../../model/Project/Project";
import { getSessionLicenseId as getSessionLicenseIdFromLicenses } from "./RoCrateLicenseUtils";

/**
 * Manages licenses for RO-Crate export, ensuring every distributable file
 * has appropriate license properties.
 */
export class RoCrateLicense {
  private fileLicenseMap = new Map<string, string>();

  /**
   * Check if a license value is a raw access value that needs normalization
   */
  private isRawAccessValue(license: string): boolean {
    // Raw access values are typically archive-specific labels that don't start with "#"
    // and don't look like URLs
    return (
      !!license &&
      !license.startsWith("#") &&
      !license.startsWith("http") &&
      !license.startsWith("https") &&
      license.trim().length > 0
    );
  }

  /**
   * Ensure a file has a license, using session license as fallback
   */
  ensureFileLicense(file: File, session: Session, project?: Project): void {
    const filePath = file.metadataFilePath || file.getActualFilePath();

    // Check if file has its own license - safely handle cases where properties might not exist
    const fileLicense = file.properties?.getTextStringOrEmpty("license") || "";

    if (fileLicense) {
      // Always normalize raw license values when project is available
      if (project && this.isRawAccessValue(fileLicense)) {
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
      // Use the normalized license ID from RoCrateLicenses
      return getSessionLicenseIdFromLicenses(session, project);
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
