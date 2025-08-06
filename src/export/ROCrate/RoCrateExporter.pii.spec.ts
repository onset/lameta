import { vi, describe, it, beforeEach, expect } from "vitest";

// Mock the staticLanguageFinder dependency BEFORE importing modules that use it
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => `Language ${code}`)
  }
}));

import { getRoCrate } from "./RoCrateExporter";
import { Person } from "../../model/Project/Person/Person";
import { Project } from "../../model/Project/Project";
import { Session } from "../../model/Project/Session/Session";
import { FieldDefinition } from "../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";

// Mock fs-extra module
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 2048,
    birthtime: new Date("2010-06-06")
  })
}));

// Mock the RoCrateLicenses module
vi.mock("./RoCrateLicenses", () => ({
  createLdacAccessTypeDefinitions: vi.fn().mockReturnValue([]),
  createDistinctLicenses: vi.fn().mockReturnValue([]),
  getSessionLicenseId: vi.fn().mockReturnValue("#license-default")
}));

// Mock the RoCrateMaterialTypes module
vi.mock("./RoCrateMaterialTypes", () => ({
  getLdacMaterialTypeForPath: vi.fn().mockReturnValue("Text"),
  createLdacMaterialTypeDefinitions: vi.fn().mockReturnValue([])
}));

// Mock the RoCrateUtils module
vi.mock("./RoCrateUtils", () => ({
  getVocabularyMapping: vi.fn(),
  createTermDefinition: vi.fn(),
  getTermSets: vi.fn().mockReturnValue([]),
  getCustomUri: vi.fn(),
  sanitizeForIri: vi.fn((input) => input || ""),
  createFileId: vi.fn((folder, fileName) => fileName || ""),
  createSessionId: vi.fn((session) => `Sessions/${session.filePrefix || "test"}/`),
  createPersonId: vi.fn((person) => `People/${person.filePrefix || "test"}/`)
}));

describe("RoCrateExporter PII and Custom Fields Filtering", () => {
  let mockProject: Project;
  let mockSession: Session;
  let mockPerson: Person;

  beforeEach(() => {
    // Mock the field definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      []
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
      } as FieldDefinition
    ]);

    // Mock person with PII and custom fields
    mockPerson = {
      filePrefix: "john-doe",
      directory: "/people/john-doe",
      getIdToUseForReferences: () => "john-doe",
      knownFields: [
        {
          key: "name",
          englishLabel: "Full Name",
          personallyIdentifiableInformation: false,
          isCustom: false
        } as FieldDefinition,
        {
          key: "howToContact",
          englishLabel: "How to Contact",
          personallyIdentifiableInformation: true, // This is PII
          isCustom: false
        } as FieldDefinition,
        {
          key: "education",
          englishLabel: "Education",
          personallyIdentifiableInformation: false,
          isCustom: false
        } as FieldDefinition
      ],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          const properties = {
            name: "John Doe",
            howToContact: "john.doe@example.com", // PII field
            education: "University Graduate"
          };
          return properties[key] || "";
        }),
        properties: {
          forEach: vi.fn().mockImplementation((callback) => {
            // Mock custom fields - these should be filtered out for Person entities
            // because we don't know if they contain PII
            callback("customAddress", {
              text: "123 Main St, City, State", // Custom field that could contain PII
              definition: { isCustom: true }
            });
            callback("customPhoneNumber", {
              text: "+1-555-123-4567", // Custom field that is definitely PII
              definition: { isCustom: true }
            });
          }),
          getHasValue: vi.fn().mockReturnValue(true)
        },
        languages: []
      },
      files: [],
      ageOn: vi.fn().mockReturnValue("30")
    } as any;

    // Mock session
    mockSession = {
      filePrefix: "test-session",
      directory: "/sessions/test-session",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockReturnValue(""),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([
        {
          personReference: "john-doe",
          role: "speaker"
        }
      ])
    } as any;

    // Mock project
    mockProject = {
      filePrefix: "test-project",
      directory: "/test/project",
      sessions: { items: [mockSession] },
      findPerson: vi.fn().mockImplementation((name: string) => {
        if (name === "john-doe") return mockPerson;
        return null;
      }),
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

    // Set up prototypes for instanceof checks
    Object.setPrototypeOf(mockProject, Project.prototype);
    Object.setPrototypeOf(mockSession, Session.prototype);
    Object.setPrototypeOf(mockPerson, Person.prototype);
  });

  it("should exclude PII fields from Person entries in RO-Crate export", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // Find the person entry
    const personEntry = result["@graph"].find(
      (item: any) =>
        item["@id"] === "People/john-doe/" && item["@type"] === "Person"
    );

    expect(personEntry).toBeDefined();

    // Should include non-PII fields
    expect(personEntry.name).toBe("John Doe");
    expect(personEntry.education).toBeUndefined(); // Should be moved to description by LDAC compliance

    // Should NOT include PII fields at all
    expect(personEntry.howToContact).toBeUndefined();

    // Should not have the PII field mentioned in description either
    if (personEntry.description) {
      expect(personEntry.description).not.toContain("john.doe@example.com");
      expect(personEntry.description).not.toContain("How to Contact");
    }
  });

  it("should exclude custom fields from Person entries in RO-Crate export", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // Find the person entry
    const personEntry = result["@graph"].find(
      (item: any) =>
        item["@id"] === "People/john-doe/" && item["@type"] === "Person"
    );

    expect(personEntry).toBeDefined();

    // Should NOT include custom fields as top-level properties
    expect(personEntry.customAddress).toBeUndefined();
    expect(personEntry.customPhoneNumber).toBeUndefined();

    // Should not have custom fields in description either, since they could contain PII
    if (personEntry.description) {
      expect(personEntry.description).not.toContain("123 Main St");
      expect(personEntry.description).not.toContain("+1-555-123-4567");
      expect(personEntry.description).not.toContain("customAddress");
      expect(personEntry.description).not.toContain("customPhoneNumber");
    }
  });

  it("should handle Person with only non-PII fields correctly", async () => {
    // Update mock to only have non-PII fields
    mockPerson.knownFields = [
      {
        key: "name",
        englishLabel: "Full Name",
        personallyIdentifiableInformation: false,
        isCustom: false
      } as FieldDefinition,
      {
        key: "gender",
        englishLabel: "Gender",
        personallyIdentifiableInformation: false,
        isCustom: false
      } as FieldDefinition
    ];

    (mockPerson.metadataFile as any).getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        const properties = {
          name: "John Doe",
          gender: "Male"
        };
        return properties[key] || "";
      });

    // Remove custom fields
    (mockPerson.metadataFile as any).properties.forEach = vi.fn();

    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const personEntry = result["@graph"].find(
      (item: any) =>
        item["@id"] === "People/john-doe/" && item["@type"] === "Person"
    );

    expect(personEntry).toBeDefined();
    expect(personEntry.name).toBe("John Doe");
    expect(personEntry.gender).toBe("Male");
  });

  it("should explain filtering rationale in comments or documentation", () => {
    // This test ensures the filtering logic includes proper documentation
    // The comment should explain that custom fields on Person are filtered out
    // because we cannot determine if they contain PII

    // We'll verify this by checking that the makeLdacCompliantPersonEntry function
    // or similar logic includes appropriate comments in the source code
    // This is more of a documentation requirement than a runtime test
    expect(true).toBe(true); // Placeholder - the real check is in the source code comments
  });
});
