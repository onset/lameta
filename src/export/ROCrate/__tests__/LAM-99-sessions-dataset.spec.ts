import { vi, describe, it, beforeEach, expect, afterEach } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Session } from "../../../model/Project/Session/Session";
import { Project } from "../../../model/Project/Project";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

/**
 * LAM-99: Add Sessions/ Dataset to link session files via hasPart from root
 *
 * The RO-Crate 1.2 specification (line 1032) requires that Data Entities
 * (files and folders) MUST be linked from the Root Data Entity via hasPart,
 * either directly or indirectly through nested Datasets.
 *
 * Previously, sessions were linked via pcdm:hasMember (correct for LDAC) but
 * session files like Sessions/ETR009/ETR009.session were not reachable from
 * the root via hasPart.
 *
 * The fix is to create a Sessions/ Dataset entity that:
 * 1. Is included in root's hasPart
 * 2. Contains hasPart references to individual session directories
 * 3. Each session directory Dataset then has hasPart for its files
 *
 * See: https://linear.app/lameta/issue/LAM-99/add-sessions-dataset
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

describe("LAM-99: Sessions Dataset", () => {
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

  it("should create a Sessions/ Dataset entity in the graph", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const sessionsDataset = graph.find(
      (item: any) => item["@id"] === "Sessions/"
    );

    expect(sessionsDataset).toBeDefined();
    expect(sessionsDataset["@type"]).toContain("Dataset");
    expect(sessionsDataset.name).toBeDefined();
  });

  it("should link Sessions/ Dataset from root entity via hasPart", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const rootEntity = graph.find((item: any) => item["@id"] === "./");

    expect(rootEntity).toBeDefined();
    expect(rootEntity.hasPart).toContainEqual({ "@id": "Sessions/" });
  });

  it("should link individual session directories from Sessions/ via hasPart", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const sessionsDataset = graph.find(
      (item: any) => item["@id"] === "Sessions/"
    );

    expect(sessionsDataset).toBeDefined();
    expect(sessionsDataset.hasPart).toBeDefined();
    expect(sessionsDataset.hasPart).toContainEqual({
      "@id": "Sessions/ETR008/"
    });
    expect(sessionsDataset.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/"
    });
  });

  it("should create session directory Dataset entities for each session", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const session1Dir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR008/"
    );
    const session2Dir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR009/"
    );

    expect(session1Dir).toBeDefined();
    expect(session1Dir["@type"]).toContain("Dataset");

    expect(session2Dir).toBeDefined();
    expect(session2Dir["@type"]).toContain("Dataset");
  });

  it("should have session directory Dataset with hasPart pointing to session files", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const session2Dir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR009/"
    );

    expect(session2Dir).toBeDefined();
    expect(session2Dir.hasPart).toBeDefined();

    // Should contain the session files
    const hasPartIds = session2Dir.hasPart.map((p: any) => p["@id"]);
    expect(hasPartIds).toContain("Sessions/ETR009/ETR009.session");
  });

  it("should have session directory Dataset with isPartOf pointing to Sessions/", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const session1Dir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR008/"
    );
    const session2Dir = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR009/"
    );

    expect(session1Dir.isPartOf).toEqual({ "@id": "Sessions/" });
    expect(session2Dir.isPartOf).toEqual({ "@id": "Sessions/" });
  });

  it("should have Sessions/ Dataset with isPartOf pointing to root", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const sessionsDataset = graph.find(
      (item: any) => item["@id"] === "Sessions/"
    );

    expect(sessionsDataset.isPartOf).toEqual({ "@id": "./" });
  });

  it("should have session files with isPartOf pointing to their session directory", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const sessionFile = graph.find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009.session"
    );

    expect(sessionFile).toBeDefined();
    expect(sessionFile.isPartOf).toEqual({ "@id": "Sessions/ETR009/" });
  });

  it("should still have pcdm:hasMember for session entities on the root", async () => {
    // Verify that the LDAC-compliant pcdm:hasMember is still present
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const rootEntity = graph.find((item: any) => item["@id"] === "./");

    expect(rootEntity["pcdm:hasMember"]).toBeDefined();
    expect(rootEntity["pcdm:hasMember"]).toContainEqual({
      "@id": "#session-ETR008"
    });
    expect(rootEntity["pcdm:hasMember"]).toContainEqual({
      "@id": "#session-ETR009"
    });
  });

  it("should make all session files reachable from root via hasPart chain", async () => {
    // The key validation - all data entities should be reachable from root
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    // Build entity index
    const entityIndex = new Map<string, any>();
    graph.forEach((entity: any) => {
      if (entity["@id"]) {
        entityIndex.set(entity["@id"], entity);
      }
    });

    // Collect all entities reachable from root via hasPart
    const reachableFromRoot = new Set<string>();
    const collectHasPart = (entity: any, visited: Set<string> = new Set()) => {
      const id = entity["@id"];
      if (!id || visited.has(id)) return;
      visited.add(id);

      const hasPart = entity.hasPart;
      if (!hasPart) return;

      const parts = Array.isArray(hasPart) ? hasPart : [hasPart];
      parts.forEach((part: any) => {
        const partId = typeof part === "object" ? part["@id"] : part;
        if (partId) {
          reachableFromRoot.add(partId);
          const partEntity = entityIndex.get(partId);
          if (partEntity) {
            collectHasPart(partEntity, visited);
          }
        }
      });
    };

    const rootEntity = entityIndex.get("./");
    collectHasPart(rootEntity);

    // Verify session files are reachable
    expect(reachableFromRoot.has("Sessions/")).toBe(true);
    expect(reachableFromRoot.has("Sessions/ETR008/")).toBe(true);
    expect(reachableFromRoot.has("Sessions/ETR009/")).toBe(true);
    expect(reachableFromRoot.has("Sessions/ETR008/ETR008.session")).toBe(true);
    expect(reachableFromRoot.has("Sessions/ETR009/ETR009.session")).toBe(true);
    expect(reachableFromRoot.has("Sessions/ETR009/ETR009_Audio.mp3")).toBe(
      true
    );
  });
});
