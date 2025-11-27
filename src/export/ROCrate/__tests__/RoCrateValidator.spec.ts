import { vi, describe, it, beforeEach, expect } from "vitest";
import { RoCrateValidator, ensureSubjectLanguage } from "../RoCrateValidator";
import { RoCrateLanguages } from "../RoCrateLanguages";

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
  const createValidDataset = (overrides: Record<string, any> = {}) => ({
    "@id": "./",
    "@type": ["Dataset", "RepositoryCollection"],
    name: "Test dataset",
    description: "A dataset",
    license: { "@id": "#license" },
    "dct:rightsHolder": { "@id": "#person" },
    author: [{ "@id": "#person" }],
    accountablePerson: [{ "@id": "#person" }],
    publisher: [{ "@id": "#org" }],
    datePublished: ["2024-01-01"],
    "ldac:subjectLanguage": [{ "@id": "#language_etr" }],
    ...overrides
  });

  const createValidRepositoryObject = (
    overrides: Record<string, any> = {}
  ) => ({
    // LAM-67 https://linear.app/lameta/issue/LAM-67/ro-crate-11-part-1
    // RepositoryObject (session) IDs now use fragment identifiers.
    "@id": "#session-ETR001",
    "@type": ["RepositoryObject", "CollectionEvent"],
    name: ["Session"],
    inLanguage: [{ "@id": "#language_etr" }],
    "ldac:subjectLanguage": [{ "@id": "#language_etr" }],
    ...overrides
  });

  beforeEach(() => {
    validator = new RoCrateValidator();
  });

  describe("validate", () => {
    it("should pass for valid RO-Crate with all requirements", () => {
      const validRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [
          createValidDataset(),
          createValidRepositoryObject(),
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
      // Temporary log to inspect error contents during test failure debugging
      console.log("dataset-required-field-errors", result.errors);
      if (!result.isValid) {
        console.log("Validation errors:", result.errors);
        console.log("Validation warnings:", result.warnings);
      }

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail for missing @graph", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("RO-Crate must have a @graph array");
    });

    it("should fail for root collection without ldac:subjectLanguage", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [createValidDataset({ "ldac:subjectLanguage": undefined })]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Root Collection is missing required ldac:subjectLanguage property"
      );
    });

    it("should fail for object without ldac:subjectLanguage", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [
          createValidDataset(),
          createValidRepositoryObject({ "ldac:subjectLanguage": undefined })
        ]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Object #session-ETR001 is missing required ldac:subjectLanguage property"
      );
    });

    it("should validate ldac:subjectLanguage is an array", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [
          createValidDataset({
            "ldac:subjectLanguage": { "@id": "#language_etr" }
          })
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
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [createValidDataset({ "ldac:subjectLanguage": [] })]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Root Collection ldac:subjectLanguage array is empty"
      );
    });

    it("should enforce LDAC required properties on Dataset", () => {
      const datasetMissingName = createValidDataset();
      delete (datasetMissingName as any).name;
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [datasetMissingName]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      const hasNameError = result.errors.some((error) => {
        const targets = ["(Dataset)", "(RepositoryCollection)"];
        return (
          targets.some((target) => error.includes(target)) &&
          error.includes("name property")
        );
      });
      expect(hasNameError).toBe(true);
    });

    it("should enforce RepositoryObject inLanguage requirement", () => {
      const invalidRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [
          createValidDataset(),
          (() => {
            const objectMissingLanguage = createValidRepositoryObject();
            delete (objectMissingLanguage as any).inLanguage;
            return objectMissingLanguage;
          })()
        ]
      };

      const result = validator.validate(invalidRoCrate);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) =>
            error.includes("(RepositoryObject)") &&
            error.includes("inLanguage property")
        )
      ).toBe(true);
    });

    it("should honor alias mapping for ldac subject language URIs", () => {
      const dataset = createValidDataset() as Record<string, any>;
      dataset["https://w3id.org/ldac/terms#subjectLanguage"] =
        dataset["ldac:subjectLanguage"];
      delete dataset["ldac:subjectLanguage"];

      const repositoryObject = createValidRepositoryObject() as Record<
        string,
        any
      >;
      repositoryObject["https://w3id.org/ldac/terms#subjectLanguage"] =
        repositoryObject["ldac:subjectLanguage"];
      delete repositoryObject["ldac:subjectLanguage"];

      const validRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [
          dataset,
          repositoryObject,
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

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should match required properties when using full dct URIs", () => {
      const dataset = createValidDataset() as Record<string, any>;
      dataset["http://purl.org/dc/terms/rightsHolder"] =
        dataset["dct:rightsHolder"];
      delete dataset["dct:rightsHolder"];

      const validRoCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [dataset]
      };

      const result = validator.validate(validRoCrate);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
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

    // LAM-41 regression: ensure the fallback uses the shared Lexvo URI instead
    // of the legacy #language_und fragment.
    // https://linear.app/lameta/issue/LAM-41/ro-crate-10-ensure-inlanguage-is-present-and-avoid-language-und
    expect(entity["ldac:subjectLanguage"]).toEqual([
      { "@id": "https://lexvo.org/id/iso639-3/und" }
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
      "@id": "#session-ETR001",
      "@type": ["CollectionEvent"]
    };

    ensureSubjectLanguage(entity, rocrateLanguages, ["etr"]);

    expect(rocrateLanguages.getUsageCount("etr")).toBe(1);
  });
});
