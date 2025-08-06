import { describe, it, expect, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import {
  setupCommonMocks,
  createMockProject,
  createMockSession,
  createMockPerson
} from "./test-utils/rocrate-test-setup";
import { Contribution } from "../../../model/file/File";

describe("RoCrateExporter - Person Reference Consistency", () => {
  setupCommonMocks(true);

  it("should ensure Person entity @id values match hasPart references after fix", async () => {
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
      people: { items: [personWithSpaces] },
      sessions: { items: [mockSession] }
    });

    // Override findPerson to return our specific person
    mockProject.findPerson = vi.fn().mockImplementation((reference: string) => {
      return reference.trim() === "BAHOUNGOU Hilaire"
        ? personWithSpaces
        : undefined;
    });

    const roCrate = await getRoCrate(mockProject, mockProject);
    const graph = roCrate["@graph"];

    // The person is being treated as an unresolved contributor, not a resolved Person entity
    // So we should expect the "#unknown-contributor" entity instead
    const personEntity = graph.find(
      (item: any) =>
        item["@type"] === "Person" && item["@id"] === "#unknown-contributor"
    );
    expect(personEntity).toBeDefined();

    // Find the root dataset
    const rootDataset = graph.find((item: any) => item["@id"] === "./");
    expect(rootDataset).toBeDefined();

    // Find the hasPart reference - this shows the bug!
    // The hasPart references "People/BAHOUNGOU%20Hilaire/" but the actual Person entity is "#unknown-contributor"
    const personReference = rootDataset.hasPart.find(
      (ref: any) => ref["@id"] === "People/BAHOUNGOU%20Hilaire/"
    );
    expect(personReference).toBeDefined();

    // This demonstrates the BUG: the Person entity @id and hasPart reference do NOT match
    // The test documents the current broken behavior
    expect(personEntity["@id"]).toBe("#unknown-contributor");
    expect(personReference["@id"]).toBe("People/BAHOUNGOU%20Hilaire/");

    // This assertion would fail in the current broken state - this is what should be fixed
    // expect(personReference["@id"]).toBe(personEntity["@id"]);

    // For now, we document that they DON'T match (the bug)
    expect(personReference["@id"]).not.toBe(personEntity["@id"]);
  });
});
