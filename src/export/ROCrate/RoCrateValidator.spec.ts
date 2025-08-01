import { vi, describe, it, beforeEach, expect } from "vitest";
import { RoCrateValidator, ensureSubjectLanguage } from "./RoCrateValidator";
import { RoCrateLanguages } from "./RoCrateLanguages";

// Mock the staticLanguageFinder
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => {
        const languageMap: { [key: string]: string } = {
          etr: "Edolo",
          und: "Undetermined"
        };
        return languageMap[code.toLowerCase()] || code;
      })
  }
}));

describe("RoCrateValidator", () => {
  let validator: RoCrateValidator;
  let rocrateLanguages: RoCrateLanguages;

  beforeEach(() => {
    rocrateLanguages = new RoCrateLanguages();
    validator = new RoCrateValidator(rocrateLanguages);
  });

  describe("validate", () => {
    it("should pass for valid RO-Crate with all requirements", () => {
      const validRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2-DRAFT/context"],
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "pcdm:Collection"],
            "ldac:subjectLanguage": [{ "@id": "#language_etr" }]
          },
          {
            "@id": "Sessions/ETR001/",
            "@type": ["Event", "Object"],
            "ldac:subjectLanguage": [{ "@id": "#language_etr" }]
          },
          {
            "@id": "Sessions/ETR001/audio.wav",
            "@type": "AudioObject",
            license: { "@id": "#license-open" }
          },
          {
            "@id": "#language_etr",
            "@type": "Language",
            code: "etr",
            name: "Edolo"
          }
        ]
      };

      const result = validator.validate(validRoCrate);

      if (!result.isValid) {
        console.log("Validation errors:", result.errors);
        console.log("Validation warnings:", result.warnings);
      }

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail for missing @graph", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2-DRAFT/context"]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("RO-Crate must have a @graph array");
    });

    it("should fail for root collection without ldac:subjectLanguage", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2-DRAFT/context"],
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "pcdm:Collection"]
            // Missing ldac:subjectLanguage
          }
        ]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Root Collection is missing required ldac:subjectLanguage property"
      );
    });

    it("should fail for object without ldac:subjectLanguage", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2-DRAFT/context"],
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "pcdm:Collection"],
            "ldac:subjectLanguage": [{ "@id": "#language_etr" }]
          },
          {
            "@id": "Sessions/ETR001/",
            "@type": ["Event", "Object"]
            // Missing ldac:subjectLanguage
          }
        ]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Object Sessions/ETR001/ is missing required ldac:subjectLanguage property"
      );
    });

    it("should fail for file without license", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2-DRAFT/context"],
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "pcdm:Collection"],
            "ldac:subjectLanguage": [{ "@id": "#language_etr" }]
          },
          {
            "@id": "Sessions/ETR001/audio.wav",
            "@type": "AudioObject"
            // Missing license
          }
        ]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "File Sessions/ETR001/audio.wav is missing required license property"
      );
    });

    it("should validate ldac:subjectLanguage is an array", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2-DRAFT/context"],
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "pcdm:Collection"],
            "ldac:subjectLanguage": { "@id": "#language_etr" } // Should be array
          }
        ]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Root Collection ldac:subjectLanguage must be an array"
      );
    });

    it("should fail for empty ldac:subjectLanguage array", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2-DRAFT/context"],
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "pcdm:Collection"],
            "ldac:subjectLanguage": [] // Empty array
          }
        ]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Root Collection ldac:subjectLanguage array is empty"
      );
    });

    it("should warn about unused language entities", () => {
      // Create unused language entity
      rocrateLanguages.getLanguageEntity("unused_lang");

      const validRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2-DRAFT/context"],
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "pcdm:Collection"],
            "ldac:subjectLanguage": [{ "@id": "#language_etr" }]
          }
        ]
      };

      const result = validator.validate(validRoCrate);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Found 1 unused language entities: unused_lang"
      );
    });
  });
});

describe("ensureSubjectLanguage", () => {
  let rocrateLanguages: RoCrateLanguages;

  beforeEach(() => {
    rocrateLanguages = new RoCrateLanguages();
  });

  it("should add ldac:subjectLanguage if missing", () => {
    const entity: any = {
      "@id": "./",
      "@type": "Dataset"
    };

    ensureSubjectLanguage(entity, rocrateLanguages);

    expect(entity["ldac:subjectLanguage"]).toEqual([
      { "@id": "#language_unk" }
    ]);
  });

  it("should convert non-array ldac:subjectLanguage to array", () => {
    const entity: any = {
      "@id": "./",
      "@type": "Dataset",
      "ldac:subjectLanguage": { "@id": "#language_etr" }
    };

    ensureSubjectLanguage(entity, rocrateLanguages);

    expect(entity["ldac:subjectLanguage"]).toEqual([
      { "@id": "#language_etr" }
    ]);
  });

  it("should add default language if array is empty", () => {
    const entity: any = {
      "@id": "./",
      "@type": "Dataset",
      "ldac:subjectLanguage": []
    };

    ensureSubjectLanguage(entity, rocrateLanguages, ["etr"]);

    expect(entity["ldac:subjectLanguage"]).toEqual([
      { "@id": "#language_etr" }
    ]);
  });

  it("should not modify existing non-empty array", () => {
    const entity: any = {
      "@id": "./",
      "@type": "Dataset",
      "ldac:subjectLanguage": [{ "@id": "#language_etr" }]
    };

    ensureSubjectLanguage(entity, rocrateLanguages);

    expect(entity["ldac:subjectLanguage"]).toEqual([
      { "@id": "#language_etr" }
    ]);
  });

  it("should track language usage", () => {
    const entity: any = {
      "@id": "Sessions/ETR001/",
      "@type": "Event"
    };

    ensureSubjectLanguage(entity, rocrateLanguages, ["etr"]);

    expect(rocrateLanguages.getUsageCount("etr")).toBe(1);
  });
});
