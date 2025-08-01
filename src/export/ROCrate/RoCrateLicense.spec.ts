import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoCrateLicense } from "./RoCrateLicense";
import { Session } from "../../model/Project/Session/Session";
import { File } from "../../model/file/File";

// Mock the dependencies
vi.mock("../../model/Project/Session/Session");
vi.mock("../../model/file/File");

describe("RoCrateLicense", () => {
  let rocrateLicense: RoCrateLicense;
  let mockSession: Session;
  let mockFile: File;

  beforeEach(() => {
    rocrateLicense = new RoCrateLicense();

    // Create mock session
    mockSession = {
      properties: {
        getTextStringOrEmpty: vi.fn()
      }
    } as any;

    // Create mock file
    mockFile = {
      metadataFilePath: "/path/to/file",
      getActualFilePath: vi.fn().mockReturnValue("/path/to/actual/file"),
      properties: {
        getTextStringOrEmpty: vi.fn()
      }
    } as any;
  });

  describe("ensureFileLicense", () => {
    it("should use file's own license when available", () => {
      mockFile.properties.getTextStringOrEmpty = vi
        .fn()
        .mockReturnValue("CC-BY-4.0");

      rocrateLicense.ensureFileLicense(mockFile, mockSession);

      expect(rocrateLicense.getFileLicense("/path/to/file")).toBe("CC-BY-4.0");
    });

    it("should use session license as fallback when file has no license", () => {
      mockFile.properties.getTextStringOrEmpty = vi.fn().mockReturnValue("");
      mockSession.properties.getTextStringOrEmpty = vi
        .fn()
        .mockReturnValue("CC-BY-SA-4.0");

      rocrateLicense.ensureFileLicense(mockFile, mockSession);

      expect(rocrateLicense.getFileLicense("/path/to/file")).toBe(
        "CC-BY-SA-4.0"
      );
    });

    it("should not override existing license mapping", () => {
      rocrateLicense.setFileLicense("/path/to/file", "existing-license");
      mockFile.properties.getTextStringOrEmpty = vi
        .fn()
        .mockReturnValue("new-license");

      rocrateLicense.ensureFileLicense(mockFile, mockSession);

      expect(rocrateLicense.getFileLicense("/path/to/file")).toBe(
        "existing-license"
      );
    });

    it("should use actual file path when metadataFilePath is not available", () => {
      mockFile.metadataFilePath = "";
      mockFile.getActualFilePath = vi.fn().mockReturnValue("/actual/path");
      mockFile.properties.getTextStringOrEmpty = vi
        .fn()
        .mockReturnValue("file-license");

      rocrateLicense.ensureFileLicense(mockFile, mockSession);

      expect(rocrateLicense.getFileLicense("/actual/path")).toBe(
        "file-license"
      );
    });

    it("should handle case when neither file nor session has license", () => {
      mockFile.properties.getTextStringOrEmpty = vi.fn().mockReturnValue("");
      mockSession.properties.getTextStringOrEmpty = vi.fn().mockReturnValue("");

      rocrateLicense.ensureFileLicense(mockFile, mockSession);

      expect(rocrateLicense.getFileLicense("/path/to/file")).toBeUndefined();
    });
  });

  describe("getSessionLicenseId", () => {
    it("should return session license when available", () => {
      mockSession.properties.getTextStringOrEmpty = vi
        .fn()
        .mockReturnValue("GPL-3.0");

      const licenseId = rocrateLicense.getSessionLicenseId(mockSession);

      expect(licenseId).toBe("GPL-3.0");
    });

    it("should return null when session has no license", () => {
      mockSession.properties.getTextStringOrEmpty = vi.fn().mockReturnValue("");

      const licenseId = rocrateLicense.getSessionLicenseId(mockSession);

      expect(licenseId).toBeNull();
    });
  });

  describe("setFileLicense and getFileLicense", () => {
    it("should set and retrieve file license", () => {
      rocrateLicense.setFileLicense("/test/path", "MIT");

      expect(rocrateLicense.getFileLicense("/test/path")).toBe("MIT");
    });

    it("should return undefined for non-existent file", () => {
      expect(rocrateLicense.getFileLicense("/non/existent")).toBeUndefined();
    });

    it("should overwrite existing license", () => {
      rocrateLicense.setFileLicense("/test/path", "MIT");
      rocrateLicense.setFileLicense("/test/path", "Apache-2.0");

      expect(rocrateLicense.getFileLicense("/test/path")).toBe("Apache-2.0");
    });
  });

  describe("clear", () => {
    it("should remove all license mappings", () => {
      rocrateLicense.setFileLicense("/path1", "license1");
      rocrateLicense.setFileLicense("/path2", "license2");

      rocrateLicense.clear();

      expect(rocrateLicense.getFileLicense("/path1")).toBeUndefined();
      expect(rocrateLicense.getFileLicense("/path2")).toBeUndefined();
    });
  });

  describe("getAllFileLicenses", () => {
    it("should return empty map when no licenses are set", () => {
      const licenses = rocrateLicense.getAllFileLicenses();
      expect(licenses.size).toBe(0);
    });

    it("should return all file licenses", () => {
      rocrateLicense.setFileLicense("/path1", "license1");
      rocrateLicense.setFileLicense("/path2", "license2");

      const licenses = rocrateLicense.getAllFileLicenses();

      expect(licenses.size).toBe(2);
      expect(licenses.get("/path1")).toBe("license1");
      expect(licenses.get("/path2")).toBe("license2");
    });

    it("should return a copy of the internal map", () => {
      rocrateLicense.setFileLicense("/path1", "license1");

      const licenses = rocrateLicense.getAllFileLicenses();
      licenses.set("/path2", "license2");

      // Original map should not be affected
      expect(rocrateLicense.getFileLicense("/path2")).toBeUndefined();
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple files with different licensing scenarios", () => {
      // File 1: Has its own license
      const file1 = {
        metadataFilePath: "/file1",
        getActualFilePath: vi.fn().mockReturnValue("/file1"),
        properties: {
          getTextStringOrEmpty: vi.fn().mockReturnValue("CC-BY-4.0")
        }
      } as any;

      // File 2: No license, uses session license
      const file2 = {
        metadataFilePath: "/file2",
        getActualFilePath: vi.fn().mockReturnValue("/file2"),
        properties: {
          getTextStringOrEmpty: vi.fn().mockReturnValue("")
        }
      } as any;

      // File 3: No license, session has no license
      const file3 = {
        metadataFilePath: "/file3",
        getActualFilePath: vi.fn().mockReturnValue("/file3"),
        properties: {
          getTextStringOrEmpty: vi.fn().mockReturnValue("")
        }
      } as any;

      // Session with license
      const sessionWithLicense = {
        properties: {
          getTextStringOrEmpty: vi.fn().mockReturnValue("GPL-3.0")
        }
      } as any;

      // Session without license
      const sessionWithoutLicense = {
        properties: {
          getTextStringOrEmpty: vi.fn().mockReturnValue("")
        }
      } as any;

      rocrateLicense.ensureFileLicense(file1, sessionWithLicense);
      rocrateLicense.ensureFileLicense(file2, sessionWithLicense);
      rocrateLicense.ensureFileLicense(file3, sessionWithoutLicense);

      expect(rocrateLicense.getFileLicense("/file1")).toBe("CC-BY-4.0");
      expect(rocrateLicense.getFileLicense("/file2")).toBe("GPL-3.0");
      expect(rocrateLicense.getFileLicense("/file3")).toBeUndefined();
    });
  });
});
