import { describe, it, expect, beforeEach } from "vitest";
import { RoCrateLicense } from "../RoCrateLicenseManager";
import {
  createMockProject,
  createMockSession
} from "./test-utils/rocrate-test-setup";

describe("RoCrateExporter License Race Condition Fix", () => {
  let mockProject: any;

  beforeEach(() => {
    mockProject = createMockProject({
      metadata: {
        title: "Test Project",
        archiveConfigurationName: "REAP"
      }
    });
  });

  it("should normalize raw license values even when already cached", () => {
    const rocrateLicense = new RoCrateLicense();
    
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

    // Simulate the race condition: raw value gets cached first
    rocrateLicense.setFileLicense("/sessions/test/test.session", "Strategic partners");
    
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
    const firstResult = rocrateLicense.getFileLicense("/sessions/test/test.session");
    
    // Second call should be idempotent
    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    const secondResult = rocrateLicense.getFileLicense("/sessions/test/test.session");
    
    expect(firstResult).toBe("#license-reap-public");
    expect(secondResult).toBe("#license-reap-public");
    expect(firstResult).toBe(secondResult);
  });

  it("should overwrite existing raw values with normalized ones", () => {
    const rocrateLicense = new RoCrateLicense();
    
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
          if (key === "license") return "LINGUISTIC STUDY ONLY - not for community distribution";
          return "";
        }
      }
    } as any;

    // Pre-populate with a different raw value (simulating cache pollution)
    rocrateLicense.setFileLicense("/sessions/test/test.session", "Some other raw value");
    
    // ensureFileLicense should replace it with the correct normalized value
    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    
    const result = rocrateLicense.getFileLicense("/sessions/test/test.session");
    expect(result).toBe("#license-reap-linguistic-study-only---not-for-community-distribution");
    expect(result).not.toBe("Some other raw value");
    expect(result).not.toBe("LINGUISTIC STUDY ONLY - not for community distribution");
  });
});
