import { describe, it, expect, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { createPersonId, createPersonFilesDatasetId } from "../RoCrateUtils";
import {
  setupCommonMocks,
  createMockProject,
  createMockSession,
  createMockPerson
} from "./test-utils/rocrate-test-setup";
import { Contribution } from "../../../model/file/File";

// Mock fs-extra for person file tests
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date("2024-01-01")
  })
}));

describe("RoCrateExporter - Person Reference Consistency", () => {
  setupCommonMocks(true);

  it("keeps Person entities contextual and excludes them from root hasPart", async () => {
    // Mock files for the person - needed for intermediate dataset creation
    const mockPersonFile = {
      getActualFilePath: () =>
        "/people/BAHOUNGOU Hilaire/BAHOUNGOU Hilaire.person",
      getModifiedDate: () => new Date("2024-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "BAHOUNGOU Hilaire.person"
    } as any;

    // Create person with spaces using test utilities (must have files to get intermediate dataset)
    const personWithSpaces = createMockPerson({
      filePrefix: "BAHOUNGOU Hilaire",
      metadata: {
        fullName: "BAHOUNGOU Hilaire"
      },
      files: [mockPersonFile]
    });

    // Create session with contribution using test utilities
    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: {
        title: "Test Session"
      }
    });

    // Override to return specific contribution
    mockSession.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([new Contribution("BAHOUNGOU Hilaire", "speaker", "")]);

    // Create project using test utilities
    const mockProject = createMockProject({
      metadata: {
        title: "Test Project"
      },
      persons: { items: [personWithSpaces] },
      sessions: { items: [mockSession] }
    });

    // Override findPerson to return our specific person
    mockProject.findPerson = vi.fn().mockImplementation((reference: string) => {
      return reference.trim() === "BAHOUNGOU Hilaire"
        ? personWithSpaces
        : undefined;
    });

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = (roCrate as any)["@graph"];

    // Find the root dataset
    const rootDataset = graph.find((item: any) => item["@id"] === "./");
    expect(rootDataset).toBeDefined();
    const expectedPersonId = createPersonId(personWithSpaces);
    const expectedPersonFilesDatasetId =
      createPersonFilesDatasetId(personWithSpaces);

    // Root hasPart should reference the People dataset wrapper but never direct Person IDs
    const rootHasPartIds =
      rootDataset.hasPart?.map((ref: any) => ref["@id"]) ?? [];
    expect(rootHasPartIds).not.toContain("People/");
    expect(rootHasPartIds).not.toContain(expectedPersonId);
    // People/ is now linked via pcdm:hasMember, not hasPart
    const rootHasMemberIds =
      rootDataset["pcdm:hasMember"]?.map((ref: any) => ref["@id"]) ?? [];
    expect(rootHasMemberIds).toContain("People/");

    // LAM-68 https://linear.app/lameta/issue/LAM-68/people-dataset
    // LAM-98 https://linear.app/lameta/issue/LAM-98/dataset-for-each-person
    // The People/ dataset now contains references to person-files Datasets, not Person entities directly
    const peopleDataset = graph.find((item: any) => item["@id"] === "People/");
    expect(peopleDataset).toBeDefined();
    expect(peopleDataset?.["@type"]).toBe("Dataset");
    // People/.hasPart now references person-files Datasets
    expect(peopleDataset?.hasPart).toContainEqual({
      "@id": expectedPersonFilesDatasetId
    });
    expect(peopleDataset?.["pcdm:memberOf"]).toEqual({ "@id": "./" });

    // LAM-98: The person-files Dataset should reference the Person via about, not hasPart
    const personFilesDataset = graph.find(
      (item: any) => item["@id"] === expectedPersonFilesDatasetId
    );
    expect(personFilesDataset).toBeDefined();
    expect(personFilesDataset?.["@type"]).toBe("Dataset");
    // Person is referenced via 'about' (not hasPart - a person is not "part of" a dataset)
    expect(personFilesDataset?.about).toEqual({
      "@id": expectedPersonId
    });
    // hasPart should contain files, not the Person entity
    expect(personFilesDataset?.hasPart).not.toContainEqual({
      "@id": expectedPersonId
    });
    expect(personFilesDataset?.isPartOf).toEqual({ "@id": "People/" });

    // The Person entity should exist with the sanitized @id
    const personEntity = graph.find(
      (item: any) =>
        item["@type"] === "Person" && item["@id"] === expectedPersonId
    );
    expect(personEntity).toBeDefined();

    // The session should reference the Person via ldac role properties instead of root hasPart
    const sessionEntity = graph.find(
      (item: any) =>
        typeof item["@id"] === "string" && item["@id"].startsWith("#session-")
    );
    expect(sessionEntity).toBeDefined();
    expect(sessionEntity?.["ldac:speaker"]).toEqual([
      { "@id": expectedPersonId }
    ]);
  });

  // LAM-97: Test that person files (photos, consent forms, .person files) are included
  // in the person-files dataset's hasPart, not directly in People/.
  // LAM-98: Files are now grouped under an intermediate People/<person>/ Dataset.
  // Per RO-Crate 1.2 spec (line 1032), data entities MUST be linked from root via hasPart.
  // See: https://linear.app/lameta/issue/LAM-97/attach-people-files-via-haspart
  // See: https://linear.app/lameta/issue/LAM-98/dataset-for-each-person
  it("includes person files in person-files dataset hasPart alongside Person entities", async () => {
    // Mock files for the person
    const mockPhotoFile = {
      getActualFilePath: () => "/people/Test_Person/Test_Person_Photo.JPG",
      getModifiedDate: () => new Date("2024-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "Test_Person_Photo.JPG"
    } as any;

    const mockConsentFile = {
      getActualFilePath: () => "/people/Test_Person/Test_Person_Consent.JPG",
      getModifiedDate: () => new Date("2024-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "Test_Person_Consent.JPG"
    } as any;

    const mockPersonFile = {
      getActualFilePath: () => "/people/Test_Person/Test_Person.person",
      getModifiedDate: () => new Date("2024-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "Test_Person.person"
    } as any;

    // Create person with files
    const personWithFiles = createMockPerson({
      filePrefix: "Test_Person",
      metadata: {
        fullName: "Test Person"
      },
      files: [mockPhotoFile, mockConsentFile, mockPersonFile]
    });

    // Create session with contribution
    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: {
        title: "Test Session"
      }
    });

    mockSession.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([new Contribution("Test_Person", "speaker", "")]);

    // Create project
    const mockProject = createMockProject({
      metadata: {
        title: "Test Project"
      },
      persons: { items: [personWithFiles] },
      sessions: { items: [mockSession] }
    });

    mockProject.findPerson = vi.fn().mockImplementation((reference: string) => {
      return reference.trim() === "Test_Person" ? personWithFiles : undefined;
    });

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = (roCrate as any)["@graph"];

    const expectedPersonId = createPersonId(personWithFiles);
    const expectedPersonFilesDatasetId =
      createPersonFilesDatasetId(personWithFiles);

    // LAM-98: People/ now references person-files Datasets, not entities directly
    const peopleDataset = graph.find((item: any) => item["@id"] === "People/");
    expect(peopleDataset).toBeDefined();
    const peopleHasPartIds = peopleDataset.hasPart.map(
      (ref: any) => ref["@id"]
    );
    // People/ should reference the person-files Dataset
    expect(peopleHasPartIds).toContain(expectedPersonFilesDatasetId);
    // People/ should NOT directly contain the person entity or files
    expect(peopleHasPartIds).not.toContain(expectedPersonId);
    expect(peopleHasPartIds).not.toContain(
      "People/Test_Person/Test_Person_Photo.JPG"
    );

    // LAM-98: The person-files Dataset should reference the Person via about, and contain files
    const personFilesDataset = graph.find(
      (item: any) => item["@id"] === expectedPersonFilesDatasetId
    );
    expect(personFilesDataset).toBeDefined();
    expect(personFilesDataset?.["@type"]).toBe("Dataset");
    expect(personFilesDataset?.name).toBe("Test_Person files");
    expect(personFilesDataset?.isPartOf).toEqual({ "@id": "People/" });

    // Person is referenced via 'about' (not hasPart - a person is not "part of" a dataset)
    expect(personFilesDataset?.about).toEqual({ "@id": expectedPersonId });

    const personFilesHasPartIds = personFilesDataset.hasPart.map(
      (ref: any) => ref["@id"]
    );

    // Should NOT include the Person entity in hasPart - Person is referenced via about
    expect(personFilesHasPartIds).not.toContain(expectedPersonId);

    // Should include all person files
    expect(personFilesHasPartIds).toContain(
      "People/Test_Person/Test_Person_Photo.JPG"
    );
    expect(personFilesHasPartIds).toContain(
      "People/Test_Person/Test_Person_Consent.JPG"
    );
    expect(personFilesHasPartIds).toContain(
      "People/Test_Person/Test_Person.person"
    );

    // Verify the files have the `about` property pointing to the person
    const photoFile = graph.find(
      (item: any) => item["@id"] === "People/Test_Person/Test_Person_Photo.JPG"
    );
    expect(photoFile).toBeDefined();
    expect(photoFile.about).toEqual({ "@id": expectedPersonId });

    // LAM-98: Files should have isPartOf pointing to the person-files Dataset
    expect(photoFile.isPartOf).toEqual({ "@id": expectedPersonFilesDatasetId });

    // Verify person entity has image property pointing to photo
    const personEntity = graph.find(
      (item: any) => item["@id"] === expectedPersonId
    );
    expect(personEntity).toBeDefined();
    const images = Array.isArray(personEntity.image)
      ? personEntity.image
      : [personEntity.image].filter(Boolean);
    expect(images).toContainEqual({
      "@id": "People/Test_Person/Test_Person_Photo.JPG"
    });
  });
});
