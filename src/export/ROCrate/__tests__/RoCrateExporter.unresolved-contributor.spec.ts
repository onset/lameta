import { describe, expect, test, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import {
  setupCommonMocks,
  createMockProject,
  createMockSession
} from "./test-utils/rocrate-test-setup";
import { Contribution } from "../../../model/file/File";

describe("RO-Crate Unresolved Contributor Handling", () => {
  setupCommonMocks(true);

  test("should create properly formatted @id for unresolved contributors", async () => {
    // Create a project and session
    const project = createMockProject();
    const session = createMockSession({
      metadata: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "description") return "A test session";
          return "";
        })
      }
    });

    // Create a contributor with a name that contains spaces and special characters
    const contributorName = "John Doe (Researcher)";
    const contribution = new Contribution(contributorName, "speaker", "");

    // Mock the session to return this contribution
    session.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([contribution]);

    // Make sure this contributor does NOT exist as a Person in the project
    project.findPerson = vi.fn().mockReturnValue(null);

    // Add the session to the project
    project.sessions.items = [session];

    // Export the RO-Crate
    const result = await getRoCrate(project, project);
    const graph = result["@graph"];

    // Find the contributor entity in the graph
    const contributorEntities = graph.filter(
      (item: any) => item["@type"] === "Person" && item.name === contributorName
    );

    expect(contributorEntities).toHaveLength(1);
    const contributorEntity = contributorEntities[0];

    // The @id should be properly formatted, not just the raw name
    expect(contributorEntity["@id"]).not.toBe(contributorName);
    expect(contributorEntity["@id"]).toMatch(/^#/); // Should start with # for fragment identifier
    expect(contributorEntity["@id"]).not.toContain(" "); // Should not contain spaces
    expect(contributorEntity["@id"]).not.toContain("("); // Should not contain unencoded special chars
    expect(contributorEntity["@id"]).not.toContain(")"); // Should not contain unencoded special chars

    // The entity should have the proper structure
    expect(contributorEntity.name).toBe(contributorName);
    expect(contributorEntity.description).toContain(
      "could not find a matching Person"
    );

    // Find the session that references this contributor
    const sessionEntity = graph.find((item: any) =>
      item["@type"]?.includes("CollectionEvent")
    );
    expect(sessionEntity).toBeDefined();

    // The session should reference the contributor by the same @id in LDAC role properties
    expect(sessionEntity["ldac:speaker"]).toBeDefined();
    expect(sessionEntity["ldac:speaker"]).toEqual([
      { "@id": contributorEntity["@id"] }
    ]);
  });

  test("should handle multiple unresolved contributors with different names", async () => {
    // Create a project and session
    const project = createMockProject();
    const session = createMockSession({
      metadata: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Multi Contributor Session";
          if (key === "description")
            return "A session with multiple contributors";
          return "";
        })
      }
    });

    const contributors = [
      "Mary Smith",
      "Dr. John Wilson (Linguist)",
      "Sarah O'Connor"
    ];

    const contributions = contributors.map(
      (name) => new Contribution(name, "speaker", "")
    );
    session.getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue(contributions);

    // Ensure none of these exist as Person records
    project.findPerson = vi.fn().mockReturnValue(null);

    project.sessions.items = [session];

    // Export the RO-Crate
    const result = await getRoCrate(project, project);
    const graph = result["@graph"];

    // Find all contributor entities
    const contributorEntities = graph.filter(
      (item: any) =>
        item["@type"] === "Person" && contributors.includes(item.name)
    );

    expect(contributorEntities).toHaveLength(3);

    // Each contributor should have a unique, properly formatted @id
    const ids = contributorEntities.map((entity: any) => entity["@id"]);
    expect(new Set(ids).size).toBe(3); // All IDs should be unique

    for (const entity of contributorEntities) {
      expect(entity["@id"]).toMatch(/^#/); // Should start with #
      expect(entity["@id"]).not.toContain(" "); // Should not contain spaces
      expect(entity.description).toContain("could not find a matching Person");
    }
  });
});
