import { vi, describe, it, beforeEach, expect } from "vitest";
import {
  createSessionEntry,
  addParticipantProperties,
  getRoles
} from "./RoCrateSessions";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../model/field/ConfiguredFieldDefinitions";

describe("RoCrateSessions", () => {
  let mockProject: Project;
  let mockSession: Session;

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

    // Mock project
    mockProject = {
      metadataFile: {
        getTextProperty: vi.fn().mockReturnValue("Test Project")
      },
      authorityLists: {
        accessChoicesOfCurrentProtocol: []
      },
      findPerson: vi.fn()
    } as any;

    // Mock session
    mockSession = {
      filePrefix: "test-session",
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "description") return "Test Description";
          if (key === "date") return "2023-01-01";
          if (key === "location") return "Test Location";
          if (key === "access") return "public";
          return undefined;
        }),
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
    } as any;
  });

  describe("createSessionEntry", () => {
    it("should create session entry for standalone session", async () => {
      const result = await createSessionEntry(mockProject, mockSession, true);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const sessionEntry = result[0] as any;
      expect(sessionEntry["@id"]).toBe("./");
      expect(sessionEntry["@type"]).toEqual([
        "Dataset",
        "Object",
        "RepositoryObject"
      ]);
      expect(sessionEntry.name).toBe("Test Session");
    });

    it("should create session entry for project session", async () => {
      const result = await createSessionEntry(mockProject, mockSession, false);

      expect(result).toBeInstanceOf(Array);
      const sessionEntry = result[0] as any;
      expect(sessionEntry["@id"]).toBe("Sessions/test-session/");
      expect(sessionEntry["@type"]).toEqual([
        "Event",
        "Object",
        "RepositoryObject"
      ]);
      expect(sessionEntry.startDate).toBe("2023-01-01");
      expect(sessionEntry.location).toEqual({ "@id": "#Test Location" });
    });
  });

  describe("addParticipantProperties", () => {
    it("should add LDAC role properties", () => {
      const sessionEntry = {};
      addParticipantProperties(sessionEntry, mockSession, mockProject);

      expect(sessionEntry["ldac:speaker"]).toEqual({ "@id": "John Doe" });
      expect(sessionEntry["ldac:interviewer"]).toEqual({ "@id": "Jane Smith" });
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
  });

  describe("getRoles", () => {
    it("should return unique roles from session contributions", () => {
      const roles = getRoles(mockSession);

      expect(roles).toHaveLength(2);
      expect(roles).toContainEqual({
        "@id": "role_speaker",
        "@type": "Role",
        name: "speaker"
      });
      expect(roles).toContainEqual({
        "@id": "role_interviewer",
        "@type": "Role",
        name: "interviewer"
      });
    });
  });
});
