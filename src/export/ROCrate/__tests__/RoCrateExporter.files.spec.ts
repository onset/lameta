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
import { Session } from "../../../model/Project/Session/Session";
import { Project } from "../../../model/Project/Project";
import { Person } from "../../../model/Project/Person/Person";
import { File } from "../../../model/file/File";
import { FieldDefinition } from "../../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";
import { createPersonId } from "../RoCrateUtils";

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
  let awiPersonId: string;

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
      persons: { items: [mockPerson] }, // Required for People/ dataset to be created
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

    awiPersonId = createPersonId(mockPerson);
  });

  it("should include File plus media-specific @types", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const audioFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Careful.mp3"
    );
    expect(audioFile["@type"]).toEqual(["File", "AudioObject"]);

    const videoFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Tiny.mp4"
    );
    expect(videoFile["@type"]).toEqual(["File", "VideoObject"]);

    const imageFile = result["@graph"].find(
      (item: any) => item["@id"] === "People/Awi_Heole/Awi_Heole_Photo.JPG"
    );
    expect(imageFile["@type"]).toEqual(["File", "ImageObject"]);

    const xmlFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009.xml"
    );
    // https://linear.app/lameta/issue/LAM-54: even plain XML exports must be typed as File for RO-Crate compliance
    // https://linear.app/lameta/issue/LAM-69: non-media files only need "File" type (CreativeWork is not necessary)
    expect(xmlFile["@type"]).toEqual("File");
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

  // LAM-103: Session files should be in the session directory Dataset, not the CollectionEvent.
  // The CollectionEvent (#session-*) represents the event metadata and should NOT have hasPart.
  // Instead, files belong to the session directory Dataset (Sessions/ETR009/) via hasPart.
  // See: https://linear.app/lameta/issue/LAM-103/fix-relation
  it("should link session files to session directory Dataset hasPart, not CollectionEvent", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // The session CollectionEvent should NOT have hasPart
    const sessionEvent = result["@graph"].find(
      (item: any) =>
        item["@id"] === "#session-ETR009" &&
        item["@type"].includes("CollectionEvent")
    );
    expect(sessionEvent.hasPart).toBeUndefined();

    // Files should be in the session directory Dataset
    const sessionDir = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/"
    );
    expect(sessionDir).toBeDefined();
    expect(sessionDir.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/ETR009_Careful.mp3"
    });
    expect(sessionDir.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/ETR009_Tiny.mp4"
    });
    expect(sessionDir.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/ETR009.xml"
    });
  });

  // LAM-97: Renamed from "should link person files to person hasPart" because Person entities
  // cannot have hasPart (Person is not a subclass of CreativeWork). This test verifies the
  // semantically-appropriate `image` property is used instead.
  // See: https://linear.app/lameta/issue/LAM-97/attach-people-files-via-haspart
  it("should link person images via image property", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const personEntity = result["@graph"].find(
      (item: any) => item["@id"] === awiPersonId && item["@type"] === "Person"
    );

    expect(personEntity).toBeDefined();
    const images = Array.isArray(personEntity.image)
      ? personEntity.image
      : [personEntity.image].filter(Boolean);
    expect(images).toContainEqual({
      "@id": "People/Awi_Heole/Awi_Heole_Photo.JPG"
    });
  });

  // LAM-97: Per RO-Crate 1.2 spec (line 1032), data entities MUST be linked from root via hasPart.
  // Since Person entities cannot have hasPart, person files should be attached to the People/
  // Dataset entity instead. This ensures they are reachable from the root data entity.
  // LAM-98: Each person now gets their own intermediate Dataset (e.g., People/Awi_Heole/) that contains
  // the person entity and their files. The People/ dataset references these intermediate datasets.
  // See: https://linear.app/lameta/issue/LAM-97/attach-people-files-via-haspart
  // See: https://linear.app/lameta/issue/LAM-98/dataset-for-each-person
  it("should include person files in People/ dataset hasPart via intermediate dataset", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const peopleDataset = result["@graph"].find(
      (item: any) => item["@id"] === "People/"
    );

    expect(peopleDataset).toBeDefined();
    expect(peopleDataset["@type"]).toBe("Dataset");

    // LAM-98: The People/ dataset now references intermediate per-person datasets
    expect(peopleDataset.hasPart).toContainEqual({
      "@id": "People/Awi_Heole/"
    });

    // The intermediate dataset uses 'about' to reference the person, and 'hasPart' for files
    const personFilesDataset = result["@graph"].find(
      (item: any) => item["@id"] === "People/Awi_Heole/"
    );
    expect(personFilesDataset).toBeDefined();
    expect(personFilesDataset["@type"]).toBe("Dataset");
    // Person is referenced via 'about' (not hasPart - a person is not "part of" a dataset)
    expect(personFilesDataset.about).toEqual({
      "@id": awiPersonId
    });
    // Files are in hasPart
    expect(personFilesDataset.hasPart).toContainEqual({
      "@id": "People/Awi_Heole/Awi_Heole_Photo.JPG"
    });
  });
});
