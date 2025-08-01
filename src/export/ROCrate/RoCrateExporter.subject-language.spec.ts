import { vi, describe, it, beforeEach, expect } from "vitest";
import { getRoCrate } from "./RoCrateExporter";
import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";

// Mock the staticLanguageFinder dependency BEFORE importing modules that use it
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => {
        const languageMap: { [key: string]: string } = {
          etr: "Edolo",
          tpi: "Tok Pisin",
          hui: "Huli"
        };
        return languageMap[code] || code;
      })
  }
}));

describe("RoCrateExporter ldac:subjectLanguage format", () => {
  let mockProject: Project;
  let mockSession: Session;

  beforeEach(() => {
    // Mock the field definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      [
        {
          key: "languages",
          persist: true,
          type: "languageChoices",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          rocrate: {
            key: "ldac:subjectLanguage",
            handler: "languages",
            array: true
          }
        } as any
      ]
    );

    vi.spyOn(fieldDefinitionsOfCurrentConfig, "common", "get").mockReturnValue(
      []
    );

    // Mock project
    mockProject = {
      filePrefix: "test_project",
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Project";
          return "";
        })
      } as any,
      authorityLists: {
        accessChoicesOfCurrentProtocol: []
      }
    } as any;

    // Mock session
    mockSession = {
      filePrefix: "test_session",
      knownFields: [
        {
          key: "languages",
          persist: true,
          type: "languageChoices",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          rocrate: {
            key: "ldac:subjectLanguage",
            handler: "languages",
            array: true
          }
        }
      ],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "languages") return "etr: Edolo;tpi: Tok Pisin";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockImplementation((key: string) => {
            return key === "languages";
          }),
          getTextStringOrEmpty: vi.fn().mockImplementation((key: string) => {
            if (key === "languages") return "etr: Edolo;tpi: Tok Pisin";
            return "";
          }),
          forEach: vi.fn()
        }
      },
      files: [],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as any;
  });

  it("should format ldac:subjectLanguage as array of objects with @id properties", async () => {
    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    expect(sessionEntry["ldac:subjectLanguage"]).toBeDefined();
    expect(Array.isArray(sessionEntry["ldac:subjectLanguage"])).toBe(true);

    // Check that each value is an object with @id property, not a bare string
    sessionEntry["ldac:subjectLanguage"].forEach((item: any) => {
      expect(typeof item).toBe("object");
      expect(item).toHaveProperty("@id");
      expect(typeof item["@id"]).toBe("string");
      expect(item["@id"]).toMatch(/^#language_/);
    });

    // Should have references to both languages
    const languageIds = sessionEntry["ldac:subjectLanguage"].map(
      (item: any) => item["@id"]
    );
    expect(languageIds).toContain("#language_etr");
    expect(languageIds).toContain("#language_tpi");
  });

  it("should not have unreferenced language entities", async () => {
    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find all language entities
    const languageEntities = result["@graph"].filter(
      (item: any) =>
        item["@type"] === "Language" && item["@id"]?.startsWith("#language_")
    );

    // Find all referenced language IDs
    const referencedLanguageIds = new Set<string>();
    result["@graph"].forEach((item: any) => {
      if (item["ldac:subjectLanguage"]) {
        item["ldac:subjectLanguage"].forEach((ref: any) => {
          if (typeof ref === "string") {
            referencedLanguageIds.add(ref);
          } else if (ref && ref["@id"]) {
            referencedLanguageIds.add(ref["@id"]);
          }
        });
      }
    });

    // Check that all language entities are referenced
    languageEntities.forEach((entity: any) => {
      expect(referencedLanguageIds.has(entity["@id"])).toBe(true);
    });
  });

  it("should handle template-based language fields correctly", async () => {
    // Test a field that uses template instead of handler
    mockSession.knownFields = [
      {
        key: "workingLanguages",
        persist: true,
        type: "languageChoices",
        multilingual: false,
        isCustom: false,
        showOnAutoForm: true,
        englishLabel: "Working Languages",
        rocrate: {
          key: "contentLanguages",
          handler: "languages", // Has both handler and template
          array: true,
          template: { "@id": "#language_[v]" }
        }
      } as any
    ];

    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "workingLanguages") return "etr: Edolo;tpi: Tok Pisin";
        return "";
      });

    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        return key === "workingLanguages";
      });

    mockSession.metadataFile!.properties.getTextStringOrEmpty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "workingLanguages") return "etr: Edolo;tpi: Tok Pisin";
        return "";
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // The contentLanguages should be properly formatted as objects with @id
    if (sessionEntry["contentLanguages"]) {
      expect(Array.isArray(sessionEntry["contentLanguages"])).toBe(true);
      sessionEntry["contentLanguages"].forEach((item: any) => {
        expect(typeof item).toBe("object");
        expect(item).toHaveProperty("@id");
        expect(typeof item["@id"]).toBe("string");
      });
    }
  });

  it("should format ldac:subjectLanguage as array of objects with @id properties for template-based fields", async () => {
    // Test a field that uses ONLY template, no handler (this reproduces the original issue)
    mockSession.knownFields = [
      {
        key: "testLanguages",
        persist: true,
        type: "languageChoices",
        multilingual: false,
        isCustom: false,
        showOnAutoForm: true,
        englishLabel: "Test Languages",
        rocrate: {
          key: "ldac:subjectLanguage",
          // No handler! Only template - this was the problematic case
          array: true,
          template: {
            "@id": "#language_[v]",
            "@type": "Language",
            name: "[languageName]"
          }
        }
      } as any
    ];

    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "testLanguages") return "etr: Edolo;tpi: Tok Pisin";
        return "";
      });

    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        return key === "testLanguages";
      });

    mockSession.metadataFile!.properties.getTextStringOrEmpty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "testLanguages") return "etr: Edolo;tpi: Tok Pisin";
        return "";
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // This should be fixed now: values should be objects with proper @id references
    if (sessionEntry["ldac:subjectLanguage"]) {
      expect(Array.isArray(sessionEntry["ldac:subjectLanguage"])).toBe(true);

      // Check the format - should be objects with @id properties
      sessionEntry["ldac:subjectLanguage"].forEach((item: any) => {
        expect(typeof item).toBe("object");
        expect(item).toHaveProperty("@id");
        expect(typeof item["@id"]).toBe("string");
        // The @id should be clean language codes, not include the description
        expect(item["@id"]).toMatch(/^#language_[a-z]+$/);
      });

      // Should have separate entries for each language
      expect(sessionEntry["ldac:subjectLanguage"]).toHaveLength(2);
      const languageIds = sessionEntry["ldac:subjectLanguage"].map(
        (item: any) => item["@id"]
      );
      expect(languageIds).toContain("#language_etr");
      expect(languageIds).toContain("#language_tpi");
    }

    // Check that language entities are created and referenced correctly
    const languageEntities = result["@graph"].filter(
      (item: any) =>
        item["@type"] === "Language" && item["@id"]?.startsWith("#language_")
    );

    expect(languageEntities).toHaveLength(2);

    // All language entities should be referenced (no unreferenced entities)
    const referencedLanguageIds = new Set<string>();
    result["@graph"].forEach((item: any) => {
      if (item["ldac:subjectLanguage"]) {
        item["ldac:subjectLanguage"].forEach((ref: any) => {
          if (ref && ref["@id"]) {
            referencedLanguageIds.add(ref["@id"]);
          }
        });
      }
    });

    languageEntities.forEach((entity: any) => {
      expect(referencedLanguageIds.has(entity["@id"])).toBe(true);
    });
  });
});
