import { vi, describe, it, beforeEach, expect } from "vitest";
import * as fs from "fs-extra";

// Mock the staticLanguageFinder dependency BEFORE importing modules that use it
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => `Language ${code}`)
  }
}));

// Mock fs-extra
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1000,
    birthtime: new Date("2023-01-01")
  })
}));

import { getRoCrate } from "../RoCrateExporter";
import { Session } from "../../../model/Project/Session/Session";
import { Project } from "../../../model/Project/Project";
import { Person } from "../../../model/Project/Person/Person";
import { FieldDefinition } from "../../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";
import {
  validateRoCrateWithCategories,
  ValidationResult
} from "../../../components/RoCrate/validation";

describe("RoCrateExporter Validation Tests", () => {
  let mockProject: Project;
  let mockSession: Session;

  beforeEach(() => {
    // Mock the field definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      [
        {
          key: "title",
          englishLabel: "Title",
          xmlTag: "Title",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true
        } as FieldDefinition,
        {
          key: "description",
          englishLabel: "Description",
          xmlTag: "Description",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true
        } as FieldDefinition,
        {
          key: "genre",
          englishLabel: "Genre",
          xmlTag: "Genre",
          vocabularyFile: "genres.json",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          rocrate: {
            key: "ldac:linguisticGenre",
            array: true,
            template: {
              "@id": "[v]",
              "@type": "DefinedTerm"
            }
          }
        } as FieldDefinition,
        {
          key: "access",
          englishLabel: "Access",
          xmlTag: "Access",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true
        } as FieldDefinition
      ]
    );

    vi.spyOn(fieldDefinitionsOfCurrentConfig, "common", "get").mockReturnValue([
      {
        key: "person",
        rocrate: {
          template: {
            "@id": "[v]",
            "@type": "Person"
          }
        }
      } as FieldDefinition,
      {
        key: "language",
        rocrate: {
          template: {
            "@id": "[v]",
            "@type": "Language"
          }
        }
      } as FieldDefinition
    ]);

    // Mock project
    mockProject = {
      directory: "/test/project",
      filePrefix: "test-project",
      knownFields: [
        {
          key: "title",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true
        },
        {
          key: "description",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true
        }
      ],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Project";
          if (key === "description") return "Test project description";
          if (key === "archiveConfigurationName") return "TestArchive";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [],
      authorityLists: {
        accessChoicesOfCurrentProtocol: [
          {
            label: "public",
            description: "Public access"
          },
          {
            label: "restricted",
            description: "Restricted access"
          },
          {
            label: "unspecified",
            description: "Unspecified access"
          }
        ]
      },
      findPerson: vi.fn().mockReturnValue(undefined)
    } as any;

    // Mock session
    mockSession = {
      filePrefix: "test-session",
      knownFields: [
        {
          key: "title",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true
        },
        {
          key: "description",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true
        },
        {
          key: "genre",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          vocabularyFile: "genres.json",
          rocrate: {
            key: "ldac:linguisticGenre",
            array: true,
            template: {
              "@id": "[v]",
              "@type": "DefinedTerm"
            }
          }
        },
        {
          key: "access",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true
        }
      ],
      metadataFile: {
        getTextProperty: vi
          .fn()
          .mockImplementation((key: string, defaultValue: string = "") => {
            if (key === "title") return "Test Session";
            if (key === "description") return "Test session description";
            if (key === "access") return "public";
            if (key === "genre") return "dialog";
            if (key === "languages") return "";
            return defaultValue;
          }),
        properties: {
          getHasValue: vi.fn().mockImplementation((key: string) => {
            return ["title", "description", "access", "genre"].includes(key);
          }),
          forEach: vi.fn()
        }
      },
      files: [],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as any;
  });

  describe("Basic RO-Crate Structure Validation", () => {
    it("should generate a valid basic RO-Crate structure for a session", async () => {
      const roCrateData = await getRoCrate(mockProject, mockSession);
      const validation = await validateRoCrateWithCategories(roCrateData);

      expect(roCrateData).toHaveProperty("@context");
      expect(roCrateData).toHaveProperty("@graph");
      expect(Array.isArray((roCrateData as any)["@graph"])).toBe(true);

      // Log validation results for debugging
      if (validation.errors.length > 0) {
        console.log(
          "Validation errors:",
          validation.errors.map((e) => e.message)
        );
      }
      if (validation.warnings.length > 0) {
        console.log(
          "Validation warnings:",
          validation.warnings.map((w) => w.message)
        );
      }

      // The test passes if we can generate RO-Crate and run validation
      expect(validation).toHaveProperty("errors");
      expect(validation).toHaveProperty("warnings");
      expect(validation).toHaveProperty("info");
    });

    it("should include required metadata descriptor and root dataset", async () => {
      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const graph = roCrateData["@graph"];

      // Should have metadata descriptor
      const metadataDescriptor = graph.find(
        (item: any) => item["@id"] === "ro-crate-metadata.json"
      );
      expect(metadataDescriptor).toBeDefined();
      expect(metadataDescriptor["@type"]).toBe("CreativeWork");

      // Should have root dataset
      const rootDataset = graph.find((item: any) => item["@id"] === "./");
      expect(rootDataset).toBeDefined();
      expect(rootDataset["@type"]).toContain("Dataset");
    });

    it("should include required context declarations", async () => {
      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const context = roCrateData["@context"];

      expect(Array.isArray(context)).toBe(true);
      expect(context).toContain("https://w3id.org/ro/crate/1.2/context");
      expect(context).toContain(
        "http://purl.archive.org/language-data-commons/context.json"
      );
      expect(context).toContain("https://w3id.org/ldac/context");
    });
  });

  describe("LDAC Profile Compliance", () => {
    it("should generate LDAC-compliant metadata with proper conformsTo", async () => {
      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const graph = roCrateData["@graph"];

      const rootDataset = graph.find((item: any) => item["@id"] === "./");
      expect(rootDataset.conformsTo).toBeDefined();
      expect(rootDataset.conformsTo["@id"]).toBe(
        "https://w3id.org/ldac/profile#Object"
      );

      const validation = await validateRoCrateWithCategories(roCrateData);
      // Should be able to validate without critical errors
      expect(validation).toBeDefined();
    });

    it("should handle genre mapping to LDAC linguistic genres", async () => {
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "description") return "Test session description";
          if (key === "access") return "public";
          if (key === "genre") return "dialog"; // Maps to ldac:Dialogue
          return "";
        });

      mockSession.metadataFile!.properties = {
        getHasValue: vi.fn().mockImplementation((key: string) => {
          return ["title", "description", "access", "genre"].includes(key);
        }),
        forEach: vi.fn()
      } as any;

      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      const graph = roCrateData["@graph"];
      const rootDataset = graph.find((item: any) => item["@id"] === "./");

      console.log(
        "mockSession.knownFields:",
        mockSession.knownFields.map((f) => f.key)
      );
      console.log(
        "genre field:",
        mockSession.knownFields.find((f) => f.key === "genre")
      );
      console.log("rootDataset properties:", Object.keys(rootDataset));
      console.log("rootDataset content:", JSON.stringify(rootDataset, null, 2));

      expect(rootDataset["ldac:linguisticGenre"]).toBeDefined();
      expect(Array.isArray(rootDataset["ldac:linguisticGenre"])).toBe(true);

      // Should have genre definition in graph
      const genreDefinition = graph.find(
        (item: any) =>
          item["@type"] === "DefinedTerm" && item["@id"].includes("Dialogue")
      );
      expect(genreDefinition).toBeDefined();

      // Validation should run without throwing
      expect(validation).toBeDefined();
    });
  });

  describe("Access Control and Licensing", () => {
    it("should handle public access properly", async () => {
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "access") return "public";
          if (key === "title") return "Public Session";
          if (key === "description") return "Public test session";
          return "";
        });

      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      const graph = roCrateData["@graph"];
      const license = graph.find(
        (item: any) => item["@id"] === "#license-testarchive-public"
      );

      expect(license).toBeDefined();
      expect(license.description).toContain("TestArchive-specific term");
      expect(license.description).toContain("'public'");

      // Validation should run
      expect(validation).toBeDefined();
    });

    it("should handle restricted access properly", async () => {
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "access") return "restricted";
          if (key === "title") return "Restricted Session";
          if (key === "description") return "Restricted test session";
          return "";
        });

      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      const graph = roCrateData["@graph"];
      const license = graph.find(
        (item: any) => item["@id"] === "#license-testarchive-restricted"
      );

      expect(license).toBeDefined();
      expect(license.description).toContain("TestArchive-specific term");
      expect(license.description).toContain("'restricted'");

      // Validation should run
      expect(validation).toBeDefined();
    });
  });

  describe("Custom Genre Handling", () => {
    it("should handle custom genres not in LDAC vocabulary", async () => {
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title") return "Custom Genre Session";
          if (key === "description") return "Session with custom genre";
          if (key === "access") return "public";
          if (key === "genre") return "custom_special_genre";
          return "";
        });

      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      const graph = roCrateData["@graph"];
      const rootDataset = graph.find((item: any) => item["@id"] === "./");

      expect(rootDataset["ldac:linguisticGenre"]).toBeDefined();

      // Should create a custom term definition with new tag format
      const customGenreDefinition = graph.find(
        (item: any) =>
          item["@type"] === "DefinedTerm" &&
          item["@id"].includes("custom_special_genre")
      );
      expect(customGenreDefinition).toBeDefined();

      // Validation should run
      expect(validation).toBeDefined();
    });
  });

  describe("Required Metadata Fields", () => {
    it("should require title and description", async () => {
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "access") return "public";
          return ""; // No title or description
        });
      mockSession.metadataFile!.properties.getHasValue = vi
        .fn()
        .mockReturnValue(false);

      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      const graph = roCrateData["@graph"];
      const rootDataset = graph.find((item: any) => item["@id"] === "./");

      // Should have fallback values
      expect(rootDataset.name).toBe("No title provided for this session.");
      expect(rootDataset.description).toBe(
        "No description provided for this session."
      );

      // Validation should run
      expect(validation).toBeDefined();
    });

    it("should include publisher information", async () => {
      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      const graph = roCrateData["@graph"];
      const rootDataset = graph.find((item: any) => item["@id"] === "./");

      expect(rootDataset.publisher).toBeDefined();
      // LAM-35 regression guard: publisher must reference the archive organisation, not lameta GitHub
      // https://linear.app/lameta/issue/LAM-35/ro-crate-4-publisher-metadata
      const expectedPublisherId = "#publisher-testarchive";
      expect(rootDataset.publisher["@id"]).toBe(expectedPublisherId);

      // Check that the publisher entity is actually defined in the graph
      const publisherEntity = graph.find(
        (item: any) => item["@id"] === expectedPublisherId
      );
      expect(publisherEntity).toBeDefined();
      expect(publisherEntity["@type"]).toBe("Organization");
      expect(publisherEntity.name).toBe("TestArchive");

      // Validation should run
      expect(validation).toBeDefined();
    });
  });

  describe("Multiple Genre Scenarios", () => {
    it("should handle multiple genres correctly", async () => {
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title") return "Multi-Genre Session";
          if (key === "description") return "Session with multiple genres";
          if (key === "access") return "public";
          if (key === "genre") return "dialog,narrative"; // Multiple genres
          return "";
        });

      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      const graph = roCrateData["@graph"];
      const rootDataset = graph.find((item: any) => item["@id"] === "./");

      expect(rootDataset["ldac:linguisticGenre"]).toBeDefined();
      expect(Array.isArray(rootDataset["ldac:linguisticGenre"])).toBe(true);
      expect(rootDataset["ldac:linguisticGenre"].length).toBeGreaterThan(1);

      // Validation should run
      expect(validation).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty metadata gracefully", async () => {
      mockSession.metadataFile!.getTextProperty = vi.fn().mockReturnValue("");
      mockSession.metadataFile!.properties.getHasValue = vi
        .fn()
        .mockReturnValue(false);

      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      expect(roCrateData).toHaveProperty("@graph");
      expect(Array.isArray(roCrateData["@graph"])).toBe(true);

      // Should still have basic structure even with empty metadata
      const graph = roCrateData["@graph"];
      const rootDataset = graph.find((item: any) => item["@id"] === "./");
      expect(rootDataset).toBeDefined();

      // Validation should run
      expect(validation).toBeDefined();
    });

    it("should handle special characters in metadata", async () => {
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title") return "Special chars: àáâãäåæçèéêë & <>";
          if (key === "description")
            return "Description with \"quotes\" and 'apostrophes'";
          if (key === "access") return "public";
          return "";
        });

      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      // Should not fail due to special characters
      expect(roCrateData).toHaveProperty("@graph");

      const graph = roCrateData["@graph"];
      const rootDataset = graph.find((item: any) => item["@id"] === "./");
      expect(rootDataset.name).toContain("Special chars");
      expect(rootDataset.description).toContain("quotes");

      // Validation should run
      expect(validation).toBeDefined();
    });
  });

  describe("Project-level RO-Crate Validation", () => {
    it("should generate a valid RO-Crate structure for a project with sessions", async () => {
      // Add sessions to the project mock
      const mockSessionInProject = {
        knownFields: [],
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "title") return "Session in Project";
            if (key === "description") return "Session description";
            if (key === "access") return "public";
            return "";
          }),
          properties: {
            getHasValue: vi.fn().mockReturnValue(false),
            forEach: vi.fn()
          }
        },
        files: [],
        getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
      } as any;

      // Add sessions property to mockProject
      (mockProject as any).sessions = {
        items: [mockSessionInProject]
      };

      const roCrateData = await getRoCrate(mockProject, mockProject);
      const validation = await validateRoCrateWithCategories(roCrateData);

      // Should have the basic RO-Crate structure
      expect(roCrateData).toHaveProperty("@context");
      expect(roCrateData).toHaveProperty("@graph");
      expect(Array.isArray((roCrateData as any)["@graph"])).toBe(true);

      // Log validation results for debugging
      if (validation.errors.length > 0) {
        console.log(
          "Project validation errors:",
          validation.errors.map((e) => e.message)
        );
      }
      if (validation.warnings.length > 0) {
        console.log(
          "Project validation warnings:",
          validation.warnings.map((w) => w.message)
        );
      }

      // Should have metadata descriptor
      const graph = (roCrateData as any)["@graph"];
      const metadataDescriptor = graph.find(
        (item: any) => item["@id"] === "ro-crate-metadata.json"
      );
      expect(metadataDescriptor).toBeDefined();
      expect(metadataDescriptor["@type"]).toBe("CreativeWork");

      // Should have a root dataset pointing to the project
      const rootDataset = graph.find((item: any) => item["@id"] === "./");
      expect(rootDataset).toBeDefined();

      // Validation should complete without throwing
      expect(validation).toHaveProperty("errors");
      expect(validation).toHaveProperty("warnings");
      expect(validation).toHaveProperty("info");
    });

    it("should generate a valid RO-Crate structure for a project without sessions", async () => {
      // Set up project without sessions
      (mockProject as any).sessions = {
        items: []
      };

      const roCrateData = await getRoCrate(mockProject, mockProject);
      const validation = await validateRoCrateWithCategories(roCrateData);

      // Should still have the basic structure
      expect(roCrateData).toHaveProperty("@context");
      expect(roCrateData).toHaveProperty("@graph");
      expect(Array.isArray((roCrateData as any)["@graph"])).toBe(true);

      // Should have metadata descriptor
      const graph = (roCrateData as any)["@graph"];
      const metadataDescriptor = graph.find(
        (item: any) => item["@id"] === "ro-crate-metadata.json"
      );
      expect(metadataDescriptor).toBeDefined();

      // Validation should complete
      expect(validation).toHaveProperty("errors");
      expect(validation).toHaveProperty("warnings");
      expect(validation).toHaveProperty("info");
    });

    it("should generate a root dataset with all required properties", async () => {
      (mockProject as any).sessions = {
        items: []
      };

      const roCrateData = await getRoCrate(mockProject, mockProject);
      const validation = await validateRoCrateWithCategories(roCrateData);

      // Find the root dataset
      const graph = (roCrateData as any)["@graph"];
      const rootDataset = graph.find((item: any) => item["@id"] === "./");
      expect(rootDataset).toBeDefined();

      // Check for all required properties according to RO-Crate spec
      expect(rootDataset).toHaveProperty("@type");
      expect(rootDataset).toHaveProperty("@id", "./");
      expect(rootDataset).toHaveProperty("name");
      expect(rootDataset).toHaveProperty("description");
      expect(rootDataset).toHaveProperty("datePublished");
      expect(rootDataset).toHaveProperty("license");

      // The validation should not have errors about missing required properties
      const missingLicenseError = validation.errors.find((error) =>
        error.message.includes("Missing required property: license")
      );
      expect(missingLicenseError).toBeUndefined();
    });
  });

  describe("Session ID Sanitization", () => {
    it("should sanitize invalid characters in session @id identifiers", async () => {
      // Create a session with invalid characters in filePrefix (simulating folder names with spaces and parentheses)
      const mockSessionWithInvalidChars = {
        filePrefix: "dde-houmba-ori (v1)", // Contains space and parentheses
        knownFields: [], // Add empty knownFields array
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "title") return "Test Session with Invalid Chars";
            if (key === "description") return "Test session description";
            return "";
          }),
          properties: {
            getHasValue: vi.fn().mockReturnValue(false),
            forEach: vi.fn()
          }
        },
        files: [],
        getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
      } as any;

      // Add the session with invalid chars to mockProject
      (mockProject as any).sessions = {
        items: [mockSessionWithInvalidChars]
      };

      const roCrateData = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrateData["@graph"];

      // Find the session entry
      const sessionEntry = graph.find(
        (item: any) =>
          item["@type"] &&
          Array.isArray(item["@type"]) &&
          item["@type"].includes("RepositoryObject") &&
          item["@id"].startsWith("Sessions/")
      );

      expect(sessionEntry).toBeDefined();

      // The @id should be URL encoded
      expect(sessionEntry["@id"]).not.toMatch(/[\s()]/); // No spaces or parentheses in URL
      expect(sessionEntry["@id"]).toMatch(/^Sessions\/[a-zA-Z0-9_.%-]+\/$/); // Valid IRI format with URL encoding

      // Should sanitize to URL encoded format
      expect(sessionEntry["@id"]).toBe("Sessions/dde-houmba-ori%20%28v1%29/");
    });

    it("should handle multiple types of invalid characters in session IDs", async () => {
      const testCases = [
        {
          input: "dde-houmba-ori (v2)",
          expected: "Sessions/dde-houmba-ori%20%28v2%29/"
        },
        {
          input: "dde-kabousoulou1-ori (v2)",
          expected: "Sessions/dde-kabousoulou1-ori%20%28v2%29/"
        },
        {
          input: "dde-mahoungou-ori (NO IC!)",
          expected: "Sessions/dde-mahoungou-ori%20%28NO%20IC%21%29/"
        },
        {
          input: "session with spaces",
          expected: "Sessions/session%20with%20spaces/"
        }
      ];

      for (const testCase of testCases) {
        const mockSessionWithChars = {
          filePrefix: testCase.input,
          knownFields: [], // Add empty knownFields array
          metadataFile: {
            getTextProperty: vi.fn().mockImplementation((key: string) => {
              if (key === "title") return `Test Session ${testCase.input}`;
              if (key === "description") return "Test session description";
              return "";
            }),
            properties: {
              getHasValue: vi.fn().mockReturnValue(false),
              forEach: vi.fn()
            }
          },
          files: [],
          getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
        } as any;

        // Add the session to mockProject
        (mockProject as any).sessions = {
          items: [mockSessionWithChars]
        };

        const roCrateData = (await getRoCrate(mockProject, mockProject)) as any;
        const graph = roCrateData["@graph"];

        const sessionEntry = graph.find(
          (item: any) =>
            item["@type"] &&
            Array.isArray(item["@type"]) &&
            item["@type"].includes("RepositoryObject") &&
            item["@id"].startsWith("Sessions/")
        );

        expect(sessionEntry).toBeDefined();
        expect(sessionEntry["@id"]).toBe(testCase.expected);
      }
    });

    it("should sanitize invalid characters in file names within session @id identifiers", async () => {
      // Mock file with spaces and special characters in name
      const mockFileWithInvalidName = {
        getActualFilePath: () =>
          "C:/temp/BAHOUNGOU Hilaire_Consent (final)!.wav",
        getModifiedDate: () => new Date("2023-01-01"),
        getCreatedDate: () => new Date("2023-01-01")
      };

      const mockSessionWithFileInvalidChars = {
        filePrefix: "test-session",
        knownFields: [],
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "title") return "Test Session";
            if (key === "description") return "Test session description";
            return "";
          }),
          properties: {
            getHasValue: vi.fn().mockReturnValue(false),
            forEach: vi.fn()
          }
        },
        files: [mockFileWithInvalidName],
        getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
      } as any;

      (mockProject as any).sessions = {
        items: [mockSessionWithFileInvalidChars]
      };

      // Set the proper prototype for the session so instanceof checks work
      Object.setPrototypeOf(mockSessionWithFileInvalidChars, Session.prototype);

      const roCrateData = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrateData["@graph"];

      // Find the session entry in the graph
      const sessionEntry = graph.find(
        (item: any) =>
          item["@id"] === "Sessions/test-session/" &&
          item["@type"] &&
          Array.isArray(item["@type"]) &&
          item["@type"].includes("RepositoryObject")
      );

      expect(sessionEntry).toBeDefined();

      // Find the file entry in the graph
      const fileEntry = graph.find((item: any) => {
        const types = Array.isArray(item["@type"])
          ? item["@type"]
          : [item["@type"]];
        return (
          item["@id"]?.includes("BAHOUNGOU") && types.includes("AudioObject")
        );
      });

      expect(fileEntry).toBeDefined();

      // The key test: the @id should be sanitized (URL encoded) and include full path
      const expectedFileId =
        "Sessions/test-session/BAHOUNGOU%20Hilaire_Consent%20%28final%29%21.wav";
      expect(fileEntry["@id"]).toBe(expectedFileId);
      expect(fileEntry["@id"]).not.toMatch(/[\s()!]/); // No spaces, parentheses, or exclamation marks in URL
      expect(fileEntry.name).toBe("BAHOUNGOU Hilaire_Consent (final)!.wav"); // Original name preserved in 'name' property

      // Critical test: Verify that the session's hasPart references match the actual file @id
      expect(sessionEntry.hasPart).toBeDefined();
      const hasPartReference = sessionEntry.hasPart.find(
        (ref: any) => ref["@id"] === expectedFileId
      );
      expect(hasPartReference).toBeDefined();
      expect(hasPartReference["@id"]).toBe(expectedFileId);
    });

    it("should ensure hasPart references match sanitized file IDs for Person entities", async () => {
      // Mock files with spaces and special characters in names
      const mockPersonPhoto = {
        getActualFilePath: () => "C:/temp/BAHOUNGOU Hilaire_Photo (v2)!.JPG",
        getModifiedDate: () => new Date("2023-01-01"),
        getCreatedDate: () => new Date("2023-01-01")
      };

      const mockPersonConsent = {
        getActualFilePath: () =>
          "C:/temp/BAHOUNGOU Hilaire_Consent (final).wav",
        getModifiedDate: () => new Date("2023-01-01"),
        getCreatedDate: () => new Date("2023-01-01")
      };

      const mockPersonWithFiles = {
        filePrefix: "BAHOUNGOU Hilaire",
        knownFields: [
          {
            key: "name",
            englishLabel: "Full Name",
            personallyIdentifiableInformation: false,
            isCustom: false
          }
        ],
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "name") return "BAHOUNGOU Hilaire";
            return "";
          }),
          properties: {
            getHasValue: vi.fn().mockReturnValue(true),
            forEach: vi.fn()
          }
        },
        files: [mockPersonPhoto, mockPersonConsent]
      } as any;

      // Mock project with this person
      const mockProjectWithPerson = {
        filePrefix: "test-project",
        sessions: { items: [] },
        findPerson: vi.fn().mockReturnValue(mockPersonWithFiles),
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "title") return "Test Project";
            return "";
          }),
          properties: {
            getHasValue: vi.fn().mockReturnValue(false),
            forEach: vi.fn()
          }
        },
        files: [],
        knownFields: [],
        authorityLists: { accessChoicesOfCurrentProtocol: [] }
      } as any;

      Object.setPrototypeOf(mockProjectWithPerson, Project.prototype);
      Object.setPrototypeOf(mockPersonWithFiles, Person.prototype);

      const roCrateData = (await getRoCrate(
        mockProjectWithPerson,
        mockPersonWithFiles
      )) as any;
      const graph = Array.isArray(roCrateData)
        ? roCrateData
        : roCrateData["@graph"];

      // Find the person entry
      const personEntry = graph.find((item: any) => item["@type"] === "Person");

      expect(personEntry).toBeDefined();

      // Find the file entries
      const photoEntry = graph.find((item: any) => {
        const types = Array.isArray(item["@type"])
          ? item["@type"]
          : [item["@type"]];
        return types.includes("ImageObject") && item["@id"]?.includes("Photo");
      });
      const consentEntry = graph.find((item: any) => {
        const types = Array.isArray(item["@type"])
          ? item["@type"]
          : [item["@type"]];
        return (
          types.includes("AudioObject") && item["@id"]?.includes("Consent")
        );
      });

      expect(photoEntry).toBeDefined();
      expect(consentEntry).toBeDefined();

      // Verify file IDs are URL encoded
      const expectedPhotoId =
        "People/BAHOUNGOU%20Hilaire/BAHOUNGOU%20Hilaire_Photo%20%28v2%29%21.JPG";
      const expectedConsentId =
        "People/BAHOUNGOU%20Hilaire/BAHOUNGOU%20Hilaire_Consent%20%28final%29.wav";

      expect(photoEntry["@id"]).toBe(expectedPhotoId);
      expect(consentEntry["@id"]).toBe(expectedConsentId);

      // Critical test: Verify that the person's hasPart references match the actual file @ids
      expect(personEntry.hasPart).toBeDefined();
      expect(Array.isArray(personEntry.hasPart)).toBe(true);

      const photoReference = personEntry.hasPart.find(
        (ref: any) => ref["@id"] === expectedPhotoId
      );
      const consentReference = personEntry.hasPart.find(
        (ref: any) => ref["@id"] === expectedConsentId
      );

      expect(photoReference).toBeDefined();
      expect(photoReference["@id"]).toBe(expectedPhotoId);
      expect(consentReference).toBeDefined();
      expect(consentReference["@id"]).toBe(expectedConsentId);

      // Verify no invalid characters in any @id
      expect(photoEntry["@id"]).not.toMatch(/[\s()!]/);
      expect(consentEntry["@id"]).not.toMatch(/[\s()!]/);
      expect(photoReference["@id"]).not.toMatch(/[\s()!]/);
      expect(consentReference["@id"]).not.toMatch(/[\s()!]/);
    });
  });
});
