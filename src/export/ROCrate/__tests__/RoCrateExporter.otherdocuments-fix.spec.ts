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
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

// Mock fs-extra module
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date("2023-01-01")
  })
}));

describe("RoCrateExporter OtherDocuments folder fix", () => {
  beforeEach(() => {
    // Mock field definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      []
    );
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "project", "get").mockReturnValue(
      []
    );
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "common", "get").mockReturnValue(
      []
    );
  });

  it("should use 'OtherDocuments' folder prefix, not 'OtherDocs' for files like Letter_from_Jan.txt", async () => {
    // Create the exact file mentioned in the user's request
    const letterFromJanFile = {
      getActualFilePath: () =>
        "C:\\Users\\hatto\\OneDrive\\Documents\\lameta\\edolo-rocrate\\OtherDocuments\\Letter_from_Jan.txt",
      getModifiedDate: () => new Date("2023-01-03"),
      filePrefix: "Letter_from_Jan"
    };

    // Create a mock project with the otherDocsFolder containing the file
    const mockProject = {
      filePrefix: "edolo-rocrate",
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Edolo RO-Crate Test Project";
          if (key === "collectionDescription")
            return "Test project for verifying OtherDocuments folder fix";
          return "";
        }),
        properties: {
          forEach: vi.fn()
        }
      } as any,
      sessions: { items: [] },
      descriptionFolder: { files: [] },
      otherDocsFolder: {
        files: [letterFromJanFile],
        filePrefix: "OtherDocuments"
      },
      authorityLists: {
        accessChoicesOfCurrentProtocol: []
      },
      knownFields: [],
      files: []
    } as any;

    // Generate the RO-Crate
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // Find the root dataset entry
    const rootEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );
    expect(rootEntry).toBeDefined();

    // Verify that the file is referenced with the correct folder prefix
    const letterFileRef = rootEntry.hasPart.find(
      (part: any) => part["@id"] === "OtherDocuments/Letter_from_Jan.txt"
    );
    expect(letterFileRef).toBeDefined();
    expect(letterFileRef["@id"]).toBe("OtherDocuments/Letter_from_Jan.txt");

    // Verify that the file entry itself has the correct @id
    const letterFileEntry = result["@graph"].find(
      (item: any) => item["@id"] === "OtherDocuments/Letter_from_Jan.txt"
    );
    expect(letterFileEntry).toBeDefined();
    expect(letterFileEntry["@id"]).toBe("OtherDocuments/Letter_from_Jan.txt");
    expect(letterFileEntry["@type"]).toBe("DigitalDocument");
    expect(letterFileEntry.name).toBe("Letter_from_Jan.txt");

    // Verify that no files have the incorrect "OtherDocs" prefix
    const incorrectFileRefs = result["@graph"].filter(
      (item: any) => item["@id"] && item["@id"].startsWith("OtherDocs/")
    );
    expect(incorrectFileRefs).toHaveLength(0);

    // Also verify in the hasPart array
    const incorrectHasPartRefs = rootEntry.hasPart.filter(
      (part: any) => part["@id"] && part["@id"].startsWith("OtherDocs/")
    );
    expect(incorrectHasPartRefs).toHaveLength(0);

    console.log(
      "✅ Fix verified: Letter_from_Jan.txt correctly uses 'OtherDocuments/' prefix"
    );
    console.log(`📁 File @id: ${letterFileEntry["@id"]}`);
  });
});
