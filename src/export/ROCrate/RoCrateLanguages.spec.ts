import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoCrateLanguages } from "./RoCrateLanguages";

// Mock the staticLanguageFinder
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => {
        const languageMap: { [key: string]: string } = {
          eng: "English",
          fra: "French",
          deu: "German",
          etr: "Edolo"
        };
        return languageMap[code] || code;
      })
  }
}));

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
        name: "xyz" // Unknown codes return the code itself as name
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

      expect(reference).toEqual({
        "@id": "#language_fra"
      });

      // Verify the entity was created
      const entities = rocrateLanguages.getAllLanguageEntities();
      expect(entities).toHaveLength(1);
      expect(entities[0].code).toBe("fra");
    });
  });

  describe("trackUsage", () => {
    it("should track usage of a language by an entity", () => {
      rocrateLanguages.trackUsage("eng", "session-1");

      expect(rocrateLanguages.getUsageCount("eng")).toBe(1);
    });

    it("should track multiple usages of the same language", () => {
      rocrateLanguages.trackUsage("eng", "session-1");
      rocrateLanguages.trackUsage("eng", "session-2");

      expect(rocrateLanguages.getUsageCount("eng")).toBe(2);
    });

    it("should not double-count the same entity using the same language", () => {
      rocrateLanguages.trackUsage("eng", "session-1");
      rocrateLanguages.trackUsage("eng", "session-1");

      expect(rocrateLanguages.getUsageCount("eng")).toBe(1);
    });

    it("should normalize language codes when tracking", () => {
      rocrateLanguages.trackUsage("ENG", "session-1");
      rocrateLanguages.trackUsage("eng", "session-2");

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
      expect(entities.map((e) => e.code)).toContain("eng");
      expect(entities.map((e) => e.code)).toContain("fra");
    });
  });

  describe("getUsedLanguageEntities", () => {
    it("should return only entities that have been used", () => {
      rocrateLanguages.getLanguageEntity("eng");
      rocrateLanguages.getLanguageEntity("fra");
      rocrateLanguages.trackUsage("eng", "session-1");

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
      rocrateLanguages.trackUsage("eng", "session-1");

      const unusedEntities = rocrateLanguages.getUnusedLanguageEntities();
      expect(unusedEntities).toHaveLength(1);
      expect(unusedEntities[0].code).toBe("fra");
    });

    it("should return empty array when all entities are used", () => {
      rocrateLanguages.getLanguageEntity("eng");
      rocrateLanguages.trackUsage("eng", "session-1");

      const unusedEntities = rocrateLanguages.getUnusedLanguageEntities();
      expect(unusedEntities).toEqual([]);
    });
  });

  describe("clear", () => {
    it("should remove all entities and usage tracking", () => {
      rocrateLanguages.getLanguageEntity("eng");
      rocrateLanguages.trackUsage("eng", "session-1");

      rocrateLanguages.clear();

      expect(rocrateLanguages.getAllLanguageEntities()).toEqual([]);
      expect(rocrateLanguages.getUsageCount("eng")).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle deduplication across multiple operations", () => {
      // Create entities through different methods
      const entity1 = rocrateLanguages.getLanguageEntity("eng");
      const reference = rocrateLanguages.getLanguageReference("ENG"); // Different case
      rocrateLanguages.trackUsage("  eng  ", "session-1"); // With whitespace

      // All should reference the same entity
      expect(reference["@id"]).toBe(entity1["@id"]);
      expect(rocrateLanguages.getAllLanguageEntities()).toHaveLength(1);
      expect(rocrateLanguages.getUsageCount("eng")).toBe(1);
    });

    it("should correctly categorize used vs unused entities", () => {
      // Create multiple entities
      rocrateLanguages.getLanguageEntity("eng");
      rocrateLanguages.getLanguageEntity("fra");
      rocrateLanguages.getLanguageEntity("deu");

      // Use only some of them
      rocrateLanguages.trackUsage("eng", "session-1");
      rocrateLanguages.trackUsage("fra", "session-2");

      const allEntities = rocrateLanguages.getAllLanguageEntities();
      const usedEntities = rocrateLanguages.getUsedLanguageEntities();
      const unusedEntities = rocrateLanguages.getUnusedLanguageEntities();

      expect(allEntities).toHaveLength(3);
      expect(usedEntities).toHaveLength(2);
      expect(unusedEntities).toHaveLength(1);

      expect(usedEntities.map((e) => e.code).sort()).toEqual(["eng", "fra"]);
      expect(unusedEntities[0].code).toBe("deu");
    });
  });
});
