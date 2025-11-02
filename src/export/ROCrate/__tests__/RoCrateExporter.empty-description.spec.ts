import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import {
  createMockProject,
  createMockSession
} from "./test-utils/rocrate-test-setup";

describe("RoCrateExporter Empty Description", () => {
  let mockProject: Project;

  beforeEach(() => {
    mockProject = createMockProject({
      metadata: {
        title: "Test Project",
        collectionDescription: "" // Empty description field exists but is empty
      }
    });
  });

  it("should use default description when collectionDescription is empty string", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // Find the root dataset
    const rootDataset = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    expect(rootDataset).toBeDefined();
    expect(rootDataset.description).toBe(
      "No description provided for this project."
    );
    expect(rootDataset.description).not.toBe("");
  });

  it("should use default description when collectionDescription is only whitespace", async () => {
    // Override with whitespace-only description
    (mockProject.metadataFile as any).getTextProperty = vi
      .fn()
      .mockImplementation((key: string, defaultValue: string = "") => {
        if (key === "title") return "Test Project";
        if (key === "collectionDescription") return "   "; // whitespace only
        return defaultValue;
      });

    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // Find the root dataset
    const rootDataset = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    expect(rootDataset).toBeDefined();
    expect(rootDataset.description).toBe(
      "No description provided for this project."
    );
    expect(rootDataset.description).not.toBe("   ");
  });

  it("should use actual description when collectionDescription has content", async () => {
    // Override with actual content
    (mockProject.metadataFile as any).getTextProperty = vi
      .fn()
      .mockImplementation((key: string, defaultValue: string = "") => {
        if (key === "title") return "Test Project";
        if (key === "collectionDescription")
          return "This is a real project description";
        return defaultValue;
      });

    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // Find the root dataset
    const rootDataset = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    expect(rootDataset).toBeDefined();
    expect(rootDataset.description).toBe("This is a real project description");
  });
});
