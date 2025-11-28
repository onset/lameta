/**
 * RoCrateValidator.ldac-profile.spec.ts - LDAC Profile Tests
 *
 * This file contains tests for LDAC (Language Data Commons) profile compliance.
 * These are additional requirements specific to the LDAC profile that extend
 * the base RO-Crate 1.2 specification.
 *
 * For base RO-Crate 1.2 specification tests, see RoCrateValidator.rocrate-spec.spec.ts
 */
import { describe, it, beforeEach, expect, vi } from "vitest";
import { RoCrateValidator, ensureSubjectLanguage } from "../RoCrateValidator";
import { RoCrateLanguages } from "../RoCrateLanguages";

// Mock the languageFinder module
vi.mock("../../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    getAlternativeName: vi.fn().mockReturnValue(undefined),
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => {
        const languageMap: { [key: string]: string } = {
          fra: "French",
          spa: "Spanish",
          eng: "English",
          deu: "German",
          jpn: "Japanese",
          und: "Undetermined"
        };
        return languageMap[code] || code;
      })
  }
}));

describe("RoCrateValidator - LDAC Profile", () => {
  let validator: RoCrateValidator;
  let rocrateLanguages: RoCrateLanguages;

  // Helper to create a minimal valid LDAC RO-Crate
  const createMinimalValidLdacRoCrate = (): Record<string, any> => ({
    "@context": ["https://w3id.org/ro/crate/1.2/context"],
    "@graph": [
      {
        "@id": "ro-crate-metadata.json",
        "@type": "CreativeWork",
        about: { "@id": "./" },
        conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" }
      },
      {
        "@id": "./",
        "@type": ["Dataset"],
        name: "Test Dataset",
        description: "A test dataset",
        datePublished: "2024-01-01",
        license: { "@id": "https://creativecommons.org/licenses/by/4.0/" },
        "ldac:subjectLanguage": [{ "@id": "#language_eng" }]
      },
      {
        "@id": "#language_eng",
        "@type": "Language",
        name: "English"
      }
    ]
  });

  beforeEach(() => {
    validator = new RoCrateValidator();
    rocrateLanguages = new RoCrateLanguages();
  });

  describe("ldac:subjectLanguage requirement", () => {
    it("should fail when root dataset is missing ldac:subjectLanguage", () => {
      const roCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [
          {
            "@id": "ro-crate-metadata.json",
            "@type": "CreativeWork",
            about: { "@id": "./" },
            conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" }
          },
          {
            "@id": "./",
            "@type": ["Dataset"],
            name: "Test Dataset",
            description: "A test dataset",
            datePublished: "2024-01-01"
            // Missing ldac:subjectLanguage
          }
        ]
      };

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("ldac:subjectLanguage")
      );
    });

    it("should pass when ldac:subjectLanguage is present on root", () => {
      const roCrate = createMinimalValidLdacRoCrate();
      const result = validator.validate(roCrate);

      expect(result.errors).not.toContainEqual(
        expect.stringContaining("ldac:subjectLanguage")
      );
    });

    it("should accept ldac:subjectLanguage as array", () => {
      const roCrate = createMinimalValidLdacRoCrate();
      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("ldac:subjectLanguage")
      );
    });
  });

  describe("ensureSubjectLanguage function", () => {
    it("should add ldac:subjectLanguage if missing", () => {
      const entity: any = {
        "@id": "./",
        "@type": "Dataset"
      };

      ensureSubjectLanguage(entity, rocrateLanguages);

      // Should add the undetermined language fallback
      expect(entity["ldac:subjectLanguage"]).toEqual([
        { "@id": "https://lexvo.org/id/iso639-3/und" }
      ]);
    });

    it("should convert non-array ldac:subjectLanguage to array", () => {
      const entity: any = {
        "@id": "./",
        "@type": "Dataset",
        "ldac:subjectLanguage": { "@id": "#language_fra" }
      };

      ensureSubjectLanguage(entity, rocrateLanguages);

      expect(Array.isArray(entity["ldac:subjectLanguage"])).toBe(true);
      expect(entity["ldac:subjectLanguage"]).toEqual([
        { "@id": "#language_fra" }
      ]);
    });

    it("should add default language if array is empty", () => {
      const entity: any = {
        "@id": "./",
        "@type": "Dataset",
        "ldac:subjectLanguage": []
      };

      ensureSubjectLanguage(entity, rocrateLanguages, ["eng"]);

      expect(entity["ldac:subjectLanguage"]).toEqual([
        { "@id": "#language_eng" }
      ]);
    });

    it("should not modify existing non-empty array", () => {
      const entity: any = {
        "@id": "./",
        "@type": "Dataset",
        "ldac:subjectLanguage": [{ "@id": "#language_jpn" }]
      };

      ensureSubjectLanguage(entity, rocrateLanguages);

      expect(entity["ldac:subjectLanguage"]).toEqual([
        { "@id": "#language_jpn" }
      ]);
    });

    it("should track language usage", () => {
      const entity: any = {
        "@id": "#session-ENG001",
        "@type": ["CollectionEvent"]
      };

      ensureSubjectLanguage(entity, rocrateLanguages, ["eng"]);

      expect(rocrateLanguages.getUsageCount("eng")).toBe(1);
    });
  });

  describe("LDAC property validation", () => {
    it("should ensure ldac properties exist on applicable entities", () => {
      const roCrate = createMinimalValidLdacRoCrate();
      roCrate["@graph"].push({
        "@id": "./session1/",
        "@type": "Dataset",
        name: "Session 1",
        inLanguage: [{ "@id": "#language_eng" }]
      });

      const result = validator.validate(roCrate);

      // Should not fail on ldac properties
      expect(result.errors).not.toContainEqual(expect.stringContaining("LDAC"));
    });
  });

  describe("Integration with RO-Crate 1.2 base validation", () => {
    it("should validate both RO-Crate spec and LDAC requirements", () => {
      // Create a fully valid LDAC RO-Crate
      const roCrate = createMinimalValidLdacRoCrate();

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should report both RO-Crate and LDAC errors", () => {
      const roCrate = {
        // Missing @context
        "@graph": [
          {
            // Missing @type
            "@id": "ro-crate-metadata.json",
            about: { "@id": "./" }
          },
          {
            "@id": "./",
            "@type": ["Dataset"],
            name: "Test"
            // Missing ldac:subjectLanguage
          }
        ]
      };

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      // Should have RO-Crate errors
      expect(result.errors).toContainEqual(expect.stringContaining("@context"));
      // Should have LDAC errors
      expect(result.errors).toContainEqual(
        expect.stringContaining("ldac:subjectLanguage")
      );
    });
  });
});
