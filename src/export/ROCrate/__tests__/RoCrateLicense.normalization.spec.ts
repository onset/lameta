import { describe, it, expect } from "vitest";
import { RoCrateLicense } from "../RoCrateLicenseManager";
import {
  createMockProject,
  createMockSession
} from "./test-utils/rocrate-test-setup";

describe("RoCrateLicense license ID normalization", () => {
  it("should return normalized license ID when project is provided", () => {
    const rocrateLicense = new RoCrateLicense();

    const mockSession = createMockSession({
      metadata: {
        access: "REAP Users"
      }
    });

    const mockProject = createMockProject({
      metadata: {
        archiveConfigurationName: "REAP"
      }
    });

    const licenseId = rocrateLicense.getSessionLicenseId(
      mockSession,
      mockProject
    );

    // Should return normalized license ID, not the raw "REAP Users"
    expect(licenseId).toBe("#license-reap-reap-users");
    expect(licenseId).not.toBe("REAP Users");
  });

  it("should return normalized license ID for Entity access", () => {
    const rocrateLicense = new RoCrateLicense();

    const mockSession = createMockSession({
      metadata: {
        access: "Entity"
      }
    });

    const mockProject = createMockProject({
      metadata: {
        archiveConfigurationName: "REAP"
      }
    });

    const licenseId = rocrateLicense.getSessionLicenseId(
      mockSession,
      mockProject
    );

    // Should return normalized license ID, not the raw "Entity"
    expect(licenseId).toBe("#license-reap-entity");
    expect(licenseId).not.toBe("Entity");
  });

  it("should fallback to raw access value when no project is provided", () => {
    const rocrateLicense = new RoCrateLicense();

    const mockSession = createMockSession({
      metadata: {
        access: "REAP Users"
      }
    });

    const licenseId = rocrateLicense.getSessionLicenseId(mockSession);

    // Should return raw access value for backward compatibility
    expect(licenseId).toBe("REAP Users");
  });

  it("should normalize raw license values when file has license property", () => {
    const rocrateLicense = new RoCrateLicense();

    const mockSession = createMockSession({
      metadata: {
        access: "REAP Users"
      }
    });

    const mockProject = createMockProject({
      metadata: {
        archiveConfigurationName: "REAP"
      }
    });

    // Mock file with license property containing raw access value
    const mockFile = {
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license") return "REAP Users";
          return "";
        }
      },
      getActualFilePath: () => "/path/to/session.session",
      metadataFilePath: "/path/to/session.session"
    } as any;

    // Call ensureFileLicense with project (should normalize the raw "REAP Users")
    rocrateLicense.ensureFileLicense(mockFile, mockSession, mockProject);

    const license = rocrateLicense.getFileLicense("/path/to/session.session");

    // Should be normalized license ID, not raw "REAP Users"
    expect(license).toBe("#license-reap-reap-users");
    expect(license).not.toBe("REAP Users");
  });

  it("should keep non-raw license values as-is", () => {
    const rocrateLicense = new RoCrateLicense();

    const mockSession = createMockSession();
    const mockProject = createMockProject();

    // Mock file with already normalized license
    const mockFile = {
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license") return "#license-custom-id";
          return "";
        }
      },
      getActualFilePath: () => "/path/to/file.txt",
      metadataFilePath: "/path/to/file.txt"
    } as any;

    rocrateLicense.ensureFileLicense(mockFile, mockSession, mockProject);

    const license = rocrateLicense.getFileLicense("/path/to/file.txt");

    // Should keep the normalized license ID as-is
    expect(license).toBe("#license-custom-id");
  });
});
