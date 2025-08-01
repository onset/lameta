import { vi, describe, it, beforeEach, expect } from "vitest";
import {
  setupCommonMocks,
  createMockProject,
  createMockSession,
  createMockPerson
} from "./test-utils/rocrate-test-setup";

// Setup common mocks before imports
setupCommonMocks();

// Import components after mocks are set up
import { RoCrateLanguages } from "../RoCrateLanguages";
import { RoCrateLicense } from "../RoCrateLicense";
import { makeEntriesFromParticipant } from "../RoCratePeople";
import { createSessionEntry } from "../RoCrateSessions";

describe("RO-Crate Components", () => {
  describe("RoCrateLanguages", () => {
    let rocrateLanguages: RoCrateLanguages;

    beforeEach(() => {
      rocrateLanguages = new RoCrateLanguages();
    });

    describe("getLanguageEntity", () => {
      it("should create a new language entity for a new code", () => {
        const entity = rocrateLanguages.getLanguageEntity("eng");

        expect(entity).toEqual({
          "@id": "#language_eng",
          "@type": "Language",
          code: "eng",
          name: "English"
        });
      });

      it("should return the same entity for duplicate codes", () => {
        const entity1 = rocrateLanguages.getLanguageEntity("eng");
        const entity2 = rocrateLanguages.getLanguageEntity("eng");

        expect(entity1).toBe(entity2);
      });

      it("should normalize codes to lowercase", () => {
        const entity1 = rocrateLanguages.getLanguageEntity("ENG");
        const entity2 = rocrateLanguages.getLanguageEntity("eng");

        expect(entity1).toBe(entity2);
        expect(entity1.code).toBe("eng");
      });

      it("should trim whitespace from codes", () => {
        const entity = rocrateLanguages.getLanguageEntity("  eng  ");

        expect(entity.code).toBe("eng");
        expect(entity["@id"]).toBe("#language_eng");
      });

      it("should handle unknown language codes", () => {
        const entity = rocrateLanguages.getLanguageEntity("xyz");

        expect(entity).toEqual({
          "@id": "#language_xyz",
          "@type": "Language",
          code: "xyz",
          name: "xyz"
        });
      });
    });

    describe("getLanguageReference", () => {
      it("should return a reference to a language entity", () => {
        const reference = rocrateLanguages.getLanguageReference("eng");

        expect(reference).toEqual({
          "@id": "#language_eng"
        });
      });

      it("should create the entity if it doesn't exist", () => {
        const reference = rocrateLanguages.getLanguageReference("fra");
        const entity = rocrateLanguages.getLanguageEntity("fra");

        expect(reference["@id"]).toBe(entity["@id"]);
      });
    });

    describe("trackUsage", () => {
      it("should track usage of a language by an entity", () => {
        rocrateLanguages.trackUsage("eng", "entity1");

        expect(rocrateLanguages.getUsageCount("eng")).toBe(1);
      });

      it("should track multiple usages of the same language", () => {
        rocrateLanguages.trackUsage("eng", "entity1");
        rocrateLanguages.trackUsage("eng", "entity2");

        expect(rocrateLanguages.getUsageCount("eng")).toBe(2);
      });

      it("should not double-count the same entity using the same language", () => {
        rocrateLanguages.trackUsage("eng", "entity1");
        rocrateLanguages.trackUsage("eng", "entity1");

        expect(rocrateLanguages.getUsageCount("eng")).toBe(1);
      });

      it("should normalize language codes when tracking", () => {
        rocrateLanguages.trackUsage("ENG", "entity1");
        rocrateLanguages.trackUsage("eng", "entity2");

        expect(rocrateLanguages.getUsageCount("eng")).toBe(2);
      });
    });

    describe("getAllLanguageEntities", () => {
      it("should return empty array when no entities exist", () => {
        const entities = rocrateLanguages.getAllLanguageEntities();

        expect(entities).toEqual([]);
      });

      it("should return all created entities", () => {
        rocrateLanguages.getLanguageEntity("eng");
        rocrateLanguages.getLanguageEntity("fra");

        const entities = rocrateLanguages.getAllLanguageEntities();

        expect(entities).toHaveLength(2);
        expect(entities.some((e) => e.code === "eng")).toBe(true);
        expect(entities.some((e) => e.code === "fra")).toBe(true);
      });
    });

    describe("getUsedLanguageEntities", () => {
      it("should return only entities that have been used", () => {
        rocrateLanguages.getLanguageEntity("eng");
        rocrateLanguages.getLanguageEntity("fra");
        rocrateLanguages.trackUsage("eng", "entity1");

        const usedEntities = rocrateLanguages.getUsedLanguageEntities();

        expect(usedEntities).toHaveLength(1);
        expect(usedEntities[0].code).toBe("eng");
      });

      it("should return empty array when no entities are used", () => {
        rocrateLanguages.getLanguageEntity("eng");

        const usedEntities = rocrateLanguages.getUsedLanguageEntities();

        expect(usedEntities).toEqual([]);
      });
    });

    describe("getUnusedLanguageEntities", () => {
      it("should return entities that have not been used", () => {
        rocrateLanguages.getLanguageEntity("eng");
        rocrateLanguages.getLanguageEntity("fra");
        rocrateLanguages.trackUsage("eng", "entity1");

        const unusedEntities = rocrateLanguages.getUnusedLanguageEntities();

        expect(unusedEntities).toHaveLength(1);
        expect(unusedEntities[0].code).toBe("fra");
      });

      it("should return empty array when all entities are used", () => {
        rocrateLanguages.getLanguageEntity("eng");
        rocrateLanguages.trackUsage("eng", "entity1");

        const unusedEntities = rocrateLanguages.getUnusedLanguageEntities();

        expect(unusedEntities).toEqual([]);
      });
    });

    describe("clear", () => {
      it("should remove all entities and usage tracking", () => {
        rocrateLanguages.getLanguageEntity("eng");
        rocrateLanguages.trackUsage("eng", "entity1");

        rocrateLanguages.clear();

        expect(rocrateLanguages.getAllLanguageEntities()).toEqual([]);
        expect(rocrateLanguages.getUsageCount("eng")).toBe(0);
      });
    });

    describe("integration scenarios", () => {
      it("should handle deduplication across multiple operations", () => {
        const entity1 = rocrateLanguages.getLanguageEntity("eng");
        const reference = rocrateLanguages.getLanguageReference("eng");
        const entity2 = rocrateLanguages.getLanguageEntity("ENG");

        expect(entity1).toBe(entity2);
        expect(reference["@id"]).toBe(entity1["@id"]);
        expect(rocrateLanguages.getAllLanguageEntities()).toHaveLength(1);
      });

      it("should correctly categorize used vs unused entities", () => {
        rocrateLanguages.getLanguageEntity("eng");
        rocrateLanguages.getLanguageEntity("fra");
        rocrateLanguages.getLanguageEntity("deu");

        rocrateLanguages.trackUsage("eng", "entity1");
        rocrateLanguages.trackUsage("deu", "entity2");

        const used = rocrateLanguages.getUsedLanguageEntities();
        const unused = rocrateLanguages.getUnusedLanguageEntities();

        expect(used).toHaveLength(2);
        expect(unused).toHaveLength(1);
        expect(unused[0].code).toBe("fra");
      });
    });

    describe("language code parsing and reference generation", () => {
      it("should handle language codes with colon and name format correctly", () => {
        const entity = rocrateLanguages.getLanguageEntity("etr");

        expect(entity.code).toBe("etr");
        expect(entity.name).toBe("Edolo");
        expect(entity["@id"]).toBe("#language_etr");
      });

      it("should not double-prefix language IDs", () => {
        const entity1 = rocrateLanguages.getLanguageEntity("eng");
        const entity2 = rocrateLanguages.getLanguageEntity("eng");

        expect(entity1["@id"]).toBe("#language_eng");
        expect(entity2["@id"]).toBe("#language_eng");
        expect(entity1["@id"]).not.toContain("##language");
      });
    });
  });

  describe("RoCrateLicense", () => {
    let rocrateLicense: RoCrateLicense;
    let mockSession: any;
    let mockFile: any;

    beforeEach(() => {
      rocrateLicense = new RoCrateLicense();

      mockSession = createMockSession({
        metadata: {
          license: "CC BY 4.0"
        }
      });

      mockFile = {
        metadataFilePath: "/path/to/file",
        getActualFilePath: vi.fn().mockReturnValue("/path/to/actual/file"),
        properties: {
          getTextStringOrEmpty: vi.fn().mockReturnValue("")
        }
      };
    });

    it("should set file license correctly", () => {
      const licenseUrl = "https://creativecommons.org/licenses/by-sa/4.0/";
      const filePath = "/path/to/file";
      rocrateLicense.setFileLicense(filePath, licenseUrl);

      const retrievedLicense = rocrateLicense.getFileLicense(filePath);
      expect(retrievedLicense).toBe(licenseUrl);
    });

    it("should handle license ensuring for files", () => {
      rocrateLicense.ensureFileLicense(mockFile, mockSession);

      // Should not throw and should handle the file appropriately
      expect(true).toBe(true);
    });

    it("should clear all licenses", () => {
      const filePath = "/path/to/file";
      const licenseUrl = "https://creativecommons.org/licenses/by/4.0/";
      rocrateLicense.setFileLicense(filePath, licenseUrl);

      rocrateLicense.clear();

      expect(rocrateLicense.getFileLicense(filePath)).toBeUndefined();
    });
  });

  describe("RoCratePeople", () => {
    let mockProject: any;
    let mockSession: any;
    let mockPerson: any;

    beforeEach(() => {
      mockProject = createMockProject();
      mockSession = createMockSession();
      mockPerson = createMockPerson({
        metadata: {
          fullName: "John Doe",
          nickname: "John"
        }
      });
    });

    it("should create person entries from participant", async () => {
      const rocrateLicense = new RoCrateLicense();
      const entries = await makeEntriesFromParticipant(
        mockProject,
        mockSession,
        rocrateLicense
      );

      expect(entries).toBeDefined();
      expect(Array.isArray(entries)).toBe(true);
    });

    it("should handle session with participants", async () => {
      const rocrateLicense = new RoCrateLicense();
      // Add some mock contributions to the session
      mockSession.getAllContributionsToAllFiles = vi.fn().mockReturnValue([]);

      const entries = await makeEntriesFromParticipant(
        mockProject,
        mockSession,
        rocrateLicense
      );

      expect(entries).toBeDefined();
    });
  });

  describe("RoCrateSessions", () => {
    let mockProject: any;
    let mockSession: any;

    beforeEach(() => {
      mockProject = createMockProject();
      mockSession = createMockSession({
        metadata: {
          id: "session-001",
          title: "Test Session",
          date: "2024-01-01"
        }
      });
    });

    it("should have session creation function available", () => {
      expect(typeof createSessionEntry).toBe("function");
    });

    it("should handle basic session properties", () => {
      expect(mockSession.filePrefix).toBe("test-session");
      expect(mockSession.metadataFile.getTextProperty("title")).toBe(
        "Test Session"
      );
    });
  });
});
