/**
 * RoCrateValidator.rocrate-spec.spec.ts - RO-Crate 1.2 Specification Tests
 *
 * This file contains tests for RO-Crate 1.2 specification compliance.
 * These are general RO-Crate requirements that apply to all RO-Crates,
 * regardless of profile.
 *
 * For LDAC profile-specific tests, see RoCrateValidator.ldac-profile.spec.ts
 */
import { describe, it, beforeEach, expect } from "vitest";
import { RoCrateValidator } from "../RoCrateValidator";

describe("RoCrateValidator - RO-Crate 1.2 Specification", () => {
  let validator: RoCrateValidator;

  // Helper to create a minimal valid RO-Crate
  const createMinimalValidRoCrate = (overrides: Record<string, any> = {}) => ({
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
    ],
    ...overrides
  });

  beforeEach(() => {
    validator = new RoCrateValidator();
  });

  describe("@graph array (line 138)", () => {
    it("should fail when @graph is missing", () => {
      const roCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"]
      };

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("@graph array")
      );
    });

    it("should fail when @graph is not an array", () => {
      const roCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": {}
      };

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("@graph array")
      );
    });

    it("should pass when @graph is a valid array", () => {
      const roCrate = createMinimalValidRoCrate();
      const result = validator.validate(roCrate);
      // May have other errors/warnings, but not the @graph error
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("@graph array")
      );
    });
  });

  describe("@context validation (line 429)", () => {
    it("should fail when @context is missing", () => {
      const roCrate = {
        "@graph": [
          {
            "@id": "ro-crate-metadata.json",
            "@type": "CreativeWork",
            about: { "@id": "./" }
          },
          {
            "@id": "./",
            "@type": ["Dataset"],
            name: "Test",
            "ldac:subjectLanguage": [{ "@id": "#lang" }]
          }
        ]
      };

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("@context"));
    });

    it("should warn when @context doesn't reference RO-Crate context", () => {
      const roCrate = createMinimalValidRoCrate({
        "@context": ["https://schema.org/"]
      });

      const result = validator.validate(roCrate);

      expect(result.warnings).toContainEqual(
        expect.stringContaining("https://w3id.org/ro/crate/")
      );
    });

    it("should pass when @context references RO-Crate context", () => {
      const roCrate = createMinimalValidRoCrate();
      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("@context")
      );
    });
  });

  describe("Unique @id validation (line 1606)", () => {
    it("should fail when duplicate @id exists in @graph", () => {
      const roCrate = createMinimalValidRoCrate();
      // Add a duplicate entity
      roCrate["@graph"].push({
        "@id": "#language_eng",
        "@type": "Language",
        name: "English Duplicate"
      });

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Duplicate @id "#language_eng"')
      );
    });

    it("should pass when all @id values are unique", () => {
      const roCrate = createMinimalValidRoCrate();
      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("Duplicate @id")
      );
    });
  });

  describe("Metadata Descriptor (line 822)", () => {
    it("should fail when metadata descriptor is missing", () => {
      const roCrate = {
        "@context": ["https://w3id.org/ro/crate/1.2/context"],
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset"],
            name: "Test",
            "ldac:subjectLanguage": [{ "@id": "#lang" }]
          }
        ]
      };

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("metadata descriptor")
      );
    });

    it("should fail when metadata descriptor lacks @type CreativeWork", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"][0]["@type"] = "Dataset"; // Wrong type

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("CreativeWork")
      );
    });

    it("should fail when metadata descriptor lacks about property", () => {
      const roCrate = createMinimalValidRoCrate();
      delete roCrate["@graph"][0].about;

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("about property")
      );
    });

    it("should warn when conformsTo is missing on descriptor", () => {
      const roCrate = createMinimalValidRoCrate();
      delete roCrate["@graph"][0].conformsTo;

      const result = validator.validate(roCrate);

      expect(result.warnings).toContainEqual(
        expect.stringContaining("conformsTo")
      );
    });

    it("should accept legacy ro-crate-metadata.jsonld", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"][0]["@id"] = "ro-crate-metadata.jsonld";

      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("metadata descriptor")
      );
    });
  });

  describe("Entity @id and @type requirements (lines 648-649)", () => {
    it("should fail when entity is missing @id", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@type": "Person",
        name: "Test Person"
      });

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("invalid @id: missing @id property")
      );
    });

    it("should fail when entity is missing @type", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "#person1",
        name: "Test Person"
      });

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("invalid @type: missing @type property")
      );
    });

    it("should fail when @id is empty string", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "",
        "@type": "Person",
        name: "Test Person"
      });

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("@id is empty or whitespace-only")
      );
    });

    it("should fail when @id is whitespace-only", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "   ",
        "@type": "Person",
        name: "Test Person"
      });

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("@id is empty or whitespace-only")
      );
    });

    it("should fail when @id is null", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": null,
        "@type": "Person",
        name: "Test Person"
      });

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("@id is null")
      );
    });

    it("should fail when @type is empty array", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "#person1",
        "@type": [],
        name: "Test Person"
      });

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("@type array is empty")
      );
    });

    it("should fail when @type array contains only empty strings", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "#person1",
        "@type": ["", "   "],
        name: "Test Person"
      });

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("@type array contains no valid string values")
      );
    });

    it("should warn when entity lacks name property (line 651)", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "#person1",
        "@type": "Person"
        // No name
      });

      const result = validator.validate(roCrate);

      expect(result.warnings).toContainEqual(
        expect.stringContaining("should have a name")
      );
    });
  });

  describe("Valid URI references (line 1050)", () => {
    it("should fail when @id contains backslashes", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "files\\test.txt",
        "@type": "File",
        name: "Test File",
        encodingFormat: "text/plain"
      });

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("valid URI reference")
      );
    });

    it("should accept relative URI paths with forward slashes", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "files/test.txt",
        "@type": "File",
        name: "Test File",
        encodingFormat: "text/plain"
      });

      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("files/test.txt")
      );
    });

    it("should accept fragment identifiers", () => {
      const roCrate = createMinimalValidRoCrate();
      // #language_eng already exists and should be valid
      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("#language_eng")
      );
    });

    it("should accept absolute HTTP URIs", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "https://example.com/resource",
        "@type": "CreativeWork",
        name: "External Resource"
      });

      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("https://example.com/resource")
      );
    });

    it("should accept blank node identifiers", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "_:b0",
        "@type": "GeoCoordinates",
        name: "Location"
      });

      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(expect.stringContaining("_:b0"));
    });
  });

  describe("File Data Entity (lines 1129-1132)", () => {
    it("should accept File entities with valid @id", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "data/file.txt",
        "@type": "File",
        name: "Test File",
        encodingFormat: "text/plain"
      });

      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("data/file.txt")
      );
    });

    it("should accept File type aliases (AudioObject, VideoObject, etc.)", () => {
      const roCrate = createMinimalValidRoCrate();
      // LAM-88: File entities SHOULD have encodingFormat per RO-Crate 1.2 spec line 1144
      // https://linear.app/lameta/issue/LAM-88/ro-crate-file-entities-missing-encodingformat
      roCrate["@graph"].push({
        "@id": "audio.mp3",
        "@type": "AudioObject",
        name: "Audio File",
        encodingFormat: "audio/mpeg"
      });
      roCrate["@graph"].push({
        "@id": "video.mp4",
        "@type": "VideoObject",
        name: "Video File",
        encodingFormat: "video/mp4"
      });

      const result = validator.validate(roCrate);
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("audio.mp3")
      );
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("video.mp4")
      );
    });
  });

  describe("Dataset/Directory Data Entity (lines 1160-1165)", () => {
    it("should warn when directory @id doesn't end with /", () => {
      const roCrate = createMinimalValidRoCrate();
      roCrate["@graph"].push({
        "@id": "subfolder",
        "@type": "Dataset",
        name: "Subfolder"
      });

      const result = validator.validate(roCrate);

      expect(result.warnings).toContainEqual(
        expect.stringContaining("should end with /")
      );
    });

    it("should not warn when directory @id ends with /", () => {
      const roCrate = createMinimalValidRoCrate();
      // Add the subfolder entity
      roCrate["@graph"].push({
        "@id": "subfolder/",
        "@type": "Dataset",
        name: "Subfolder"
      });
      // Link it from root dataset via hasPart to avoid orphaned entity warnings
      const rootDataset = roCrate["@graph"].find((e) => e["@id"] === "./");
      rootDataset.hasPart = [{ "@id": "subfolder/" }];

      const result = validator.validate(roCrate);
      // Should not warn about missing trailing slash (that's for when it doesn't end with /)
      expect(result.warnings).not.toContainEqual(
        expect.stringContaining("should end with /")
      );
    });

    it("should not warn for Dataset with fragment @id", () => {
      const roCrate = createMinimalValidRoCrate();
      // Add the fragment-ID dataset entity
      roCrate["@graph"].push({
        "@id": "#ai-files",
        "@type": "Dataset",
        name: "AI Files Collection",
        description: "Collection of .ai files"
      });
      // Link it from root dataset via hasPart to avoid orphaned entity warnings
      const rootDataset = roCrate["@graph"].find((e) => e["@id"] === "./");
      rootDataset.hasPart = [{ "@id": "#ai-files" }];

      const result = validator.validate(roCrate);
      // Should not warn about missing trailing slash for fragment IDs
      expect(result.warnings).not.toContainEqual(
        expect.stringContaining("should end with /")
      );
    });
  });

  describe("hasPart/isPartOf type validation", () => {
    it("should fail when hasPart references a Person entity", () => {
      const roCrate = createMinimalValidRoCrate();
      // Add a Person entity
      roCrate["@graph"].push({
        "@id": "#jane-doe",
        "@type": "Person",
        name: "Jane Doe"
      });
      // Add a People/ Dataset that incorrectly references the Person via hasPart
      roCrate["@graph"].push({
        "@id": "People/",
        "@type": "Dataset",
        name: "People",
        hasPart: [{ "@id": "#jane-doe" }]
      });
      // Link People/ from root via pcdm:hasMember
      const rootDataset = roCrate["@graph"].find((e) => e["@id"] === "./");
      rootDataset["pcdm:hasMember"] = [{ "@id": "People/" }];

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining(
          'hasPart reference to "#jane-doe" which is type "Person"'
        )
      );
    });

    it("should pass when hasPart only references Files and Datasets", () => {
      const roCrate = createMinimalValidRoCrate();
      // Add a Person entity (referenced elsewhere, not via hasPart)
      roCrate["@graph"].push({
        "@id": "#jane-doe",
        "@type": "Person",
        name: "Jane Doe"
      });
      // Add a File entity
      roCrate["@graph"].push({
        "@id": "People/Jane_Doe/photo.jpg",
        "@type": ["File", "ImageObject"],
        name: "photo.jpg",
        about: { "@id": "#jane-doe" },
        isPartOf: { "@id": "People/Jane_Doe/" }
      });
      // Add an intermediate Dataset for the person's files
      roCrate["@graph"].push({
        "@id": "People/Jane_Doe/",
        "@type": "Dataset",
        name: "Jane Doe files",
        about: { "@id": "#jane-doe" },
        hasPart: [{ "@id": "People/Jane_Doe/photo.jpg" }],
        isPartOf: { "@id": "People/" }
      });
      // Add People/ Dataset that references only Datasets (not Person)
      roCrate["@graph"].push({
        "@id": "People/",
        "@type": "Dataset",
        name: "People",
        hasPart: [{ "@id": "People/Jane_Doe/" }],
        "pcdm:memberOf": { "@id": "./" }
      });
      // Link People/ from root via pcdm:hasMember
      const rootDataset = roCrate["@graph"].find((e) => e["@id"] === "./");
      rootDataset["pcdm:hasMember"] = [{ "@id": "People/" }];

      const result = validator.validate(roCrate);

      // Should not have errors about hasPart referencing non-File/Dataset types
      const hasPartErrors = result.errors.filter((e) =>
        e.includes("hasPart reference to")
      );
      expect(hasPartErrors).toHaveLength(0);
    });

    it("should fail when hasPart references an Organization entity", () => {
      const roCrate = createMinimalValidRoCrate();
      // Add an Organization entity
      roCrate["@graph"].push({
        "@id": "#acme-corp",
        "@type": "Organization",
        name: "ACME Corporation"
      });
      // Root dataset incorrectly uses hasPart to reference Organization
      const rootDataset = roCrate["@graph"].find((e) => e["@id"] === "./");
      rootDataset.hasPart = [{ "@id": "#acme-corp" }];

      const result = validator.validate(roCrate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining(
          'hasPart reference to "#acme-corp" which is type "Organization"'
        )
      );
    });
  });
});
