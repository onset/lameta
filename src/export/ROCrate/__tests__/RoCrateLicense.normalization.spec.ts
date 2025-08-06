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

  it("should normalize raw license values even when already cached", () => {
    const rocrateLicense = new RoCrateLicense();

    const mockProject = createMockProject({
      metadata: {
        title: "Test Project",
        archiveConfigurationName: "REAP"
      }
    });

    const mockSession = createMockSession({
      metadata: {
        title: "Test Session",
        access: "Strategic partners"
      }
    });

    const sessionFile = {
      getActualFilePath: () => "/sessions/test/test.session",
      metadataFilePath: "/sessions/test/test.session",
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license") return "Strategic partners";
          return "";
        }
      }
    } as any;

    // Simulate cache pollution: raw value gets cached first
    rocrateLicense.setFileLicense(
      "/sessions/test/test.session",
      "Strategic partners"
    );

    // Verify it's cached with raw value
    let result = rocrateLicense.getFileLicense("/sessions/test/test.session");
    expect(result).toBe("Strategic partners");

    // Now call ensureFileLicense - it should normalize even though already cached
    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);

    // Should now be normalized
    result = rocrateLicense.getFileLicense("/sessions/test/test.session");
    expect(result).toBe("#license-reap-strategic-partners");
    expect(result).not.toBe("Strategic partners");
  });

  it("should handle multiple calls to ensureFileLicense idempotently", () => {
    const rocrateLicense = new RoCrateLicense();

    const mockProject = createMockProject({
      metadata: {
        title: "Test Project",
        archiveConfigurationName: "REAP"
      }
    });

    const mockSession = createMockSession({
      metadata: {
        access: "Public"
      }
    });

    const sessionFile = {
      getActualFilePath: () => "/sessions/test/test.session",
      metadataFilePath: "/sessions/test/test.session",
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license") return "Public";
          return "";
        }
      }
    } as any;

    // First call
    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    const firstResult = rocrateLicense.getFileLicense(
      "/sessions/test/test.session"
    );

    // Second call should be idempotent
    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    const secondResult = rocrateLicense.getFileLicense(
      "/sessions/test/test.session"
    );

    expect(firstResult).toBe("#license-reap-public");
    expect(secondResult).toBe("#license-reap-public");
    expect(firstResult).toBe(secondResult);
  });

  it("should overwrite existing raw values with normalized ones", () => {
    const rocrateLicense = new RoCrateLicense();

    const mockProject = createMockProject({
      metadata: {
        title: "Test Project",
        archiveConfigurationName: "REAP"
      }
    });

    const mockSession = createMockSession({
      metadata: {
        access: "LINGUISTIC STUDY ONLY - not for community distribution"
      }
    });

    const sessionFile = {
      getActualFilePath: () => "/sessions/test/test.session",
      metadataFilePath: "/sessions/test/test.session",
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license")
            return "LINGUISTIC STUDY ONLY - not for community distribution";
          return "";
        }
      }
    } as any;

    // Pre-populate with a different raw value (simulating cache pollution)
    rocrateLicense.setFileLicense(
      "/sessions/test/test.session",
      "Some other raw value"
    );

    // ensureFileLicense should replace it with the correct normalized value
    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);

    const result = rocrateLicense.getFileLicense("/sessions/test/test.session");
    expect(result).toBe(
      "#license-reap-linguistic-study-only---not-for-community-distribution"
    );
    expect(result).not.toBe("Some other raw value");
    expect(result).not.toBe(
      "LINGUISTIC STUDY ONLY - not for community distribution"
    );
  });
});
