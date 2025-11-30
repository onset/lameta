/**
 * LAM-98: Dataset for each person
 * https://linear.app/lameta/issue/LAM-98/dataset-for-each-person
 *
 * This test file verifies that:
 * 1. Each person with files gets an intermediate Dataset (#<name>-files)
 * 2. The People/ Dataset references person-files Datasets (not individual files/persons)
 * 3. Person names with non-Latin characters are properly encoded in Dataset IDs
 * 4. Files have isPartOf pointing to their person-files Dataset
 */
import { describe, it, expect, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import {
  createPersonId,
  createPersonFilesDatasetId,
  sanitizeForIri
} from "../RoCrateUtils";
import {
  setupCommonMocks,
  createMockProject,
  createMockSession,
  createMockPerson
} from "./test-utils/rocrate-test-setup";
import { Contribution } from "../../../model/file/File";

// Mock fs-extra for file handling
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date("2024-01-01")
  })
}));

describe("LAM-98: Person Files Dataset", () => {
  setupCommonMocks(true);

  it("creates intermediate Dataset for each person with files", async () => {
    // Create mock files
    const mockPhotoFile = {
      getActualFilePath: () => "/people/Alice_Smith/Alice_Smith_Photo.jpg",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Alice_Smith_Photo.jpg"
    } as any;

    const mockConsentFile = {
      getActualFilePath: () => "/people/Alice_Smith/Alice_Smith_Consent.pdf",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Alice_Smith_Consent.pdf"
    } as any;

    const personAlice = createMockPerson({
      filePrefix: "Alice_Smith",
      metadata: { fullName: "Alice Smith" },
      files: [mockPhotoFile, mockConsentFile]
    });

    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: { title: "Test Session" }
    });

    mockSession.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([new Contribution("Alice_Smith", "speaker", "")]);

    const mockProject = createMockProject({
      metadata: { title: "Test Project" },
      persons: { items: [personAlice] },
      sessions: { items: [mockSession] }
    });

    mockProject.findPerson = vi.fn().mockImplementation((ref: string) => {
      return ref.trim() === "Alice_Smith" ? personAlice : undefined;
    });

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = (roCrate as any)["@graph"];

    const alicePersonId = createPersonId(personAlice);
    const aliceFilesDatasetId = createPersonFilesDatasetId(personAlice);

    // Verify People/ contains reference to person-files Dataset
    const peopleDataset = graph.find((e: any) => e["@id"] === "People/");
    expect(peopleDataset).toBeDefined();
    expect(peopleDataset.hasPart).toContainEqual({
      "@id": aliceFilesDatasetId
    });

    // Verify person-files Dataset exists with correct structure
    const aliceFilesDataset = graph.find(
      (e: any) => e["@id"] === aliceFilesDatasetId
    );
    expect(aliceFilesDataset).toBeDefined();
    expect(aliceFilesDataset["@type"]).toBe("Dataset");
    expect(aliceFilesDataset.name).toBe("Alice_Smith files");
    expect(aliceFilesDataset.isPartOf).toEqual({ "@id": "People/" });

    // Verify person-files Dataset uses 'about' to reference the person
    expect(aliceFilesDataset.about).toEqual({ "@id": alicePersonId });

    // Verify person-files Dataset contains files (not person) in hasPart
    const aliceFilesHasPart = aliceFilesDataset.hasPart.map(
      (ref: any) => ref["@id"]
    );
    expect(aliceFilesHasPart).not.toContain(alicePersonId);
    expect(aliceFilesHasPart).toContain(
      "People/Alice_Smith/Alice_Smith_Photo.jpg"
    );
    expect(aliceFilesHasPart).toContain(
      "People/Alice_Smith/Alice_Smith_Consent.pdf"
    );

    // Verify files have isPartOf pointing to person-files Dataset
    const photoFile = graph.find(
      (e: any) => e["@id"] === "People/Alice_Smith/Alice_Smith_Photo.jpg"
    );
    expect(photoFile).toBeDefined();
    expect(photoFile.isPartOf).toEqual({ "@id": aliceFilesDatasetId });
  });

  it("handles non-Latin person names in Dataset IDs", async () => {
    // Test with Japanese name
    const mockPhotoFile = {
      getActualFilePath: () => "/people/山田太郎/山田太郎_Photo.jpg",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "山田太郎_Photo.jpg"
    } as any;

    const personYamada = createMockPerson({
      filePrefix: "山田太郎",
      metadata: { fullName: "山田太郎" },
      files: [mockPhotoFile]
    });

    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: { title: "Test Session" }
    });

    mockSession.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([new Contribution("山田太郎", "speaker", "")]);

    const mockProject = createMockProject({
      metadata: { title: "Test Project" },
      persons: { items: [personYamada] },
      sessions: { items: [mockSession] }
    });

    mockProject.findPerson = vi.fn().mockImplementation((ref: string) => {
      return ref.trim() === "山田太郎" ? personYamada : undefined;
    });

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = (roCrate as any)["@graph"];

    // The Dataset ID should be properly encoded
    const expectedDatasetId = createPersonFilesDatasetId(personYamada);
    expect(expectedDatasetId).toBe(`People/${sanitizeForIri("山田太郎")}/`);

    // Verify the person-files Dataset exists
    const yamadaFilesDataset = graph.find(
      (e: any) => e["@id"] === expectedDatasetId
    );
    expect(yamadaFilesDataset).toBeDefined();
    expect(yamadaFilesDataset["@type"]).toBe("Dataset");
    expect(yamadaFilesDataset.name).toBe("山田太郎 files");
  });

  it("handles special characters in person names (Spanish accents)", async () => {
    const mockPhotoFile = {
      getActualFilePath: () => "/people/José_García/José_García_Photo.jpg",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "José_García_Photo.jpg"
    } as any;

    const personJose = createMockPerson({
      filePrefix: "José García",
      metadata: { fullName: "José García" },
      files: [mockPhotoFile]
    });

    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: { title: "Test Session" }
    });

    mockSession.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([new Contribution("José García", "speaker", "")]);

    const mockProject = createMockProject({
      metadata: { title: "Test Project" },
      persons: { items: [personJose] },
      sessions: { items: [mockSession] }
    });

    mockProject.findPerson = vi.fn().mockImplementation((ref: string) => {
      return ref.trim() === "José García" ? personJose : undefined;
    });

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = (roCrate as any)["@graph"];

    const expectedDatasetId = createPersonFilesDatasetId(personJose);

    // Verify the person-files Dataset exists with properly encoded ID
    const joseFilesDataset = graph.find(
      (e: any) => e["@id"] === expectedDatasetId
    );
    expect(joseFilesDataset).toBeDefined();
    expect(joseFilesDataset["@type"]).toBe("Dataset");
    // Name should retain original characters
    expect(joseFilesDataset.name).toBe("José García files");
  });

  it("creates multiple person-files Datasets for multiple people", async () => {
    // Person 1: Alice
    const alicePhoto = {
      getActualFilePath: () => "/people/Alice/Alice_Photo.jpg",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Alice_Photo.jpg"
    } as any;
    const personAlice = createMockPerson({
      filePrefix: "Alice",
      metadata: { fullName: "Alice" },
      files: [alicePhoto]
    });

    // Person 2: Bob
    const bobPhoto = {
      getActualFilePath: () => "/people/Bob/Bob_Photo.jpg",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Bob_Photo.jpg"
    } as any;
    const personBob = createMockPerson({
      filePrefix: "Bob",
      metadata: { fullName: "Bob" },
      files: [bobPhoto]
    });

    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: { title: "Test Session" }
    });

    mockSession.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([
        new Contribution("Alice", "speaker", ""),
        new Contribution("Bob", "consultant", "")
      ]);

    const mockProject = createMockProject({
      metadata: { title: "Test Project" },
      persons: { items: [personAlice, personBob] },
      sessions: { items: [mockSession] }
    });

    mockProject.findPerson = vi.fn().mockImplementation((ref: string) => {
      if (ref.trim() === "Alice") return personAlice;
      if (ref.trim() === "Bob") return personBob;
      return undefined;
    });

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = (roCrate as any)["@graph"];

    // Verify People/ contains references to both person-files Datasets
    const peopleDataset = graph.find((e: any) => e["@id"] === "People/");
    expect(peopleDataset).toBeDefined();

    const aliceFilesDatasetId = createPersonFilesDatasetId(personAlice);
    const bobFilesDatasetId = createPersonFilesDatasetId(personBob);

    expect(peopleDataset.hasPart).toContainEqual({
      "@id": aliceFilesDatasetId
    });
    expect(peopleDataset.hasPart).toContainEqual({ "@id": bobFilesDatasetId });

    // Verify both person-files Datasets exist
    const aliceFilesDataset = graph.find(
      (e: any) => e["@id"] === aliceFilesDatasetId
    );
    const bobFilesDataset = graph.find(
      (e: any) => e["@id"] === bobFilesDatasetId
    );

    expect(aliceFilesDataset).toBeDefined();
    expect(bobFilesDataset).toBeDefined();

    // Verify each dataset references its person via 'about' (not hasPart)
    const alicePersonId = createPersonId(personAlice);
    const bobPersonId = createPersonId(personBob);

    expect(aliceFilesDataset.about).toEqual({ "@id": alicePersonId });
    expect(bobFilesDataset.about).toEqual({ "@id": bobPersonId });

    // Verify person is NOT in hasPart
    expect(
      aliceFilesDataset.hasPart.map((ref: any) => ref["@id"])
    ).not.toContain(alicePersonId);
    expect(bobFilesDataset.hasPart.map((ref: any) => ref["@id"])).not.toContain(
      bobPersonId
    );

    // Verify files are in correct datasets
    expect(aliceFilesDataset.hasPart.map((ref: any) => ref["@id"])).toContain(
      "People/Alice/Alice_Photo.jpg"
    );
    expect(bobFilesDataset.hasPart.map((ref: any) => ref["@id"])).toContain(
      "People/Bob/Bob_Photo.jpg"
    );
  });

  // Person-files Dataset should use 'about' to reference person, not 'hasPart'.
  // A Dataset can hasPart files, but a Person is not "part of" the Dataset -
  // rather, the Dataset is "about" the Person.
  it("uses about/subjectOf relationship between person-files Dataset and Person (not hasPart)", async () => {
    const mockPhotoFile = {
      getActualFilePath: () => "/people/Alice/Alice_Photo.jpg",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Alice_Photo.jpg"
    } as any;

    const personAlice = createMockPerson({
      filePrefix: "Alice",
      metadata: { fullName: "Alice Person" },
      files: [mockPhotoFile]
    });

    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: { title: "Test Session" }
    });

    mockSession.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([new Contribution("Alice", "speaker", "")]);

    const mockProject = createMockProject({
      metadata: { title: "Test Project" },
      persons: { items: [personAlice] },
      sessions: { items: [mockSession] }
    });

    mockProject.findPerson = vi.fn().mockImplementation((ref: string) => {
      return ref.trim() === "Alice" ? personAlice : undefined;
    });

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = (roCrate as any)["@graph"];

    const alicePersonId = createPersonId(personAlice);
    const aliceFilesDatasetId = createPersonFilesDatasetId(personAlice);

    // Verify person-files Dataset exists
    const aliceFilesDataset = graph.find(
      (e: any) => e["@id"] === aliceFilesDatasetId
    );
    expect(aliceFilesDataset).toBeDefined();
    expect(aliceFilesDataset["@type"]).toBe("Dataset");

    // The person-files Dataset should use 'about' to reference the person
    expect(aliceFilesDataset.about).toEqual({ "@id": alicePersonId });

    // The Person should NOT be in hasPart - hasPart is for files only
    const hasPartIds = aliceFilesDataset.hasPart.map((ref: any) => ref["@id"]);
    expect(hasPartIds).not.toContain(alicePersonId);

    // Files should still be in hasPart
    expect(hasPartIds).toContain("People/Alice/Alice_Photo.jpg");

    // Verify the Person has subjectOf pointing back to the Dataset
    const personEntity = graph.find((e: any) => e["@id"] === alicePersonId);
    expect(personEntity).toBeDefined();
    // The person's subjectOf should include reference to the person-files dataset
    const subjectOfRefs = Array.isArray(personEntity.subjectOf)
      ? personEntity.subjectOf.map((ref: any) => ref["@id"])
      : [personEntity.subjectOf?.["@id"]].filter(Boolean);
    expect(subjectOfRefs).toContain(aliceFilesDatasetId);
  });

  it("preserves person entity image/subjectOf properties", async () => {
    const mockPhotoFile = {
      getActualFilePath: () => "/people/Test/Test_Photo.jpg",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Test_Photo.jpg"
    } as any;

    const mockDocFile = {
      getActualFilePath: () => "/people/Test/Test_Doc.pdf",
      getModifiedDate: () => new Date("2024-01-15"),
      pathInFolderToLinkFileOrLocalCopy: "Test_Doc.pdf"
    } as any;

    const personTest = createMockPerson({
      filePrefix: "Test",
      metadata: { fullName: "Test Person" },
      files: [mockPhotoFile, mockDocFile]
    });

    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: { title: "Test Session" }
    });

    mockSession.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([new Contribution("Test", "speaker", "")]);

    const mockProject = createMockProject({
      metadata: { title: "Test Project" },
      persons: { items: [personTest] },
      sessions: { items: [mockSession] }
    });

    mockProject.findPerson = vi.fn().mockImplementation((ref: string) => {
      return ref.trim() === "Test" ? personTest : undefined;
    });

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = (roCrate as any)["@graph"];

    const personId = createPersonId(personTest);
    const personEntity = graph.find((e: any) => e["@id"] === personId);

    expect(personEntity).toBeDefined();

    // Image file should be referenced via image property
    const images = Array.isArray(personEntity.image)
      ? personEntity.image
      : [personEntity.image].filter(Boolean);
    expect(images).toContainEqual({ "@id": "People/Test/Test_Photo.jpg" });

    // Non-image file should be referenced via subjectOf property
    const subjectOf = Array.isArray(personEntity.subjectOf)
      ? personEntity.subjectOf
      : [personEntity.subjectOf].filter(Boolean);
    expect(subjectOf).toContainEqual({ "@id": "People/Test/Test_Doc.pdf" });
  });
});
