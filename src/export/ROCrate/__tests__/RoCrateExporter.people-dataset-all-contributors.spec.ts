/**
 * Tests for ensuring all contributors (including unresolved ones and unknown-contributor)
 * are connected to the #People dataset in RO-Crate export.
 *
 * Issue: Contributors that are #unknown-contributor or contributors that have a role
 * but don't have an actual person folder need to be connected to the #People dataset.
 *
 * Related: LAM-98 person-files dataset structure
 */
import { describe, it, expect, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import {
  createPersonId,
  createPersonFilesDatasetId,
  createUnresolvedContributorId
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

describe("RO-Crate #People dataset includes all contributors", () => {
  setupCommonMocks(true);

  describe("ID collision handling for contributors", () => {
    it("should generate unique IDs for contributors with special characters", async () => {
      // These names have special characters that will be percent-encoded differently
      const contributors = [
        "José García", // Accented characters will be percent-encoded
        "Jose Garcia" // Plain ASCII version
      ];

      const contributions = contributors.map(
        (name) => new Contribution(name, "speaker", "")
      );

      const mockSession = createMockSession({
        filePrefix: "test-session",
        metadata: { title: "Unicode Test Session" }
      });

      mockSession.getAllContributionsToAllFiles = vi
        .fn()
        .mockReturnValue(contributions);

      const mockProject = createMockProject({
        metadata: { title: "Test Project" },
        persons: { items: [] },
        sessions: { items: [mockSession] }
      });

      mockProject.findPerson = vi.fn().mockReturnValue(null);

      // Verify that the ID generation produces unique IDs
      const id1 = createUnresolvedContributorId(contributors[0]);
      const id2 = createUnresolvedContributorId(contributors[1]);

      // IDs should be different because special characters are percent-encoded
      expect(id1).not.toBe(id2);

      const roCrate = await getRoCrate(mockProject, mockProject);
      const graph = (roCrate as any)["@graph"];

      // Both should exist as separate entities
      for (const name of contributors) {
        const contributorId = createUnresolvedContributorId(name);
        const entity = graph.find((e: any) => e["@id"] === contributorId);
        expect(entity).toBeDefined();
        expect(entity.name).toBe(name);
      }
    });

    it("should handle contributors with leading/trailing whitespace consistently", async () => {
      // Note: Whitespace is trimmed before encoding, so these will produce the same ID
      // This test documents the expected behavior
      const baseName = "Mary Jones";
      const trimmedId = createUnresolvedContributorId(baseName);
      const leadingSpaceId = createUnresolvedContributorId(` ${baseName}`);
      const trailingSpaceId = createUnresolvedContributorId(`${baseName} `);

      // All should produce the same ID after trimming
      expect(leadingSpaceId).toBe(trimmedId);
      expect(trailingSpaceId).toBe(trimmedId);
    });
  });

  describe("unresolved contributors without person folders", () => {
    it("should include unresolved contributors in #People dataset", async () => {
      // Create a contributor with a role, but no person folder
      const contributorName = "Jane Doe (Researcher)";

      const mockSession = createMockSession({
        filePrefix: "test-session",
        metadata: { title: "Test Session" }
      });

      mockSession.getAllContributionsToAllFiles = vi
        .fn()
        .mockReturnValue([new Contribution(contributorName, "speaker", "")]);

      const mockProject = createMockProject({
        metadata: { title: "Test Project" },
        persons: { items: [] }, // No person folders
        sessions: { items: [mockSession] }
      });

      // The contributor does NOT exist as a Person in the project
      mockProject.findPerson = vi.fn().mockReturnValue(null);

      const roCrate = await getRoCrate(mockProject, mockProject);
      const graph = (roCrate as any)["@graph"];

      // The contributor should exist as a Person entity
      const contributorId = createUnresolvedContributorId(contributorName);
      const contributorEntity = graph.find(
        (e: any) => e["@id"] === contributorId
      );
      expect(contributorEntity).toBeDefined();
      expect(contributorEntity["@type"]).toBe("Person");
      expect(contributorEntity.name).toBe(contributorName);

      // The #People dataset should exist and reference the contributor directly
      // (no intermediate Dataset since contributor has no files)
      const peopleDataset = graph.find((e: any) => e["@id"] === "#People");
      expect(peopleDataset).toBeDefined();
      expect(peopleDataset["@type"]).toBe("Dataset");

      // The contributor should be referenced directly in #People.hasPart (no files = no intermediate dataset)
      const peopleHasPartIds = peopleDataset.hasPart.map(
        (ref: any) => ref["@id"]
      );
      expect(peopleHasPartIds).toContain(contributorId);
    });

    it("should include multiple unresolved contributors in #People dataset", async () => {
      const contributors = [
        "Mary Smith",
        "Dr. John Wilson (Linguist)",
        "Sarah O'Connor"
      ];

      const contributions = contributors.map(
        (name) => new Contribution(name, "speaker", "")
      );

      const mockSession = createMockSession({
        filePrefix: "test-session",
        metadata: { title: "Multi Contributor Session" }
      });

      mockSession.getAllContributionsToAllFiles = vi
        .fn()
        .mockReturnValue(contributions);

      const mockProject = createMockProject({
        metadata: { title: "Test Project" },
        persons: { items: [] }, // No person folders
        sessions: { items: [mockSession] }
      });

      // None of these exist as Person records
      mockProject.findPerson = vi.fn().mockReturnValue(null);

      const roCrate = await getRoCrate(mockProject, mockProject);
      const graph = (roCrate as any)["@graph"];

      // All contributors should exist as Person entities
      for (const name of contributors) {
        const contributorId = createUnresolvedContributorId(name);
        const contributorEntity = graph.find(
          (e: any) => e["@id"] === contributorId
        );
        expect(contributorEntity).toBeDefined();
        expect(contributorEntity["@type"]).toBe("Person");
      }

      // The #People dataset should exist
      const peopleDataset = graph.find((e: any) => e["@id"] === "#People");
      expect(peopleDataset).toBeDefined();

      // All contributors should be referenced directly in #People.hasPart (no files = no intermediate datasets)
      const peopleHasPartIds = peopleDataset.hasPart.map(
        (ref: any) => ref["@id"]
      );

      for (const name of contributors) {
        const contributorId = createUnresolvedContributorId(name);
        expect(peopleHasPartIds).toContain(contributorId);
      }
    });
  });

  describe("#unknown-contributor entity", () => {
    it("should include #unknown-contributor in #People dataset when used", async () => {
      const mockSession = createMockSession({
        filePrefix: "test-session",
        metadata: { title: "Test Session" }
      });

      mockSession.getAllContributionsToAllFiles = vi.fn().mockReturnValue([]);

      const mockProject = createMockProject({
        metadata: {
          title: "Test Project",
          contactPerson: "" // Empty contact person triggers #unknown-contributor
        },
        persons: { items: [] },
        sessions: { items: [mockSession] }
      });

      mockProject.findPerson = vi.fn().mockReturnValue(null);

      const roCrate = await getRoCrate(mockProject, mockProject);
      const graph = (roCrate as any)["@graph"];

      // The #unknown-contributor entity should exist
      const unknownContributor = graph.find(
        (e: any) => e["@id"] === "#unknown-contributor"
      );
      expect(unknownContributor).toBeDefined();
      expect(unknownContributor["@type"]).toBe("Person");
      expect(unknownContributor.name).toBe("Unknown");

      // The #People dataset should exist and include #unknown-contributor directly
      // (no intermediate Dataset since it has no files)
      const peopleDataset = graph.find((e: any) => e["@id"] === "#People");
      expect(peopleDataset).toBeDefined();

      const peopleHasPartIds = peopleDataset.hasPart.map(
        (ref: any) => ref["@id"]
      );

      // #unknown-contributor should be referenced directly in #People.hasPart
      expect(peopleHasPartIds).toContain("#unknown-contributor");
    });
  });

  describe("mixed contributors (with and without person folders)", () => {
    it("should include both resolved and unresolved contributors in #People", async () => {
      // Person with folder AND files (should get intermediate dataset)
      const mockPhotoFile = {
        getActualFilePath: () => "/people/Alice_Smith/Alice_Smith_Photo.jpg",
        getModifiedDate: () => new Date("2024-01-15"),
        pathInFolderToLinkFileOrLocalCopy: "Alice_Smith_Photo.jpg"
      } as any;

      const personAlice = createMockPerson({
        filePrefix: "Alice_Smith",
        metadata: { fullName: "Alice Smith" },
        files: [mockPhotoFile]
      });

      // Unresolved contributor (no folder, no files - should be referenced directly)
      const unresolvedContributorName = "Bob Jones (No Folder)";

      const mockSession = createMockSession({
        filePrefix: "test-session",
        metadata: { title: "Test Session" }
      });

      mockSession.getAllContributionsToAllFiles = vi
        .fn()
        .mockReturnValue([
          new Contribution("Alice_Smith", "speaker", ""),
          new Contribution(unresolvedContributorName, "consultant", "")
        ]);

      const mockProject = createMockProject({
        metadata: { title: "Test Project" },
        persons: { items: [personAlice] },
        sessions: { items: [mockSession] }
      });

      mockProject.findPerson = vi.fn().mockImplementation((ref: string) => {
        return ref.trim() === "Alice_Smith" ? personAlice : null;
      });

      const roCrate = await getRoCrate(mockProject, mockProject);
      const graph = (roCrate as any)["@graph"];

      // Both contributors should exist as Person entities
      const alicePersonId = createPersonId(personAlice);
      const bobContributorId = createUnresolvedContributorId(
        unresolvedContributorName
      );

      const aliceEntity = graph.find((e: any) => e["@id"] === alicePersonId);
      const bobEntity = graph.find((e: any) => e["@id"] === bobContributorId);

      expect(aliceEntity).toBeDefined();
      expect(bobEntity).toBeDefined();

      // The #People dataset should exist
      const peopleDataset = graph.find((e: any) => e["@id"] === "#People");
      expect(peopleDataset).toBeDefined();

      const peopleHasPartIds = peopleDataset.hasPart.map(
        (ref: any) => ref["@id"]
      );

      // Alice (with folder) should be connected via her person-files dataset
      const aliceFilesDatasetId = createPersonFilesDatasetId(personAlice);
      expect(peopleHasPartIds).toContain(aliceFilesDatasetId);

      // Bob (unresolved, no files) should be referenced directly in #People.hasPart
      expect(peopleHasPartIds).toContain(bobContributorId);
    });
  });
});
