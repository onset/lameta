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
});
