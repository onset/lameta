import { describe, it, expect, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import {
  setupCommonMocks,
  setupExporterMocks,
  createMockProject,
  createMockSession,
  createFsExtraMock
} from "./test-utils/rocrate-test-setup";

// Setup all common mocks before imports
setupCommonMocks();
setupExporterMocks();
createFsExtraMock();

describe("RoCrateExporter Publisher Entity", () => {
  const mockProject = createMockProject({
    metadata: {
      title: "Test Project",
      collectionDescription: "A test project"
    }
  });

  // Add sessions property to avoid the error
  (mockProject as any).sessions = { items: [] };

  const mockSession = createMockSession({
    metadata: {
      title: "Test Session"
    }
  });

  it("should include the publisher as a defined Organization entity in the graph", async () => {
    const roCrateData = (await getRoCrate(mockProject, mockProject)) as any;
    const graph = roCrateData["@graph"];

    // Find the root dataset
    const rootDataset = graph.find((item: any) => item["@id"] === "./");
    expect(rootDataset).toBeDefined();

    // Check that publisher is referenced
    expect(rootDataset.publisher).toBeDefined();
    // LAM-35 regression guard: publisher must resolve to the archive configuration entity
    // rather than the lameta GitHub project. https://linear.app/lameta/issue/LAM-35/ro-crate-4-publisher-metadata
    expect(rootDataset.publisher["@id"]).toBe("#publisher-lameta");

    // Check that the publisher entity is actually defined in the graph
    const publisherEntity = graph.find(
      (item: any) => item["@id"] === "#publisher-lameta"
    );

    expect(publisherEntity).toBeDefined();
    expect(publisherEntity["@type"]).toContain("Organization");
    expect(publisherEntity.name).toBe("lameta");
  });

  it("should define publisher entity for session-level exports", async () => {
    const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
    const graph = roCrateData["@graph"];

    // Find any session entity (they also have publisher references)
    const sessionEntity = graph.find(
      (item: any) =>
        Array.isArray(item["@type"]) &&
        item["@type"].includes("CollectionEvent")
    );

    if (sessionEntity && sessionEntity.publisher) {
      // LAM-35: session entities should re-use the archive publisher node
      // rather than introducing per-session GitHub placeholders.
      expect(sessionEntity.publisher["@id"]).toBe("#publisher-lameta");

      const publisherEntity = graph.find(
        (item: any) => item["@id"] === sessionEntity.publisher["@id"]
      );

      expect(publisherEntity).toBeDefined();
      expect(publisherEntity["@type"]).toContain("Organization");
      expect(publisherEntity.name).toBe("lameta");
    }
  });
});
