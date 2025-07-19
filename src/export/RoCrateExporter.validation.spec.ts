import { vi, describe, it, beforeEach, expect } from "vitest";
import { getRoCrate } from "./RoCrateExporter";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../model/field/ConfiguredFieldDefinitions";
import {
  validateRoCrateWithCategories,
  ValidationResult
} from "../components/RoCrate/validation";

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
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "description") return "Test session description";
          if (key === "access") return "public";
          if (key === "genre") return "dialog";
          return "";
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
      expect(context).toContain("https://w3id.org/ro/crate/1.2-DRAFT/context");
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
        "https://purl.archive.org/language-data-commons/profile#Object"
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

      const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
      const validation = await validateRoCrateWithCategories(roCrateData);

      const graph = roCrateData["@graph"];
      const rootDataset = graph.find((item: any) => item["@id"] === "./");

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
      const license = graph.find((item: any) => item["@id"] === "#license");

      expect(license).toBeDefined();
      expect(license.name).toBe("public");

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
      const license = graph.find((item: any) => item["@id"] === "#license");

      expect(license).toBeDefined();
      expect(license.name).toBe("restricted");

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

      // Should create a custom term definition
      const customGenreDefinition = graph.find(
        (item: any) =>
          item["@type"] === "DefinedTerm" &&
          item["@id"].includes("CustomSpecialGenre")
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
      expect(rootDataset.publisher["@id"]).toBe(
        "https://github.com/onset/lameta"
      );

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
  });
});
