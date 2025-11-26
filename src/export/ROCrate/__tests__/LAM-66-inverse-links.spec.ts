/**
 * LAM-66: Add Inverse Links (https://linear.app/lameta/issue/LAM-66/add-inverse-links)
 *
 * Tests for bidirectional relationships in RO-Crate output:
 * 1. Files linked via hasPart should have isPartOf pointing back to parent
 * 2. Files linked via subjectOf (Person files) should have about pointing back to person
 *
 * Per LDAC profile:
 * > The relational hierarchy between Collections, Objects and Files are represented
 * > bidirectionally in an RO-Crate by the terms `hasPart`/`isPartOf` and
 * > `pcdm:hasMember`/`pcdm:memberOf`.
 *
 * See: https://raw.githubusercontent.com/Language-Research-Technology/ldac-profile/refs/heads/master/profile/profile.md
 */

import { vi, describe, it, beforeEach, expect } from "vitest";

// Mock the staticLanguageFinder dependency BEFORE importing modules that use it
vi.mock("../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => `Language ${code}`)
  }
}));

// Mock fs-extra module
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date("2023-01-01")
  })
}));

import { getRoCrate } from "../RoCrateExporter";
import { Session } from "../../../model/Project/Session/Session";
import { Project } from "../../../model/Project/Project";
import { Person } from "../../../model/Project/Person/Person";
import { Folder } from "../../../model/Folder/Folder";
import { FieldDefinition } from "../../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";
import { createPersonId } from "../RoCrateUtils";

describe("LAM-66: Inverse Links", () => {
  let mockProject: Project;
  let mockSession: Session;
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

    // Mock files for session
    const mockAudioFile = {
      getActualFilePath: () => "/sessions/Test_Session/Test_Session.wav",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Test_Session.wav"
    } as any;

    const mockSessionMetaFile = {
      getActualFilePath: () => "/sessions/Test_Session/Test_Session.session",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Test_Session.session"
    } as any;

    // Mock files for person
    const mockPersonFile = {
      getActualFilePath: () => "/people/Test_Person/Test_Person.person",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Test_Person.person"
    } as any;

    const mockConsentImageFile = {
      getActualFilePath: () => "/people/Test_Person/Test_Person_Consent.JPG",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Test_Person_Consent.JPG"
    } as any;

    // Mock files for project documents
    const mockDescFile = {
      getActualFilePath: () => "/project/DescriptionDocuments/description.txt",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "description.txt"
    } as any;

    const mockOtherDocFile = {
      getActualFilePath: () => "/project/OtherDocuments/readme.txt",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "readme.txt"
    } as any;

    // Mock person
    mockPerson = {
      filePrefix: "Test_Person",
      directory: "/people/Test_Person",
      folderType: "person",
      getIdToUseForReferences: () => "Test_Person",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "name") return "Test Person";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [mockPersonFile, mockConsentImageFile]
    } as any;

    // Mock session
    mockSession = {
      filePrefix: "Test_Session",
      directory: "/sessions/Test_Session",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "description") return "A test session";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [mockAudioFile, mockSessionMetaFile],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([
        {
          personReference: "Test_Person",
          role: "speaker"
        }
      ])
    } as any;

    // Mock description folder
    const mockDescFolder = {
      files: [mockDescFile],
      directory: "/project/DescriptionDocuments"
    } as any;

    // Mock other docs folder
    const mockOtherDocsFolder = {
      files: [mockOtherDocFile],
      directory: "/project/OtherDocuments"
    } as any;

    mockProject = {
      filePrefix: "TestProject",
      sessions: { items: [mockSession] },
      findPerson: vi.fn().mockImplementation((name: string) => {
        if (name === "Test_Person") return mockPerson;
        return null;
      }),
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Project";
          if (key === "collectionDescription")
            return "A test project for inverse links";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [],
      knownFields: [],
      descriptionFolder: mockDescFolder,
      otherDocsFolder: mockOtherDocsFolder,
      authorityLists: { accessChoicesOfCurrentProtocol: [] }
    } as any;

    // Set up prototypes
    Object.setPrototypeOf(mockProject, Project.prototype);
    Object.setPrototypeOf(mockSession, Session.prototype);
    Object.setPrototypeOf(mockPerson, Person.prototype);
  });

  describe("isPartOf inverse relationship", () => {
    it("should add isPartOf to session files pointing back to the session", async () => {
      // Get RO-Crate for the project
      const roCrate = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrate["@graph"];

      // Find the session entity
      const sessionEntity = graph.find(
        (e: any) => e["@id"] === "#session-Test_Session"
      );
      expect(sessionEntity).toBeDefined();

      // Find the audio file entity
      const audioFile = graph.find((e: any) =>
        e["@id"]?.endsWith("Test_Session.wav")
      );
      expect(audioFile).toBeDefined();

      // LAM-66: Verify the file has isPartOf pointing back to session
      // https://linear.app/lameta/issue/LAM-66/add-inverse-links
      expect(audioFile).toHaveProperty("isPartOf");
      expect(audioFile.isPartOf).toEqual({ "@id": sessionEntity["@id"] });
    });

    it("should add isPartOf to project document files pointing back to project root", async () => {
      const roCrate = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrate["@graph"];

      // Find description document file
      const descFile = graph.find(
        (e: any) => e["@id"] === "DescriptionDocuments/description.txt"
      );

      // LAM-70: Description documents now live under an ldac:CollectionProtocol
      // so their isPartOf reference should point to that entity instead of root
      // https://linear.app/lameta/issue/LAM-66/add-inverse-links
      if (descFile) {
        expect(descFile).toHaveProperty("isPartOf");
        expect(descFile.isPartOf).toEqual({ "@id": "#descriptionDocuments" });
      }
    });

    it("should add isPartOf to other document files pointing back to project root", async () => {
      const roCrate = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrate["@graph"];

      // Find other document file
      const otherFile = graph.find(
        (e: any) => e["@id"] === "OtherDocuments/readme.txt"
      );

      // LAM-66: Verify project-level files have isPartOf pointing to root
      // https://linear.app/lameta/issue/LAM-66/add-inverse-links
      if (otherFile) {
        expect(otherFile).toHaveProperty("isPartOf");
        expect(otherFile.isPartOf).toEqual({ "@id": "./" });
      }
    });
  });

  describe("about inverse relationship for Person files", () => {
    it("should add about to person files linked via subjectOf", async () => {
      const roCrate = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrate["@graph"];

      // Find the person entity
      const personEntity = graph.find(
        (e: any) => e["@type"] === "Person" && e.name === "Test Person"
      );

      // If we have a person with subjectOf...
      if (personEntity && personEntity.subjectOf) {
        const subjectOfId =
          typeof personEntity.subjectOf === "object"
            ? personEntity.subjectOf["@id"]
            : Array.isArray(personEntity.subjectOf)
            ? personEntity.subjectOf[0]["@id"]
            : null;

        if (subjectOfId) {
          // Find the file referenced by subjectOf
          const subjectFile = graph.find((e: any) => e["@id"] === subjectOfId);

          // LAM-66: Verify the file has about pointing back to person
          // https://linear.app/lameta/issue/LAM-66/add-inverse-links
          if (subjectFile) {
            expect(subjectFile).toHaveProperty("about");
            expect(subjectFile.about).toEqual({ "@id": personEntity["@id"] });
          }
        }
      }
    });

    it("should add about to person image files (image also uses about as inverse)", async () => {
      const roCrate = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrate["@graph"];

      // Find the person entity
      const personEntity = graph.find(
        (e: any) => e["@type"] === "Person" && e.name === "Test Person"
      );

      // If we have a person with image property
      if (personEntity && personEntity.image) {
        const imageId =
          typeof personEntity.image === "object"
            ? personEntity.image["@id"]
            : Array.isArray(personEntity.image)
            ? personEntity.image[0]["@id"]
            : null;

        if (imageId) {
          // Find the image file
          const imageFile = graph.find((e: any) => e["@id"] === imageId);

          // LAM-66: Image files should also have about pointing back to the person
          // https://linear.app/lameta/issue/LAM-66/add-inverse-links
          if (imageFile) {
            expect(imageFile).toHaveProperty("about");
            expect(imageFile.about).toEqual({ "@id": personEntity["@id"] });
          }
        }
      }
    });
  });

  describe("bidirectional relationship consistency", () => {
    it("should ensure every hasPart has corresponding isPartOf", async () => {
      const roCrate = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrate["@graph"];

      // Collect all hasPart references from all entities
      const hasPartRefs: { parentId: string; childId: string }[] = [];
      graph.forEach((entity: any) => {
        if (entity.hasPart) {
          const parts = Array.isArray(entity.hasPart)
            ? entity.hasPart
            : [entity.hasPart];
          parts.forEach((part: any) => {
            if (part["@id"]) {
              hasPartRefs.push({
                parentId: entity["@id"],
                childId: part["@id"]
              });
            }
          });
        }
      });

      // LAM-66: Verify each child has isPartOf pointing back to parent
      // https://linear.app/lameta/issue/LAM-66/add-inverse-links
      hasPartRefs.forEach(({ parentId, childId }) => {
        const childEntity = graph.find((e: any) => e["@id"] === childId);
        if (childEntity) {
          expect(
            childEntity,
            `File ${childId} should have isPartOf`
          ).toHaveProperty("isPartOf");
          expect(childEntity.isPartOf).toEqual({ "@id": parentId });
        }
      });
    });

    it("should ensure every subjectOf has corresponding about", async () => {
      const roCrate = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrate["@graph"];

      // Collect all subjectOf references from Person entities
      const subjectOfRefs: { personId: string; fileId: string }[] = [];
      graph.forEach((entity: any) => {
        if (entity["@type"] === "Person" && entity.subjectOf) {
          const subjects = Array.isArray(entity.subjectOf)
            ? entity.subjectOf
            : [entity.subjectOf];
          subjects.forEach((subject: any) => {
            if (subject["@id"]) {
              subjectOfRefs.push({
                personId: entity["@id"],
                fileId: subject["@id"]
              });
            }
          });
        }
      });

      // LAM-66: Verify each file linked via subjectOf has about pointing back to person
      // https://linear.app/lameta/issue/LAM-66/add-inverse-links
      subjectOfRefs.forEach(({ personId, fileId }) => {
        const fileEntity = graph.find((e: any) => e["@id"] === fileId);
        if (fileEntity) {
          expect(fileEntity, `File ${fileId} should have about`).toHaveProperty(
            "about"
          );
          expect(fileEntity.about).toEqual({ "@id": personId });
        }
      });
    });

    it("should ensure every image has corresponding about", async () => {
      const roCrate = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrate["@graph"];

      // Collect all image references from Person entities
      const imageRefs: { personId: string; fileId: string }[] = [];
      graph.forEach((entity: any) => {
        if (entity["@type"] === "Person" && entity.image) {
          const images = Array.isArray(entity.image)
            ? entity.image
            : [entity.image];
          images.forEach((image: any) => {
            if (image["@id"]) {
              imageRefs.push({
                personId: entity["@id"],
                fileId: image["@id"]
              });
            }
          });
        }
      });

      // LAM-66: Verify each file linked via image has about pointing back to person
      // https://linear.app/lameta/issue/LAM-66/add-inverse-links
      imageRefs.forEach(({ personId, fileId }) => {
        const fileEntity = graph.find((e: any) => e["@id"] === fileId);
        if (fileEntity) {
          expect(
            fileEntity,
            `Image file ${fileId} should have about`
          ).toHaveProperty("about");
          expect(fileEntity.about).toEqual({ "@id": personId });
        }
      });
    });
  });
});
