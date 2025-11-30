import { vi, describe, it, beforeEach, expect, afterEach } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

/**
 * LAM-101: Add OtherDocuments/ Dataset
 *
 * The RO-Crate 1.2 specification requires that Data Entities (files and folders)
 * be linked from the Root Data Entity via hasPart, either directly or indirectly
 * through nested Datasets.
 *
 * Previously, OtherDocuments files were added directly to the root's hasPart list.
 * Following the pattern established by LAM-99 (Sessions/) and LAM-98 (People/),
 * we now create an OtherDocuments/ Dataset entity that:
 * 1. Is included in root's hasPart
 * 2. Contains hasPart references to all files in the OtherDocuments folder
 * 3. Has isPartOf pointing to root
 *
 * See: https://linear.app/lameta/issue/LAM-101/add-otherdocuments-dataset
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

describe("LAM-101: OtherDocuments Dataset", () => {
  let mockProject: Project;

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

    // Create mock files for OtherDocuments folder
    const createMockFile = (name: string) => ({
      getActualFilePath: () => `/project/OtherDocuments/${name}`,
      getModifiedDate: () => new Date("2023-06-01T00:00:00Z"),
      getTextProperty: vi.fn().mockReturnValue("")
    });

    mockProject = {
      filePrefix: "TestProject",
      directory: "/project",
      sessions: {
        items: []
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
      otherDocsFolder: {
        files: [
          createMockFile("Letter_from_Jan.txt"),
          createMockFile("Project_Notes.docx"),
          createMockFile("Budget.pdf")
        ]
      }
    } as unknown as Project;

    // Set up correct prototype for instanceof check
    Object.setPrototypeOf(mockProject, Project.prototype);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create an OtherDocuments/ Dataset entity in the graph", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const otherDocsDataset = graph.find(
      (item: any) => item["@id"] === "OtherDocuments/"
    );

    expect(otherDocsDataset).toBeDefined();
    expect(otherDocsDataset["@type"]).toBe("Dataset");
    expect(otherDocsDataset.name).toBe("Other Documents");
    expect(otherDocsDataset.description).toBeDefined();
  });

  it("should link OtherDocuments/ Dataset from root entity via hasPart", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const rootEntity = graph.find((item: any) => item["@id"] === "./");

    expect(rootEntity).toBeDefined();
    expect(rootEntity.hasPart).toContainEqual({ "@id": "OtherDocuments/" });
  });

  it("should NOT have individual OtherDocuments files directly in root hasPart", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const rootEntity = graph.find((item: any) => item["@id"] === "./");

    // Individual files should NOT be in root's hasPart anymore
    const hasPartIds = rootEntity.hasPart.map((p: any) => p["@id"]);
    expect(hasPartIds).not.toContain("OtherDocuments/Letter_from_Jan.txt");
    expect(hasPartIds).not.toContain("OtherDocuments/Project_Notes.docx");
    expect(hasPartIds).not.toContain("OtherDocuments/Budget.pdf");
  });

  it("should have OtherDocuments/ Dataset with hasPart pointing to files", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const otherDocsDataset = graph.find(
      (item: any) => item["@id"] === "OtherDocuments/"
    );

    expect(otherDocsDataset).toBeDefined();
    expect(otherDocsDataset.hasPart).toBeDefined();

    const hasPartIds = otherDocsDataset.hasPart.map((p: any) => p["@id"]);
    expect(hasPartIds).toContain("OtherDocuments/Letter_from_Jan.txt");
    expect(hasPartIds).toContain("OtherDocuments/Project_Notes.docx");
    expect(hasPartIds).toContain("OtherDocuments/Budget.pdf");
  });

  it("should have OtherDocuments/ Dataset with isPartOf pointing to root", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const otherDocsDataset = graph.find(
      (item: any) => item["@id"] === "OtherDocuments/"
    );

    expect(otherDocsDataset.isPartOf).toEqual({ "@id": "./" });
  });

  it("should have OtherDocuments files with isPartOf pointing to OtherDocuments/", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const letterFile = graph.find(
      (item: any) => item["@id"] === "OtherDocuments/Letter_from_Jan.txt"
    );
    const notesFile = graph.find(
      (item: any) => item["@id"] === "OtherDocuments/Project_Notes.docx"
    );
    const budgetFile = graph.find(
      (item: any) => item["@id"] === "OtherDocuments/Budget.pdf"
    );

    expect(letterFile).toBeDefined();
    expect(letterFile.isPartOf).toEqual({ "@id": "OtherDocuments/" });

    expect(notesFile).toBeDefined();
    expect(notesFile.isPartOf).toEqual({ "@id": "OtherDocuments/" });

    expect(budgetFile).toBeDefined();
    expect(budgetFile.isPartOf).toEqual({ "@id": "OtherDocuments/" });
  });

  it("should have OtherDocuments/ Dataset with license inherited from collection", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const otherDocsDataset = graph.find(
      (item: any) => item["@id"] === "OtherDocuments/"
    );

    expect(otherDocsDataset.license).toBeDefined();
    expect(otherDocsDataset.license).toEqual({ "@id": "#collection-license" });
  });

  it("should make all OtherDocuments files reachable from root via hasPart chain", async () => {
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

    // Verify OtherDocuments/ and files are reachable
    expect(reachableFromRoot.has("OtherDocuments/")).toBe(true);
    expect(reachableFromRoot.has("OtherDocuments/Letter_from_Jan.txt")).toBe(
      true
    );
    expect(reachableFromRoot.has("OtherDocuments/Project_Notes.docx")).toBe(
      true
    );
    expect(reachableFromRoot.has("OtherDocuments/Budget.pdf")).toBe(true);
  });

  it("should NOT create OtherDocuments/ Dataset if folder is empty", async () => {
    // Create a project with empty otherDocsFolder
    const emptyProject = {
      ...mockProject,
      otherDocsFolder: { files: [] }
    } as unknown as Project;
    Object.setPrototypeOf(emptyProject, Project.prototype);

    const result = (await getRoCrate(emptyProject, emptyProject)) as any;
    const graph = result["@graph"];

    const otherDocsDataset = graph.find(
      (item: any) => item["@id"] === "OtherDocuments/"
    );

    expect(otherDocsDataset).toBeUndefined();

    // Root should not have OtherDocuments/ in hasPart
    const rootEntity = graph.find((item: any) => item["@id"] === "./");
    const hasOtherDocsRef = rootEntity.hasPart.some(
      (p: any) => p["@id"] === "OtherDocuments/"
    );
    expect(hasOtherDocsRef).toBe(false);
  });
});
