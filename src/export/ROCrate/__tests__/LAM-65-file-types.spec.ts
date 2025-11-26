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
import { FieldDefinition } from "../../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

// Mock fs-extra module
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date("2023-01-01")
  })
}));

/**
 * LAM-65: https://linear.app/lameta/issue/LAM-65/types-of-files
 * LAM-69: https://linear.app/lameta/issue/LAM-69/correct-types
 *
 * This test verifies that file entities have the correct @type values:
 * - All files MUST include "File" (per LAM-54)
 * - Audio files: ["File", "AudioObject"]
 * - Video files: ["File", "VideoObject"]
 * - Image files: ["File", "ImageObject"]
 * - All other files (including .sprj, .person, .session, .eaf, .txt, .docx, etc.): "File"
 *   (LAM-69: Per RO-Crate spec, CreativeWork is not necessary as it's a superclass)
 */
describe("LAM-65: File type assignments", () => {
  let mockProject: Project;
  let mockSession: Session;

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

    // Create mock files with various extensions
    const mockAudioFile = {
      getActualFilePath: () => "/sessions/test/audio.mp3",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "audio.mp3"
    } as any;

    const mockVideoFile = {
      getActualFilePath: () => "/sessions/test/video.mp4",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "video.mp4"
    } as any;

    const mockImageFile = {
      getActualFilePath: () => "/sessions/test/image.jpg",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "image.jpg"
    } as any;

    const mockSessionMetaFile = {
      getActualFilePath: () => "/sessions/test/test.session",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "test.session"
    } as any;

    const mockXmlFile = {
      getActualFilePath: () => "/sessions/test/data.xml",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "data.xml"
    } as any;

    const mockEafFile = {
      getActualFilePath: () => "/sessions/test/transcription.eaf",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "transcription.eaf"
    } as any;

    // Mock session
    mockSession = {
      filePrefix: "test",
      directory: "/sessions/test",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockReturnValue(""),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [
        mockAudioFile,
        mockVideoFile,
        mockImageFile,
        mockSessionMetaFile,
        mockXmlFile,
        mockEafFile
      ],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as any;

    mockProject = {
      filePrefix: "TestProject",
      sessions: { items: [mockSession] },
      findPerson: vi.fn().mockReturnValue(null),
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
  });

  it("should type audio files as [File, AudioObject]", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const audioFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/test/audio.mp3"
    );
    expect(audioFile).toBeDefined();
    expect(audioFile["@type"]).toEqual(["File", "AudioObject"]);
  });

  it("should type video files as [File, VideoObject]", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const videoFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/test/video.mp4"
    );
    expect(videoFile).toBeDefined();
    expect(videoFile["@type"]).toEqual(["File", "VideoObject"]);
  });

  it("should type image files as [File, ImageObject]", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const imageFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/test/image.jpg"
    );
    expect(imageFile).toBeDefined();
    expect(imageFile["@type"]).toEqual(["File", "ImageObject"]);
  });

  it("should type .session files as File only", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const sessionFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/test/test.session"
    );
    expect(sessionFile).toBeDefined();
    // LAM-69: https://linear.app/lameta/issue/LAM-69/correct-types
    // Per RO-Crate spec, files only need @type of "File" - CreativeWork is not necessary
    expect(sessionFile["@type"]).toEqual("File");
  });

  it("should type .xml files as File only", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const xmlFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/test/data.xml"
    );
    expect(xmlFile).toBeDefined();
    // LAM-69: https://linear.app/lameta/issue/LAM-69/correct-types
    // Per RO-Crate spec, non-media files only need @type of "File"
    expect(xmlFile["@type"]).toEqual("File");
  });

  it("should type .eaf files as File only (ELAN annotation)", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const eafFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/test/transcription.eaf"
    );
    expect(eafFile).toBeDefined();
    // LAM-69: https://linear.app/lameta/issue/LAM-69/correct-types
    // Per RO-Crate spec, .eaf files only need @type of "File" - CreativeWork is not necessary
    expect(eafFile["@type"]).toEqual("File");
  });
});

describe("LAM-65: Person file type assignments", () => {
  let mockProject: Project;
  let mockPerson: Person;

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

    const mockPersonFile = {
      getActualFilePath: () => "/people/John_Doe/John_Doe.person",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "John_Doe.person"
    } as any;

    const mockPhotoFile = {
      getActualFilePath: () => "/people/John_Doe/John_Doe_Photo.jpg",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "John_Doe_Photo.jpg"
    } as any;

    const mockConsentFile = {
      getActualFilePath: () => "/people/John_Doe/John_Doe_Consent.pdf",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "John_Doe_Consent.pdf"
    } as any;

    mockPerson = {
      filePrefix: "John_Doe",
      directory: "/people/John_Doe",
      folderType: "person",
      getIdToUseForReferences: () => "John_Doe",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "name") return "John Doe";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [mockPersonFile, mockPhotoFile, mockConsentFile]
    } as any;

    mockProject = {
      filePrefix: "TestProject",
      sessions: { items: [] },
      findPerson: vi.fn().mockImplementation((name: string) => {
        if (name === "John_Doe") return mockPerson;
        return null;
      }),
      persons: { items: [mockPerson] },
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

    Object.setPrototypeOf(mockProject, Project.prototype);
    Object.setPrototypeOf(mockPerson, Person.prototype);
  });

  it("should type .person files as File only", async () => {
    const result = (await getRoCrate(mockProject, mockPerson)) as any;

    // When exporting a person directly, files are in the result array
    const personFile = result.find(
      (item: any) =>
        item["@id"] === "People/John_Doe/John_Doe.person" ||
        (item.name && item.name === "John_Doe.person")
    );
    expect(personFile).toBeDefined();
    // LAM-69: https://linear.app/lameta/issue/LAM-69/correct-types
    // Per RO-Crate spec, .person files only need @type of "File"
    expect(personFile["@type"]).toEqual("File");
  });

  it("should type person photo files as [File, ImageObject]", async () => {
    const result = (await getRoCrate(mockProject, mockPerson)) as any;

    const photoFile = result.find(
      (item: any) =>
        item["@id"] === "People/John_Doe/John_Doe_Photo.jpg" ||
        (item.name && item.name === "John_Doe_Photo.jpg")
    );
    expect(photoFile).toBeDefined();
    expect(photoFile["@type"]).toEqual(["File", "ImageObject"]);
  });

  it("should type consent PDF files as File only", async () => {
    const result = (await getRoCrate(mockProject, mockPerson)) as any;

    // PDF files are "Doc" type in FileTypeInfo, which is not a media type
    const consentFile = result.find(
      (item: any) =>
        item["@id"] === "People/John_Doe/John_Doe_Consent.pdf" ||
        (item.name && item.name === "John_Doe_Consent.pdf")
    );
    expect(consentFile).toBeDefined();
    // LAM-69: https://linear.app/lameta/issue/LAM-69/correct-types
    // Per RO-Crate spec, PDF files only need @type of "File"
    expect(consentFile["@type"]).toEqual("File");
  });
});

describe("LAM-65: Project-level file type assignments", () => {
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

    const mockSprjFile = {
      getActualFilePath: () => "/project/TestProject.sprj",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "TestProject.sprj"
    } as any;

    const mockDescriptionDoc = {
      getActualFilePath: () => "/project/DescriptionDocuments/README.txt",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "README.txt"
    } as any;

    const mockOtherImage = {
      getActualFilePath: () => "/project/OtherDocuments/map.png",
      getModifiedDate: () => new Date("2023-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "map.png"
    } as any;

    // Create mock description folder
    const mockDescriptionFolder = {
      files: [mockDescriptionDoc]
    } as any;

    // Create mock other docs folder
    const mockOtherDocsFolder = {
      files: [mockOtherImage]
    } as any;

    mockProject = {
      filePrefix: "TestProject",
      sessions: { items: [] },
      findPerson: vi.fn().mockReturnValue(null),
      metadataFile: {
        getTextProperty: vi.fn().mockReturnValue(""),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [mockSprjFile],
      knownFields: [],
      authorityLists: { accessChoicesOfCurrentProtocol: [] },
      descriptionFolder: mockDescriptionFolder,
      otherDocsFolder: mockOtherDocsFolder
    } as any;

    Object.setPrototypeOf(mockProject, Project.prototype);
  });

  it("should type .sprj files as File only", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const sprjFile = result["@graph"].find(
      (item: any) =>
        item.name === "TestProject.sprj" || item["@id"]?.includes(".sprj")
    );
    expect(sprjFile).toBeDefined();
    // LAM-69: https://linear.app/lameta/issue/LAM-69/correct-types
    // Per RO-Crate spec, .sprj files only need @type of "File"
    expect(sprjFile["@type"]).toEqual("File");
  });

  it("should type description text files as File only", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const descFile = result["@graph"].find(
      (item: any) =>
        item["@id"] === "DescriptionDocuments/README.txt" ||
        item.name === "README.txt"
    );
    expect(descFile).toBeDefined();
    // LAM-69: https://linear.app/lameta/issue/LAM-69/correct-types
    // Per RO-Crate spec, text files only need @type of "File"
    expect(descFile["@type"]).toEqual("File");
  });

  it("should type OtherDocuments image files as [File, ImageObject]", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    const imageFile = result["@graph"].find(
      (item: any) =>
        item["@id"] === "OtherDocuments/map.png" || item.name === "map.png"
    );
    expect(imageFile).toBeDefined();
    // Images still get ImageObject, not CreativeWork
    expect(imageFile["@type"]).toEqual(["File", "ImageObject"]);
  });
});
