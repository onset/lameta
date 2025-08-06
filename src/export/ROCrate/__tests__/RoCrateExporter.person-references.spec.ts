import { describe, it, expect, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";

vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => `Language ${code}`)
  }
}));

vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1000,
    birthtime: new Date("2023-01-01")
  })
}));

describe("RoCrateExporter - Person Reference Consistency", () => {
  it("should ensure Person entity @id values match hasPart references after fix", async () => {
    const personWithSpaces = {
      filePrefix: "BAHOUNGOU Hilaire",
      knownFields: [],
      files: [],
      metadataFile: {
        getTextField: vi.fn().mockReturnValue("BAHOUNGOU Hilaire"),
        getTextProperty: vi.fn().mockReturnValue(""),
        properties: new Map()
      }
    };

    const mockSession = {
      filePrefix: "test-session",
      knownFields: [],
      files: [],
      metadataFile: {
        getTextField: vi.fn().mockReturnValue("Test Session"),
        getTextProperty: vi.fn().mockReturnValue(""),
        properties: new Map()
      },
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([
        {
          personReference: "BAHOUNGOU Hilaire",
          role: "speaker",
          date: "",
          comments: ""
        }
      ])
    };

    const mockProject = {
      knownFields: [],
      files: [],
      metadataFile: {
        getTextField: vi.fn().mockReturnValue("Test Project"),
        getTextProperty: vi.fn().mockReturnValue(""),
        properties: new Map()
      },
      people: { items: [personWithSpaces] },
      sessions: { items: [mockSession] },
      findPerson: vi.fn().mockImplementation((reference: string) => {
        if (reference.trim() === "BAHOUNGOU Hilaire") {
          return personWithSpaces;
        }
        return undefined;
      }),
      descriptionFolder: null,
      otherDocsFolder: null
    };

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = roCrate["@graph"];

    // Find the Person entity
    const personEntity = graph.find(
      (item: any) =>
        item["@type"] === "Person" && item["@id"].includes("BAHOUNGOU")
    );
    expect(personEntity).toBeDefined();

    // Find the root dataset
    const rootDataset = graph.find((item: any) => item["@id"] === "./");
    expect(rootDataset).toBeDefined();

    // Find the hasPart reference
    const personReference = rootDataset.hasPart.find((ref: any) =>
      ref["@id"].includes("BAHOUNGOU")
    );
    expect(personReference).toBeDefined();

    // CRITICAL: After the fix, Person entity @id and hasPart reference should match exactly
    expect(personEntity["@id"]).toBe("People/BAHOUNGOU%20Hilaire/");
    expect(personReference["@id"]).toBe("People/BAHOUNGOU%20Hilaire/");
    expect(personReference["@id"]).toBe(personEntity["@id"]);
  });
});
