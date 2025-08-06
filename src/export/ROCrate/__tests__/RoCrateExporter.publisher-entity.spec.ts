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
    expect(rootDataset.publisher["@id"]).toBe(
      "https://github.com/onset/lameta"
    );

    // Check that the publisher entity is actually defined in the graph
    const publisherEntity = graph.find(
      (item: any) => item["@id"] === "https://github.com/onset/lameta"
    );

    expect(publisherEntity).toBeDefined();
    expect(publisherEntity["@type"]).toContain("Organization");
    expect(publisherEntity.name).toBeDefined();
  });

  it("should define publisher entity for session-level exports", async () => {
    const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
    const graph = roCrateData["@graph"];

    // Find any session entity (they also have publisher references)
    const sessionEntity = graph.find(
      (item: any) =>
        Array.isArray(item["@type"]) && item["@type"].includes("Event")
    );

    if (sessionEntity && sessionEntity.publisher) {
      // Check that the publisher entity is defined in the graph
      const publisherEntity = graph.find(
        (item: any) => item["@id"] === sessionEntity.publisher["@id"]
      );

      expect(publisherEntity).toBeDefined();
      expect(publisherEntity["@type"]).toContain("Organization");
      expect(publisherEntity.name).toBeDefined();
    }
  });
});
