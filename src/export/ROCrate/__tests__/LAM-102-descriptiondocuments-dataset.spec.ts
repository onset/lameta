import { vi, describe, it, beforeEach, expect, afterEach } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

/**
 * LAM-102: Add DescriptionDocuments/ Dataset
 *
 * The RO-Crate 1.2 specification requires that Data Entities (files and folders)
 * be linked from the Root Data Entity via hasPart, either directly or indirectly
 * through nested Datasets.
 *
 * This follows the same pattern as LAM-101 (OtherDocuments/) and creates a
 * DescriptionDocuments/ Dataset entity that:
 * 1. Is included in root's hasPart
 * 2. Contains hasPart references to all files in the DescriptionDocuments folder
 * 3. Has isPartOf pointing to root
 *
 * The existing #descriptionDocuments CollectionProtocol remains for LDAC compliance,
 * but now its hasPart references point to the files inside DescriptionDocuments/.
 *
 * See: https://linear.app/lameta/issue/LAM-102/add-descriptiondocuments-dataset
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

describe("LAM-102: DescriptionDocuments Dataset", () => {
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

    // Create mock files for DescriptionDocuments folder
    const createMockFile = (name: string, accessValue = "") => ({
      getActualFilePath: () => `/project/DescriptionDocuments/${name}`,
      getModifiedDate: () => new Date("2023-06-01T00:00:00Z"),
      getTextProperty: vi.fn().mockImplementation((key: string) => {
        if (key === "access") {
          return accessValue;
        }
        return "";
      })
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
          },
          {
            id: "restricted",
            label: "restricted",
            description: "Restricted access",
            ldacAccessCategory: "ldac:AuthorizedAccess"
          }
        ]
      },
      descriptionFolder: {
        files: [
          createMockFile("README.md", "public"),
          createMockFile("Protocol.pdf", "restricted"),
          createMockFile("Guidelines.docx")
        ]
      },
      otherDocsFolder: { files: [] }
    } as unknown as Project;

    // Set up correct prototype for instanceof check
    Object.setPrototypeOf(mockProject, Project.prototype);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create a DescriptionDocuments/ Dataset entity in the graph", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const descDocsDataset = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/"
    );

    expect(descDocsDataset).toBeDefined();
    expect(descDocsDataset["@type"]).toBe("Dataset");
    expect(descDocsDataset.name).toBe("Description Documents");
    expect(descDocsDataset.description).toBeDefined();
  });

  it("should link DescriptionDocuments/ Dataset from root entity via pcdm:hasMember", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const rootEntity = graph.find((item: any) => item["@id"] === "./");

    expect(rootEntity).toBeDefined();
    expect(rootEntity["pcdm:hasMember"]).toContainEqual({
      "@id": "DescriptionDocuments/"
    });
  });

  it("should NOT have individual DescriptionDocuments files directly in root pcdm:hasMember", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const rootEntity = graph.find((item: any) => item["@id"] === "./");

    // Individual files should NOT be in root's pcdm:hasMember or hasPart
    const hasMemberIds =
      rootEntity["pcdm:hasMember"]?.map((p: any) => p["@id"]) || [];
    expect(hasMemberIds).not.toContain("DescriptionDocuments/README.md");
    expect(hasMemberIds).not.toContain("DescriptionDocuments/Protocol.pdf");
    expect(hasMemberIds).not.toContain("DescriptionDocuments/Guidelines.docx");
  });

  it("should have DescriptionDocuments/ Dataset with hasPart pointing to files", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const descDocsDataset = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/"
    );

    expect(descDocsDataset).toBeDefined();
    expect(descDocsDataset.hasPart).toBeDefined();

    const hasPartIds = descDocsDataset.hasPart.map((p: any) => p["@id"]);
    expect(hasPartIds).toContain("DescriptionDocuments/README.md");
    expect(hasPartIds).toContain("DescriptionDocuments/Protocol.pdf");
    expect(hasPartIds).toContain("DescriptionDocuments/Guidelines.docx");
  });

  it("should have DescriptionDocuments/ Dataset with pcdm:memberOf pointing to root", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const descDocsDataset = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/"
    );

    expect(descDocsDataset["pcdm:memberOf"]).toEqual({ "@id": "./" });
  });

  it("should have DescriptionDocuments files with isPartOf pointing to DescriptionDocuments/", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const readmeFile = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/README.md"
    );
    const protocolFile = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/Protocol.pdf"
    );
    const guidelinesFile = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/Guidelines.docx"
    );

    expect(readmeFile).toBeDefined();
    expect(readmeFile.isPartOf).toEqual({ "@id": "DescriptionDocuments/" });

    expect(protocolFile).toBeDefined();
    expect(protocolFile.isPartOf).toEqual({ "@id": "DescriptionDocuments/" });

    expect(guidelinesFile).toBeDefined();
    expect(guidelinesFile.isPartOf).toEqual({ "@id": "DescriptionDocuments/" });
  });

  it("should have DescriptionDocuments/ Dataset with license inherited from collection", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const descDocsDataset = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/"
    );

    expect(descDocsDataset.license).toBeDefined();
    expect(descDocsDataset.license).toEqual({ "@id": "#collection-license" });
  });

  it("should assign document access licenses to DescriptionDocuments files", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const readmeFile = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/README.md"
    );
    const protocolFile = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/Protocol.pdf"
    );
    const guidelinesFile = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/Guidelines.docx"
    );

    expect(readmeFile.license).toEqual({ "@id": "#license-testarchive-public" });
    expect(protocolFile.license).toEqual({
      "@id": "#license-testarchive-restricted"
    });
    expect(guidelinesFile.license).toEqual({ "@id": "#collection-license" });
  });

  it("should emit license entities for document access codes", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    const publicLicense = graph.find(
      (item: any) => item["@id"] === "#license-testarchive-public"
    );
    const restrictedLicense = graph.find(
      (item: any) => item["@id"] === "#license-testarchive-restricted"
    );

    expect(publicLicense).toBeDefined();
    expect(restrictedLicense).toBeDefined();
    expect(publicLicense["ldac:access"]).toEqual({ "@id": "ldac:OpenAccess" });
    expect(restrictedLicense["ldac:access"]).toEqual({
      "@id": "ldac:AuthorizedAccess"
    });
  });

  it("should still have the #descriptionDocuments CollectionProtocol for LDAC compliance", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    // The CollectionProtocol should still exist for LDAC compliance
    const protocolEntry = graph.find(
      (item: any) => item["@id"] === "#descriptionDocuments"
    );

    expect(protocolEntry).toBeDefined();
    expect(protocolEntry["@type"]).toBe("ldac:CollectionProtocol");

    // The root should still have ldac:hasCollectionProtocol
    const rootEntity = graph.find((item: any) => item["@id"] === "./");
    expect(rootEntity["ldac:hasCollectionProtocol"]).toBeDefined();
  });

  it("should make all DescriptionDocuments files reachable from root via pcdm:hasMember and hasPart chain", async () => {
    // The key validation - all data entities should be reachable from root
    // IMPORTANT: pcdm:hasMember is ONLY used for the first hop from root to top-level datasets.
    // All subsequent hops must use hasPart.
    const result = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = result["@graph"];

    // Build entity index
    const entityIndex = new Map<string, any>();
    graph.forEach((entity: any) => {
      if (entity["@id"]) {
        entityIndex.set(entity["@id"], entity);
      }
    });

    // Collect all entities reachable from root via pcdm:hasMember and hasPart
    const reachableFromRoot = new Set<string>();
    const collectReachable = (entity: any, visited: Set<string>) => {
      // Follow pcdm:hasMember
      const hasMember = entity["pcdm:hasMember"];
      if (hasMember) {
        const members = Array.isArray(hasMember) ? hasMember : [hasMember];
        members.forEach((member: any) => {
          const memberId = typeof member === "object" ? member["@id"] : member;
          if (memberId && !visited.has(memberId)) {
            visited.add(memberId);
            reachableFromRoot.add(memberId);
            const memberEntity = entityIndex.get(memberId);
            if (memberEntity) {
              collectReachable(memberEntity, visited);
            }
          }
        });
      }

      // Follow hasPart
      const hasPart = entity.hasPart;
      if (hasPart) {
        const parts = Array.isArray(hasPart) ? hasPart : [hasPart];
        parts.forEach((part: any) => {
          const partId = typeof part === "object" ? part["@id"] : part;
          if (partId && !visited.has(partId)) {
            visited.add(partId);
            reachableFromRoot.add(partId);
            const partEntity = entityIndex.get(partId);
            if (partEntity) {
              collectReachable(partEntity, visited);
            }
          }
        });
      }
    };

    const rootEntity = entityIndex.get("./");
    const visited = new Set<string>();
    visited.add("./");
    collectReachable(rootEntity, visited);

    // Verify DescriptionDocuments/ and files are reachable
    expect(reachableFromRoot.has("DescriptionDocuments/")).toBe(true);
    expect(reachableFromRoot.has("DescriptionDocuments/README.md")).toBe(true);
    expect(reachableFromRoot.has("DescriptionDocuments/Protocol.pdf")).toBe(
      true
    );
    expect(reachableFromRoot.has("DescriptionDocuments/Guidelines.docx")).toBe(
      true
    );
  });

  it("should NOT create DescriptionDocuments/ Dataset if folder is empty", async () => {
    // Create a project with empty descriptionFolder
    const emptyProject = {
      ...mockProject,
      descriptionFolder: { files: [] }
    } as unknown as Project;
    Object.setPrototypeOf(emptyProject, Project.prototype);

    const result = (await getRoCrate(emptyProject, emptyProject)) as any;
    const graph = result["@graph"];

    const descDocsDataset = graph.find(
      (item: any) => item["@id"] === "DescriptionDocuments/"
    );

    expect(descDocsDataset).toBeUndefined();

    // Root should not have DescriptionDocuments/ in hasPart
    const rootEntity = graph.find((item: any) => item["@id"] === "./");
    const hasDescDocsRef = rootEntity.hasPart.some(
      (p: any) => p["@id"] === "DescriptionDocuments/"
    );
    expect(hasDescDocsRef).toBe(false);
  });
});
