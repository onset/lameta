/**
 * LAM-103: Fix Session CollectionEvent hasPart relationship
 *
 * Per the issue, the Session CollectionEvent entity (e.g., #session-ETR008) should NOT
 * have a hasPart relationship to files. Instead:
 * - The session directory Dataset (Sessions/ETR008/) contains files via hasPart
 * - The CollectionEvent and Dataset are linked via subjectOf/about bidirectionally
 *
 * The current structure incorrectly has:
 *   #session-ETR008  ---hasPart--->  file entities
 *
 * The correct structure should be:
 *   #session-ETR008  ---subjectOf--->  Sessions/ETR008/
 *   #session-ETR008  <---about---      Sessions/ETR008/
 *   Sessions/ETR008/ ---hasPart--->    file entities
 *
 * See: https://linear.app/lameta/issue/LAM-103/fix-relation
 */

import { vi, describe, it, beforeEach, expect, afterEach } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Session } from "../../../model/Project/Session/Session";
import { Project } from "../../../model/Project/Project";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

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

describe("LAM-103: Session CollectionEvent should not have hasPart", () => {
  let mockProject: Project;
  let mockSession: Session;

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

    // Create mock files with all needed methods
    const createMockFile = (name: string) => ({
      getActualFilePath: () => `/project/Sessions/${name}`,
      getModifiedDate: () => new Date("2023-06-01T00:00:00Z"),
      getTextProperty: vi.fn().mockReturnValue("")
    });

    // Mock session with multiple files
    mockSession = {
      filePrefix: "ETR008",
      directory: "/project/Sessions/ETR008",
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "ETR008 Session";
          if (key === "description") return "Test session with files";
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
        createMockFile("ETR008/ETR008.session"),
        createMockFile("ETR008/ETR008_Audio.wav"),
        createMockFile("ETR008/ETR008_Video.mp4")
      ],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as unknown as Session;

    mockProject = {
      filePrefix: "TestProject",
      directory: "/project",
      sessions: {
        items: [mockSession]
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
    Object.setPrototypeOf(mockSession, Session.prototype);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * LAM-103: The session CollectionEvent (#session-ETR008) should NOT have hasPart.
   * Files belong to the session directory Dataset, not the CollectionEvent.
   */
  it("session CollectionEvent should NOT have hasPart property", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const sessionEvent = graph.find(
      (item: any) => item["@id"] === "#session-ETR008"
    );

    expect(sessionEvent).toBeDefined();

    // LAM-103: The CollectionEvent should NOT have hasPart
    // https://linear.app/lameta/issue/LAM-103/fix-relation
    expect(sessionEvent.hasPart).toBeUndefined();
  });

  /**
   * LAM-103: The session directory Dataset (Sessions/ETR008/) should contain the files.
   */
  it("session directory Dataset should have hasPart with files", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const sessionDir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR008/"
    );

    expect(sessionDir).toBeDefined();
    expect(sessionDir.hasPart).toBeDefined();
    expect(Array.isArray(sessionDir.hasPart)).toBe(true);
    expect(sessionDir.hasPart.length).toBe(3); // .session, .wav, .mp4

    const hasPartIds = sessionDir.hasPart.map((p: any) => p["@id"]);
    expect(hasPartIds).toContain("Sessions/ETR008/ETR008.session");
    expect(hasPartIds).toContain("Sessions/ETR008/ETR008_Audio.wav");
    expect(hasPartIds).toContain("Sessions/ETR008/ETR008_Video.mp4");
  });

  /**
   * LAM-103: Bidirectional subjectOf/about links should still exist.
   */
  it("should maintain bidirectional subjectOf/about links", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const sessionEvent = graph.find(
      (item: any) => item["@id"] === "#session-ETR008"
    );
    const sessionDir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR008/"
    );

    // CollectionEvent should have subjectOf pointing to Dataset
    expect(sessionEvent.subjectOf).toEqual({ "@id": "Sessions/ETR008/" });

    // Dataset should have about pointing to CollectionEvent
    expect(sessionDir.about).toEqual({ "@id": "#session-ETR008" });
  });

  /**
   * LAM-103: Files' isPartOf should point to session directory Dataset, not CollectionEvent.
   */
  it("files should have isPartOf pointing to session directory Dataset", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    // Find all session files
    const sessionFiles = graph.filter(
      (item: any) =>
        item["@id"]?.startsWith("Sessions/ETR008/") &&
        !item["@id"]?.endsWith("/")
    );

    expect(sessionFiles.length).toBe(3);

    sessionFiles.forEach((file: any) => {
      // isPartOf should point to the session directory Dataset, not the CollectionEvent
      expect(file.isPartOf).toEqual({ "@id": "Sessions/ETR008/" });
    });
  });

  /**
   * LAM-103: Root dataset's pcdm:hasMember should still reference session CollectionEvents.
   */
  it("root dataset should still have pcdm:hasMember pointing to session CollectionEvents", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const rootDataset = graph.find((item: any) => item["@id"] === "./");

    expect(rootDataset).toBeDefined();
    expect(rootDataset["pcdm:hasMember"]).toContainEqual({
      "@id": "#session-ETR008"
    });
  });

  /**
   * LAM-103: Root dataset's hasPart should point to Sessions/ Dataset, not to session CollectionEvents.
   */
  it("root dataset hasPart should contain Sessions/ Dataset, not CollectionEvents", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const rootDataset = graph.find((item: any) => item["@id"] === "./");

    expect(rootDataset).toBeDefined();

    // hasPart should include Sessions/ directory Dataset
    expect(rootDataset.hasPart).toContainEqual({ "@id": "Sessions/" });

    // hasPart should NOT include the session CollectionEvent directly
    const hasSessionEvent = rootDataset.hasPart.some(
      (p: any) => p["@id"] === "#session-ETR008"
    );
    expect(hasSessionEvent).toBe(false);
  });
});
