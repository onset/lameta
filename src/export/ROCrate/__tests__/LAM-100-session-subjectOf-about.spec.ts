import { vi, describe, it, beforeEach, expect, afterEach } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Session } from "../../../model/Project/Session/Session";
import { Project } from "../../../model/Project/Project";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

/**
 * LAM-100: Connect CollectionEvent to Dataset via subjectOf/about relationships
 *
 * The session structure requires:
 * 1. Sessions/ETR009/ Dataset should have `about: { "@id": "#session-ETR009" }`
 * 2. #session-ETR009 CollectionEvent should have `subjectOf: { "@id": "Sessions/ETR009/" }`
 *
 * This creates bidirectional links between:
 * - The session metadata entity (CollectionEvent) that describes the event
 * - The session data container (Dataset) that holds the files
 *
 * See: https://linear.app/lameta/issue/LAM-100/new-session-structure
 */

// Mock fs-extra before importing modules
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date("2023-01-01T00:00:00Z")
  })
}));

vi.mock("../../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => `Language ${code}`)
  }
}));

describe("LAM-100: Session Dataset/CollectionEvent subjectOf/about relationships", () => {
  let mockProject: Project;
  let mockSession1: Session;
  let mockSession2: Session;

  beforeEach(() => {
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      []
    );
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "project", "get").mockReturnValue(
      []
    );
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "common", "get").mockReturnValue(
      []
    );

    // Create mock file with all needed methods
    const createMockFile = (name: string) => ({
      getActualFilePath: () => `/project/Sessions/${name}`,
      getModifiedDate: () => new Date("2023-06-01T00:00:00Z"),
      getTextProperty: vi.fn().mockReturnValue("")
    });

    // Mock sessions
    mockSession1 = {
      filePrefix: "ETR008",
      directory: "/project/Sessions/ETR008",
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "ETR008 Session";
          if (key === "description") return "First session";
          if (key === "access") return "public";
          return "";
        }),
        properties: {
          forEach: vi.fn(),
          getHasValue: vi.fn().mockReturnValue(false),
          getTextStringOrEmpty: vi.fn().mockReturnValue("")
        }
      },
      knownFields: [],
      files: [createMockFile("ETR008/ETR008.session")],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as unknown as Session;

    mockSession2 = {
      filePrefix: "ETR009",
      directory: "/project/Sessions/ETR009",
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "ETR009 Session";
          if (key === "description") return "Second session";
          if (key === "access") return "public";
          return "";
        }),
        properties: {
          forEach: vi.fn(),
          getHasValue: vi.fn().mockReturnValue(false),
          getTextStringOrEmpty: vi.fn().mockReturnValue("")
        }
      },
      knownFields: [],
      files: [
        createMockFile("ETR009/ETR009.session"),
        createMockFile("ETR009/ETR009_Audio.mp3")
      ],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as unknown as Session;

    mockProject = {
      filePrefix: "TestProject",
      directory: "/project",
      sessions: {
        items: [mockSession1, mockSession2]
      },
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Project";
          if (key === "collectionDescription")
            return "Test project description";
          if (key === "archiveConfigurationName") return "TestArchive";
          return "";
        }),
        properties: {
          forEach: vi.fn(),
          getHasValue: vi.fn().mockReturnValue(false)
        }
      },
      knownFields: [],
      files: [],
      findPerson: vi.fn(),
      authorityLists: {
        accessChoicesOfCurrentProtocol: [
          {
            id: "public",
            label: "public",
            description: "Public access",
            ldacAccessCategory: "ldac:OpenAccess"
          }
        ]
      },
      descriptionFolder: { files: [] },
      otherDocsFolder: { files: [] }
    } as unknown as Project;

    // Set up correct prototypes for instanceof checks
    Object.setPrototypeOf(mockProject, Project.prototype);
    Object.setPrototypeOf(mockSession1, Session.prototype);
    Object.setPrototypeOf(mockSession2, Session.prototype);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * LAM-100 requirement: Session directory Dataset should have `about` pointing
   * to its corresponding CollectionEvent entity.
   */
  it("should have session directory Dataset with `about` pointing to CollectionEvent", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const session1Dir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR008/"
    );
    const session2Dir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR009/"
    );

    expect(session1Dir).toBeDefined();
    expect(session1Dir.about).toEqual({ "@id": "#session-ETR008" });

    expect(session2Dir).toBeDefined();
    expect(session2Dir.about).toEqual({ "@id": "#session-ETR009" });
  });

  /**
   * LAM-100 requirement: CollectionEvent entity should have `subjectOf` pointing
   * to its corresponding session directory Dataset.
   */
  it("should have CollectionEvent with `subjectOf` pointing to session directory Dataset", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const session1Event = graph.find(
      (item: any) => item["@id"] === "#session-ETR008"
    );
    const session2Event = graph.find(
      (item: any) => item["@id"] === "#session-ETR009"
    );

    expect(session1Event).toBeDefined();
    expect(session1Event.subjectOf).toEqual({ "@id": "Sessions/ETR008/" });

    expect(session2Event).toBeDefined();
    expect(session2Event.subjectOf).toEqual({ "@id": "Sessions/ETR009/" });
  });

  /**
   * Verify bidirectional relationship: Dataset.about <-> CollectionEvent.subjectOf
   */
  it("should have bidirectional about/subjectOf relationships for all sessions", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    // Build index for easy lookup
    const entityIndex = new Map<string, any>();
    graph.forEach((entity: any) => {
      if (entity["@id"]) {
        entityIndex.set(entity["@id"], entity);
      }
    });

    // For each session, verify bidirectional links
    ["ETR008", "ETR009"].forEach((sessionId) => {
      const datasetId = `Sessions/${sessionId}/`;
      const eventId = `#session-${sessionId}`;

      const dataset = entityIndex.get(datasetId);
      const event = entityIndex.get(eventId);

      expect(dataset).toBeDefined();
      expect(event).toBeDefined();

      // Dataset.about -> CollectionEvent
      expect(dataset.about).toEqual({ "@id": eventId });

      // CollectionEvent.subjectOf -> Dataset
      expect(event.subjectOf).toEqual({ "@id": datasetId });
    });
  });

  /**
   * Ensure existing LAM-99 structure is preserved alongside new relationships
   */
  it("should still maintain LAM-99 hasPart/isPartOf structure", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const rootEntity = graph.find((item: any) => item["@id"] === "./");
    const sessionsDataset = graph.find(
      (item: any) => item["@id"] === "Sessions/"
    );
    const session1Dir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR008/"
    );

    // Root -> Sessions/ via hasPart
    expect(rootEntity.hasPart).toContainEqual({ "@id": "Sessions/" });

    // Sessions/ -> Sessions/ETR008/ via hasPart
    expect(sessionsDataset.hasPart).toContainEqual({
      "@id": "Sessions/ETR008/"
    });

    // Sessions/ETR008/ -> Sessions/ via isPartOf
    expect(session1Dir.isPartOf).toEqual({ "@id": "Sessions/" });
  });

  /**
   * Verify that session files are still linked correctly
   */
  it("should still have session files linked via hasPart from session directory", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const session2Dir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR009/"
    );

    expect(session2Dir).toBeDefined();
    expect(session2Dir.hasPart).toBeDefined();

    const hasPartIds = session2Dir.hasPart.map((p: any) => p["@id"]);
    expect(hasPartIds).toContain("Sessions/ETR009/ETR009.session");
  });
});
