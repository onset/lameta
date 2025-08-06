import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import { Session } from "../../../model/Project/Session/Session";
import { Field } from "../../../model/field/Field";

describe("RO-Crate LDAC Profile Compliance", () => {
  let mockProject: any;
  let mockSession: any;

  beforeEach(() => {
    // Create a comprehensive mock project for LDAC compliance testing
    mockProject = {
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          const values = {
            title: "Test Collection",
            collectionDescription: "Test description",
            contactPerson: "John Doe"
          };
          return values[key] || "";
        })
      },
      findPerson: vi.fn().mockReturnValue(null),
      sessions: { items: [] },
      people: { items: [] }
    };

    // Create mock session with language data
    mockSession = {
      "@type": "Session",
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([]),
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "id") return "test-session";
          if (key === "title") return "Test Session";
          return "";
        }),
        properties: {
          getTextStringOrEmpty: vi.fn().mockImplementation((key: string) => {
            if (key === "workingLanguages") return "etr: Edolo";
            if (key === "languages") return "etr: Edolo";
            return "";
          }),
          forEach: vi.fn() // Add missing forEach method for custom properties handling
        }
      },
      getWorkingLanguageCodes: vi.fn().mockReturnValue(["etr"]),
      getSubjectLanguageCodes: vi.fn().mockReturnValue(["etr"]),
      knownFields: [
        {
          key: "workingLanguages",
          persist: true,
          type: "languageChoices",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          englishLabel: "Working Languages",
          rocrate: {
            key: "inLanguage",
            handler: "languages",
            array: false,
            template: { "@id": "#language_[v]" }
          }
        },
        {
          key: "languages",
          persist: true,
          type: "languageChoices",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          englishLabel: "Subject Languages",
          rocrate: {
            key: "ldac:subjectLanguage",
            handler: "languages",
            array: true
          }
        }
      ],
      files: []
    };
  });

  describe("Problem 1: inLanguage property compliance", () => {
    it("should set inLanguage as a string containing BCP47 language tag, not an object reference", async () => {
      const result = (await getRoCrate(mockProject, mockSession)) as any;
      const sessionEntry = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );

      expect(sessionEntry).toBeDefined();

      // According to LDAC profile, inLanguage MUST be a string containing a BCP47 language tag
      expect(sessionEntry["inLanguage"]).toBeDefined();
      expect(typeof sessionEntry["inLanguage"]).toBe("string");
      expect(sessionEntry["inLanguage"]).toBe("etr"); // Should be the language code directly

      // Should NOT be an object reference
      expect(sessionEntry["inLanguage"]).not.toHaveProperty("@id");
    });

    it("should fallback to 'und' string when no working languages are specified", async () => {
      // Mock session with no working languages
      mockSession.metadataFile.properties.getTextStringOrEmpty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "languages") return "etr: Edolo"; // Still has subject languages
          return ""; // No working languages
        });
      mockSession.getWorkingLanguageCodes = vi.fn().mockReturnValue([]);

      const result = (await getRoCrate(mockProject, mockSession)) as any;
      const sessionEntry = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );

      expect(sessionEntry["inLanguage"]).toBe("und");
    });
  });
});
