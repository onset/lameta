import { Session } from "../../model/Project/Session/Session";
import { File } from "../../model/file/File";

/**
 * Manages licenses for RO-Crate export, ensuring every distributable file
 * has appropriate license properties.
 */
export class RoCrateLicense {
  private fileLicenseMap = new Map<string, string>();

  /**
   * Ensure a file has a license, using session license as fallback
   */
  ensureFileLicense(file: File, session: Session): void {
    const filePath = file.metadataFilePath || file.getActualFilePath();

    if (!this.fileLicenseMap.has(filePath)) {
      // Check if file has its own license - safely handle cases where properties might not exist
      const fileLicense =
        file.properties?.getTextStringOrEmpty("license") || "";

      if (fileLicense) {
        this.setFileLicense(filePath, fileLicense);
      } else {
        // Use session license as fallback
        const sessionLicenseId = this.getSessionLicenseId(session);
        if (sessionLicenseId) {
          this.setFileLicense(filePath, sessionLicenseId);
        }
      }
    }
  }

  /**
   * Get the license ID for a session
   */
  getSessionLicenseId(session: Session): string | null {
    const access = session.metadataFile?.getTextProperty("access") || "";
    return access || null;
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
