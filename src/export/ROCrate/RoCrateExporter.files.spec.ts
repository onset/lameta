import { vi, describe, it, beforeEach, expect } from "vitest";

// Mock the staticLanguageFinder dependency BEFORE importing modules that use it
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => `Language ${code}`)
  }
}));

import { getRoCrate } from "./RoCrateExporter";
import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import { Person } from "../../model/Project/Person/Person";
import { File } from "../../model/file/File";
import { FieldDefinition } from "../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";

// Mock fs-extra module
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date("2023-01-01")
  })
}));

describe("RoCrateExporter file handling", () => {
  let mockProject: Project;
  let mockSession: Session;
  let mockPerson: Person;

  beforeEach(() => {
    // Mock field definitions
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

    // Mock files with different types
    const mockAudioFile = {
      getActualFilePath: () => "/sessions/ETR009/ETR009_Careful.mp3",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "ETR009_Careful.mp3"
    } as any;

    const mockVideoFile = {
      getActualFilePath: () => "/sessions/ETR009/ETR009_Tiny.mp4",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "ETR009_Tiny.mp4"
    } as any;

    const mockImageFile = {
      getActualFilePath: () => "/people/Awi_Heole/Awi_Heole_Photo.JPG",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "Awi_Heole_Photo.JPG"
    } as any;

    const mockXmlFile = {
      getActualFilePath: () => "/sessions/ETR009/ETR009.xml",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "ETR009.xml"
    } as any;

    // Mock person
    mockPerson = {
      filePrefix: "Awi_Heole",
      directory: "/people/Awi_Heole",
      getIdToUseForReferences: () => "Awi_Heole",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "name") return "Awi Heole";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [mockImageFile]
    } as any;

    // Mock session
    mockSession = {
      filePrefix: "ETR009",
      directory: "/sessions/ETR009",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockReturnValue(""),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [mockAudioFile, mockVideoFile, mockXmlFile],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([
        {
          personReference: "Awi_Heole",
          role: "speaker"
        }
      ])
    } as any;

    mockProject = {
      filePrefix: "TestProject",
      sessions: { items: [mockSession] },
      findPerson: vi.fn().mockImplementation((name: string) => {
        if (name === "Awi_Heole") return mockPerson;
        return null;
      }),
      metadataFile: {
        getTextProperty: vi.fn().mockReturnValue(""),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [],
      knownFields: [],
      authorityLists: { accessChoicesOfCurrentProtocol: [] }
    } as any;

    // Set up prototypes
    Object.setPrototypeOf(mockProject, Project.prototype);
    Object.setPrototypeOf(mockSession, Session.prototype);
    Object.setPrototypeOf(mockPerson, Person.prototype);
  });

  it("should use specific file types instead of generic File", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const audioFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Careful.mp3"
    );
    expect(audioFile["@type"]).toBe("AudioObject");

    const videoFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Tiny.mp4"
    );
    expect(videoFile["@type"]).toBe("VideoObject");

    const imageFile = result["@graph"].find(
      (item: any) => item["@id"] === "People/Awi_Heole/Awi_Heole_Photo.JPG"
    );
    expect(imageFile["@type"]).toBe("ImageObject");

    const xmlFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009.xml"
    );
    expect(xmlFile["@type"]).toBe("DigitalDocument");
  });

  it("should not add role property to files", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const audioFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Careful.mp3"
    );
    expect(audioFile.role).toBeUndefined();

    const xmlFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009.xml"
    );
    expect(xmlFile.role).toBeUndefined();

    const imageFile = result["@graph"].find(
      (item: any) => item["@id"] === "People/Awi_Heole/Awi_Heole_Photo.JPG"
    );
    expect(imageFile.role).toBeUndefined();
  });

  it("should link session files to session hasPart", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const sessionEvent = result["@graph"].find(
      (item: any) =>
        item["@id"] === "Sessions/ETR009/" && item["@type"].includes("Event")
    );

    expect(sessionEvent.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/ETR009_Careful.mp3"
    });
    expect(sessionEvent.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/ETR009_Tiny.mp4"
    });
    expect(sessionEvent.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/ETR009.xml"
    });
  });

  it("should link person files to person hasPart", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const personEntity = result["@graph"].find(
      (item: any) =>
        item["@id"] === "People/Awi_Heole/" && item["@type"] === "Person"
    );

    expect(personEntity.hasPart).toContainEqual({
      "@id": "People/Awi_Heole/Awi_Heole_Photo.JPG"
    });
  });

  it("should add ldac:materialType property to all files", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const audioFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Careful.mp3"
    );
    expect(audioFile["ldac:materialType"]).toEqual({
      "@id": "ldac:PrimaryMaterial"
    });

    const videoFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Tiny.mp4"
    );
    expect(videoFile["ldac:materialType"]).toEqual({
      "@id": "ldac:PrimaryMaterial"
    });

    const imageFile = result["@graph"].find(
      (item: any) => item["@id"] === "People/Awi_Heole/Awi_Heole_Photo.JPG"
    );
    expect(imageFile["ldac:materialType"]).toEqual({
      "@id": "ldac:PrimaryMaterial"
    });

    const xmlFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009.xml"
    );
    expect(xmlFile["ldac:materialType"]).toEqual({
      "@id": "ldac:Annotation"
    });
  });
});
