import { describe, it, expect, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { createPersonId } from "../RoCrateUtils";
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
    // Create person with spaces using test utilities
    const personWithSpaces = createMockPerson({
      filePrefix: "BAHOUNGOU Hilaire",
      metadata: {
        fullName: "BAHOUNGOU Hilaire"
      }
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

    // Root hasPart should reference the People dataset wrapper but never direct Person IDs
    const rootHasPartIds =
      rootDataset.hasPart?.map((ref: any) => ref["@id"]) ?? [];
    expect(rootHasPartIds).toContain("#People");
    expect(rootHasPartIds).not.toContain(expectedPersonId);

    // LAM-68 https://linear.app/lameta/issue/LAM-68/people-dataset
    // Ensure the People dataset hangs all Person nodes via hasPart per the directory data-entity rules
    const peopleDataset = graph.find((item: any) => item["@id"] === "#People");
    expect(peopleDataset).toBeDefined();
    expect(peopleDataset?.["@type"]).toBe("Dataset");
    expect(peopleDataset?.hasPart).toContainEqual({
      "@id": expectedPersonId
    });
    expect(peopleDataset?.isPartOf).toEqual({ "@id": "./" });

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
  // in the #People dataset's hasPart, not just the Person entities themselves.
  // Per RO-Crate 1.2 spec (line 1032), data entities MUST be linked from root via hasPart.
  // See: https://linear.app/lameta/issue/LAM-97/attach-people-files-via-haspart
  it("includes person files in #People dataset hasPart alongside Person entities", async () => {
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

    const peopleDataset = graph.find((item: any) => item["@id"] === "#People");
    expect(peopleDataset).toBeDefined();

    const expectedPersonId = createPersonId(personWithFiles);
    const hasPartIds = peopleDataset.hasPart.map((ref: any) => ref["@id"]);

    // Should include the Person entity
    expect(hasPartIds).toContain(expectedPersonId);

    // Should include all person files
    expect(hasPartIds).toContain("People/Test_Person/Test_Person_Photo.JPG");
    expect(hasPartIds).toContain("People/Test_Person/Test_Person_Consent.JPG");
    expect(hasPartIds).toContain("People/Test_Person/Test_Person.person");

    // Verify the files have the `about` property pointing to the person
    const photoFile = graph.find(
      (item: any) => item["@id"] === "People/Test_Person/Test_Person_Photo.JPG"
    );
    expect(photoFile).toBeDefined();
    expect(photoFile.about).toEqual({ "@id": expectedPersonId });

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
