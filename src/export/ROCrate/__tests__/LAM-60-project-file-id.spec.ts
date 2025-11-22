import { vi, describe, it, beforeEach, expect } from "vitest";

// Mock the staticLanguageFinder dependency BEFORE importing modules that use it
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => `Language ${code}`)
  }
}));

import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import { FieldDefinition } from "../../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

// Mock fs-extra module
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date("2023-01-01")
  })
}));

describe("LAM-60: Project file (@id for .sprj) should be root-relative", () => {
  let mockProject: Project;

  beforeEach(() => {
    // Mock field definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      []
    );
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "project", "get").mockReturnValue(
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

    // Mock the project metadata file (.sprj)
    const mockProjectFile = {
      getActualFilePath: () => "/projects/hewya/hewya.sprj",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "hewya.sprj"
    } as any;

    mockProject = {
      filePrefix: "hewya",
      directory: "/projects/hewya",
      sessions: { items: [] },
      findPerson: vi.fn().mockReturnValue(null),
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Hewya Project";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [mockProjectFile],
      knownFields: [],
      authorityLists: { accessChoicesOfCurrentProtocol: [] }
    } as any;

    // Set up prototypes
    Object.setPrototypeOf(mockProject, Project.prototype);
  });

  it("should use root-relative @id (./hewya.sprj) for project .sprj file, not People/hewya/hewya.sprj", async () => {
    // LAM-60: https://linear.app/lameta/issue/LAM-60/wrong-id-for-lameta-project-file-sprj
    // The .sprj file lives at the RO-Crate root next to ro-crate-metadata.json,
    // so its @id must be root-relative (./...) per RO-Crate 1.2 structure guidance.
    // Previously, createFileId incorrectly treated Projects like Persons because both
    // have knownFields and files properties, resulting in People/<prefix>/<file> paths.
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const projectFile = result["@graph"].find(
      (item: any) => item.name === "hewya.sprj"
    );

    expect(projectFile).toBeDefined();
    expect(projectFile["@id"]).toBe("./hewya.sprj");

    // Verify it's NOT using the incorrect People path
    expect(projectFile["@id"]).not.toBe("People/hewya/hewya.sprj");

    // Also verify that the root dataset's hasPart references it correctly
    const rootDataset = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );
    expect(rootDataset.hasPart).toContainEqual({ "@id": "./hewya.sprj" });
  });
});
