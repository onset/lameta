import { vi, describe, it, beforeEach, expect } from "vitest";
import {
  makeEntriesFromParticipant,
  getPersonLanguageElement
} from "./RoCratePeople";
import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import { Person } from "../../model/Project/Person/Person";
import { FieldDefinition } from "../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";
import { IPersonLanguage } from "../../model/PersonLanguage";

// Mock the staticLanguageFinder
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => {
        const languageMap: { [key: string]: string } = {
          en: "English",
          fr: "French"
        };
        return languageMap[code] || code;
      })
  }
}));

describe("RoCratePeople", () => {
  let mockProject: Project;
  let mockSession: Session;
  let mockPerson: Person;

  beforeEach(() => {
    // Mock the field definitions
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
            "@id": "#language_[code]",
            "@type": "Language",
            name: "[languageName]"
          }
        }
      } as FieldDefinition
    ]);

    // Mock person
    mockPerson = {
      filePrefix: "john-doe",
      metadataFile: {
        getTextProperty: vi.fn().mockReturnValue("John Doe"),
        properties: {
          forEach: vi.fn(),
          getHasValue: vi.fn().mockReturnValue(true)
        },
        languages: []
      },
      knownFields: [],
      files: [],
      ageOn: vi.fn().mockReturnValue("30")
    } as any;

    // Mock project
    mockProject = {
      findPerson: vi.fn().mockImplementation((name: string) => {
        if (name === "John Doe") return mockPerson;
        return undefined;
      })
    } as any;

    // Mock session
    mockSession = {
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([
        {
          personReference: "John Doe",
          role: "speaker"
        },
        {
          personReference: "Jane Smith",
          role: "interviewer"
        }
      ]),
      properties: {
        getDateField: vi.fn().mockReturnValue({
          asDate: () => new Date("2010-01-01")
        })
      }
    } as any;
  });

  describe("makeEntriesFromParticipant", () => {
    it("should create person entries for session participants", async () => {
      const result = await makeEntriesFromParticipant(mockProject, mockSession);

      expect(result).toHaveLength(2);

      const johnEntry = result.find(
        (entry: any) => entry["@id"] === "People/john-doe/"
      );
      expect(johnEntry).toBeDefined();
      expect(johnEntry!["@type"]).toBe("Person");

      const janeEntry = result.find(
        (entry: any) => entry["@id"] === "Jane Smith"
      );
      expect(janeEntry).toBeDefined();
      expect(janeEntry!["@type"]).toBe("Person");
    });

    it("should handle missing person field definition", async () => {
      vi.spyOn(
        fieldDefinitionsOfCurrentConfig,
        "common",
        "get"
      ).mockReturnValue([]);

      const result = await makeEntriesFromParticipant(mockProject, mockSession);

      expect(result).toEqual([]);
    });

    it("should group roles by person", async () => {
      mockSession.getAllContributionsToAllFiles = vi.fn().mockReturnValue([
        { personReference: "John Doe", role: "speaker" },
        { personReference: "John Doe", role: "interviewer" }
      ]);

      const result = await makeEntriesFromParticipant(mockProject, mockSession);

      expect(result).toHaveLength(1);
      expect(result[0]["@id"]).toBe("People/john-doe/");
    });
  });

  describe("getPersonLanguageElement", () => {
    it("should create language element from person language object", () => {
      const personLanguage: IPersonLanguage = {
        code: "en",
        primary: true
      };

      const result = getPersonLanguageElement(personLanguage);

      expect(result["@id"]).toBe("#language_en");
      expect(result["@type"]).toBe("Language");
      expect((result as any).name).toBe("English");
    });

    it("should handle missing language template", () => {
      vi.spyOn(
        fieldDefinitionsOfCurrentConfig,
        "common",
        "get"
      ).mockReturnValue([]);

      const personLanguage: IPersonLanguage = {
        code: "en",
        primary: true
      };

      const result = getPersonLanguageElement(personLanguage);

      expect(result).toEqual({});
    });

    it("should replace placeholders correctly", () => {
      const personLanguage: IPersonLanguage = {
        code: "fr",
        primary: false
      };

      const result = getPersonLanguageElement(personLanguage);

      expect(result["@id"]).toBe("#language_fr");
      expect((result as any).name).toBe("French");
    });
  });

  describe("LDAC Profile Compliance", () => {
    let mockPersonWithNonLdacFields: Person;
    let mockSessionWith2010Date: Session;

    beforeEach(() => {
      // Mock session with 2010 date
      mockSessionWith2010Date = {
        getAllContributionsToAllFiles: vi.fn().mockReturnValue([
          {
            personReference: "Awi Heole",
            role: "speaker"
          }
        ]),
        properties: {
          getDateField: vi.fn().mockReturnValue({
            asDate: () => new Date("2010-06-06")
          }),
          getHasValue: vi.fn().mockReturnValue(true)
        }
      } as any;

      // Mock person with non-LDAC fields that need conversion
      mockPersonWithNonLdacFields = {
        filePrefix: "awi-heole",
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            const properties = {
              name: "Awi Heole",
              education: "Grade 2",
              birthYear: "1972",
              gender: "Male",
              primaryOccupation: "Subsistence Farmer",
              description: "Edolo learned in Huya.",
              Current_Village: "Huya"
            };
            return properties[key] || "";
          }),
          properties: {
            forEach: vi.fn().mockImplementation((callback) => {
              // Mock custom field
              callback("Current_Village", {
                text: "Huya",
                definition: { isCustom: true }
              });
            }),
            getHasValue: vi.fn().mockReturnValue(true)
          },
          languages: []
        },
        knownFields: [
          { key: "name", englishLabel: "Full Name" },
          { key: "primaryOccupation", englishLabel: "Primary Occupation" },
          { key: "education", englishLabel: "Education" },
          { key: "birthYear", englishLabel: "Birth Year" },
          { key: "gender", englishLabel: "Gender" },
          { key: "description", englishLabel: "Description" }
        ],
        files: [],
        ageOn: vi.fn().mockReturnValue("38")
      } as any;

      // Update mock project to return the new person
      mockProject.findPerson = vi.fn().mockImplementation((name: string) => {
        if (name === "Awi Heole") return mockPersonWithNonLdacFields;
        return undefined;
      });
    });

    it("should convert birthYear to ldac:age based on session date", async () => {
      const result = await makeEntriesFromParticipant(
        mockProject,
        mockSessionWith2010Date
      );

      const personEntry = result.find(
        (entry: any) => entry["@id"] === "People/awi-heole/"
      );

      expect(personEntry).toBeDefined();
      expect(personEntry!["ldac:age"]).toBe("38");
      expect(personEntry!["birthYear"]).toBeUndefined();
    });

    it("should consolidate non-profile fields into description", async () => {
      const result = await makeEntriesFromParticipant(
        mockProject,
        mockSessionWith2010Date
      );

      const personEntry = result.find(
        (entry: any) => entry["@id"] === "People/awi-heole/"
      );

      expect(personEntry).toBeDefined();

      const description = personEntry!["description"];
      expect(description).toContain("Edolo learned in Huya.");
      expect(description).toContain("Primary Occupation: Subsistence Farmer.");
      expect(description).toContain("Education: Grade 2.");
      expect(description).toContain("Current Village: Huya.");

      // These should no longer be separate fields
      expect(personEntry!["education"]).toBeUndefined();
      expect(personEntry!["primaryOccupation"]).toBeUndefined();
      expect(personEntry!["Current_Village"]).toBeUndefined();
    });

    it("should preserve LDAC-compliant fields", async () => {
      const result = await makeEntriesFromParticipant(
        mockProject,
        mockSessionWith2010Date
      );

      const personEntry = result.find(
        (entry: any) => entry["@id"] === "People/awi-heole/"
      );

      expect(personEntry).toBeDefined();
      expect(personEntry!["@type"]).toBe("Person");
      expect(personEntry!["name"]).toBe("Awi Heole");
      expect(personEntry!["gender"]).toBe("Male");
    });

    it("should handle person without session date gracefully", async () => {
      const sessionWithoutDate = {
        ...mockSessionWith2010Date,
        properties: {
          getDateField: vi.fn().mockReturnValue({
            asDate: () => undefined
          }),
          getHasValue: vi.fn().mockReturnValue(false)
        }
      } as any;

      const result = await makeEntriesFromParticipant(
        mockProject,
        sessionWithoutDate
      );

      const personEntry = result.find(
        (entry: any) => entry["@id"] === "People/awi-heole/"
      );

      expect(personEntry).toBeDefined();
      expect(personEntry!["ldac:age"]).toBeUndefined();
      expect(personEntry!["birthYear"]).toBeUndefined();
    });

    it("should handle person without birthYear gracefully", async () => {
      (mockPersonWithNonLdacFields.metadataFile as any).getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          const properties = {
            name: "Awi Heole",
            gender: "Male",
            description: "Edolo learned in Huya."
          };
          return properties[key] || "";
        });
      mockPersonWithNonLdacFields.ageOn = vi.fn().mockReturnValue("");

      const result = await makeEntriesFromParticipant(
        mockProject,
        mockSessionWith2010Date
      );

      const personEntry = result.find(
        (entry: any) => entry["@id"] === "People/awi-heole/"
      );

      expect(personEntry).toBeDefined();
      expect(personEntry!["ldac:age"]).toBeUndefined();
    });

    it("should handle empty or missing description field", async () => {
      (mockPersonWithNonLdacFields.metadataFile as any).getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          const properties = {
            name: "Awi Heole",
            education: "Grade 2",
            gender: "Male",
            primaryOccupation: "Subsistence Farmer"
          };
          return properties[key] || "";
        });

      // Override the forEach to not include custom fields for this test
      (mockPersonWithNonLdacFields.metadataFile as any).properties.forEach =
        vi.fn();

      const result = await makeEntriesFromParticipant(
        mockProject,
        mockSessionWith2010Date
      );

      const personEntry = result.find(
        (entry: any) => entry["@id"] === "People/awi-heole/"
      );

      expect(personEntry).toBeDefined();

      const description = personEntry!["description"];
      expect(description).toBe(
        "Primary Occupation: Subsistence Farmer. Education: Grade 2."
      );
    });
  });
});
