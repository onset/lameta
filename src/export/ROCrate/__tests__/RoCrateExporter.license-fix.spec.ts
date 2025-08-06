import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoCrateLicense } from "../RoCrateLicenseManager";
import {
  createMockProject,
  createMockSession
} from "./test-utils/rocrate-test-setup";

describe("RoCrateExporter License Fix", () => {
  let mockProject: any;

  beforeEach(() => {
    mockProject = createMockProject({
      metadata: {
        title: "Test Project",
        archiveConfigurationName: "REAP"
      }
    });
  });

  it("should normalize raw license values in session files using RoCrateLicense", () => {
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

    // This is the key test - ensure the license gets normalized
    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    const result = rocrateLicense.getFileLicense("/sessions/test/test.session");

    expect(result).toBe("#license-reap-strategic-partners");
    expect(result).not.toBe("Strategic partners");
  });

  it("should normalize LINGUISTIC STUDY ONLY license values", () => {
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

    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    const result = rocrateLicense.getFileLicense("/sessions/test/test.session");

    expect(result).toBe("#license-reap-linguistic-study-only---not-for-community-distribution");
    expect(result).not.toBe("LINGUISTIC STUDY ONLY - not for community distribution");
  });

  it("should normalize Public license values", () => {
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

    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    const result = rocrateLicense.getFileLicense("/sessions/test/test.session");

    expect(result).toBe("#license-reap-public");
    expect(result).not.toBe("Public");
  });

  it("should keep already normalized license IDs unchanged", () => {
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
          if (key === "license") return "#license-reap-custom";
          return "";
        }
      }
    } as any;

    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    const result = rocrateLicense.getFileLicense("/sessions/test/test.session");

    expect(result).toBe("#license-reap-custom");
  });

  it("should demonstrate the fix for the ordering bug", () => {
    const rocrateLicense = new RoCrateLicense();
    
    const mockSession = createMockSession({
      metadata: {
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

    // Before the fix, if a raw license was set in the map, it would be used directly
    // Now, ensureFileLicense should normalize it regardless
    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    
    // Call ensureFileLicense again - it should be idempotent and still normalized
    rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);
    
    const result = rocrateLicense.getFileLicense("/sessions/test/test.session");
    expect(result).toBe("#license-reap-strategic-partners");
    expect(result).not.toBe("Strategic partners");
  });
});
