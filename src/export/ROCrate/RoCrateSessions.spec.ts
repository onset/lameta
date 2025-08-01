import { vi, describe, it, beforeEach, expect } from "vitest";

// Mock the staticLanguageFinder dependency BEFORE importing modules that use it
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => `Language ${code}`)
  }
}));

import {
  createSessionEntry,
  addParticipantProperties
} from "./RoCrateSessions";
import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import { FieldDefinition } from "../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";
import { RoCrateLanguages } from "./RoCrateLanguages";
import { RoCrateLicense } from "./RoCrateLicense";

describe("RoCrateSessions", () => {
  let mockProject: Project;
  let mockSession: Session;
  let mockRoCrateLanguages: RoCrateLanguages;
  let mockRoCrateLicense: RoCrateLicense;

  beforeEach(() => {
    // Create manager instances
    mockRoCrateLanguages = new RoCrateLanguages();
    mockRoCrateLicense = new RoCrateLicense();

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

    // Mock project
    mockProject = {
      metadataFile: {
        getTextProperty: vi.fn().mockReturnValue("Test Project")
      },
      authorityLists: {
        accessChoicesOfCurrentProtocol: []
      },
      findPerson: vi.fn()
    } as unknown as Project;

    // Mock session
    const sessionProperties = {
      title: "Test Session",
      description: "Test Description",
      date: "2023-01-01",
      location: "Test Location",
      access: "public",
      languages: ""
    };
    mockSession = {
      filePrefix: "test-session",
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation(
          (key: string, defaultValue: string = "") =>
            sessionProperties[key as keyof typeof sessionProperties] ??
            defaultValue
        ),
        properties: {
          forEach: vi.fn()
        }
      },
      knownFields: [],
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
      files: []
    } as unknown as Session;
  });

  describe("createSessionEntry", () => {
    it("should create session entry for standalone session", async () => {
      const result = await createSessionEntry(
        mockProject,
        mockSession,
        true,
        mockRoCrateLanguages,
        mockRoCrateLicense
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const sessionEntry = result[0] as any;
      expect(sessionEntry["@id"]).toBe("./");
      expect(sessionEntry["@type"]).toEqual([
        "Dataset",
        "pcdm:RepositoryObject",
        "Event"
      ]);
      expect(sessionEntry.name).toBe("Test Session");
      expect(sessionEntry["pcdm:memberOf"]).toBeUndefined();
    });

    it("should create session entry for project session", async () => {
      const result = await createSessionEntry(
        mockProject,
        mockSession,
        false,
        mockRoCrateLanguages,
        mockRoCrateLicense
      );

      expect(result).toBeInstanceOf(Array);
      const sessionEntry = result[0] as any;
      expect(sessionEntry["@id"]).toBe("Sessions/test-session/");
      expect(sessionEntry["@type"]).toEqual([
        "Dataset",
        "pcdm:RepositoryObject",
        "Event"
      ]);
      expect(sessionEntry.startDate).toBe("2023-01-01");
      expect(sessionEntry.location).toEqual({ "@id": "#Test Location" });
    });

    it("should add pcdm:memberOf property for project sessions", async () => {
      const result = await createSessionEntry(
        mockProject,
        mockSession,
        false,
        mockRoCrateLanguages,
        mockRoCrateLicense
      );

      const sessionEntry = result[0] as any;
      expect(sessionEntry["pcdm:memberOf"]).toEqual({ "@id": "./" });
    });

    it("should not add pcdm:memberOf property for standalone sessions", async () => {
      const result = await createSessionEntry(
        mockProject,
        mockSession,
        true,
        mockRoCrateLanguages,
        mockRoCrateLicense
      );

      const sessionEntry = result[0] as any;
      expect(sessionEntry["pcdm:memberOf"]).toBeUndefined();
    });
  });

  describe("addParticipantProperties", () => {
    it("should add LDAC role properties", () => {
      const sessionEntry = {};
      addParticipantProperties(sessionEntry, mockSession, mockProject);

      expect(sessionEntry["ldac:speaker"]).toEqual([{ "@id": "John Doe" }]);
      expect(sessionEntry["ldac:interviewer"]).toEqual([
        { "@id": "Jane Smith" }
      ]);
    });

    it("should handle multiple people with same role", () => {
      mockSession.getAllContributionsToAllFiles = vi.fn().mockReturnValue([
        { personReference: "John Doe", role: "speaker" },
        { personReference: "Jane Smith", role: "speaker" }
      ]);

      const sessionEntry = {};
      addParticipantProperties(sessionEntry, mockSession, mockProject);

      expect(sessionEntry["ldac:speaker"]).toEqual([
        { "@id": "John Doe" },
        { "@id": "Jane Smith" }
      ]);
    });

    it("should handle mixed roles with multiple speakers and single recorder", () => {
      mockSession.getAllContributionsToAllFiles = vi.fn().mockReturnValue([
        { personReference: "John Doe", role: "speaker" },
        { personReference: "Jane Smith", role: "speaker" },
        { personReference: "Bob Wilson", role: "recorder" }
      ]);

      const sessionEntry = {};
      addParticipantProperties(sessionEntry, mockSession, mockProject);

      // Both single and multiple role values should be arrays
      expect(sessionEntry["ldac:speaker"]).toEqual([
        { "@id": "John Doe" },
        { "@id": "Jane Smith" }
      ]);
      expect(sessionEntry["ldac:recorder"]).toEqual([{ "@id": "Bob Wilson" }]);
    });

    it("should avoid duplicate person IDs in the same role", () => {
      mockSession.getAllContributionsToAllFiles = vi.fn().mockReturnValue([
        { personReference: "John Doe", role: "speaker" },
        { personReference: "John Doe", role: "speaker" }, // duplicate
        { personReference: "Jane Smith", role: "speaker" }
      ]);

      const sessionEntry = {};
      addParticipantProperties(sessionEntry, mockSession, mockProject);

      expect(sessionEntry["ldac:speaker"]).toEqual([
        { "@id": "John Doe" },
        { "@id": "Jane Smith" }
      ]);
      expect(sessionEntry["ldac:speaker"]).toHaveLength(2); // Only unique entries
    });
  });
});
