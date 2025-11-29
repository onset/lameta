import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";

describe("RoCrateExporter Project Geographic Coverage", () => {
  let mockProject: Project;

  beforeEach(() => {
    mockProject = {
      filePrefix: "test-project",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi
          .fn()
          .mockImplementation((key: string, defaultValue?: string) => {
            if (key === "title") return "Test Project";
            if (key === "country") return "Vanuatu";
            if (key === "continent") return "Oceania";
            return defaultValue || "";
          }),
        properties: {
          forEach: vi.fn(),
          getHasValue: vi.fn().mockReturnValue(false)
        }
      },
      sessions: {
        items: []
      },
      files: [],
      descriptionFolder: null,
      otherDocsFolder: null
    } as any;
  });

  it("should use contentLocation with Place entities instead of raw country/continent properties", async () => {
    // Generate RO-Crate metadata
    const roCrateData = await getRoCrate(mockProject, mockProject);
    const roCrateJson =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find the root dataset entry
    const rootDataset = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === "./"
    );

    expect(rootDataset).toBeDefined();

    // Verify that raw country/continent properties are NOT present
    expect(rootDataset.country).toBeUndefined();
    expect(rootDataset.continent).toBeUndefined();

    // Verify that contentLocation is present
    expect(rootDataset.contentLocation).toBeDefined();
    expect(Array.isArray(rootDataset.contentLocation)).toBe(true);
    expect(rootDataset.contentLocation.length).toBeGreaterThan(0);

    // Verify ALL contentLocation references point to valid Place entities
    rootDataset.contentLocation.forEach((locationRef: { "@id": string }) => {
      // Verify reference uses proper JSON-LD format
      expect(locationRef).toHaveProperty("@id");
      expect(Object.keys(locationRef)).toHaveLength(1); // Should only have @id

      // Find and validate the referenced Place entity
      const entity = roCrateJson["@graph"].find(
        (e: any) => e["@id"] === locationRef["@id"]
      );
      expect(entity).toBeDefined();
      expect(entity["@type"]).toBe("Place");
      expect(entity.name).toBeDefined();
    });

    // Find the first Place entity referenced by contentLocation
    const placeId = rootDataset.contentLocation[0]["@id"];
    expect(placeId).toBeDefined();

    const placeEntity = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === placeId
    );

    expect(placeEntity).toBeDefined();
    expect(placeEntity["@type"]).toBe("Place");
    expect(placeEntity.name).toBe("Vanuatu");
    expect(placeEntity.description).toContain("Oceania");
  });

  it("should create Place entity for country only when continent is not provided", async () => {
    // Create a mock project with only country field
    const projectWithCountry = {
      ...mockProject,
      metadataFile: {
        getTextProperty: vi
          .fn()
          .mockImplementation((key: string, defaultValue?: string) => {
            if (key === "title") return "Test Project";
            if (key === "country") return "France";
            if (key === "continent") return "";
            return defaultValue || "";
          }),
        properties: {
          forEach: vi.fn(),
          getHasValue: vi.fn().mockReturnValue(false)
        }
      }
    } as any;

    // Generate RO-Crate metadata
    const roCrateData = await getRoCrate(
      projectWithCountry,
      projectWithCountry
    );
    const roCrateJson =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find the root dataset entry
    const rootDataset = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === "./"
    );

    expect(rootDataset).toBeDefined();
    expect(rootDataset.country).toBeUndefined();
    expect(rootDataset.contentLocation).toBeDefined();

    const placeId = rootDataset.contentLocation[0]["@id"];
    const placeEntity = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === placeId
    );

    expect(placeEntity).toBeDefined();
    expect(placeEntity["@type"]).toBe("Place");
    expect(placeEntity.name).toBe("France");
    expect(placeEntity.description).toBeUndefined(); // No continent info to add
  });

  it("should create Place entity for continent only when country is not provided", async () => {
    // Create a mock project with only continent field
    const projectWithContinent = {
      ...mockProject,
      metadataFile: {
        getTextProperty: vi
          .fn()
          .mockImplementation((key: string, defaultValue?: string) => {
            if (key === "title") return "Test Project";
            if (key === "country") return "";
            if (key === "continent") return "Asia";
            return defaultValue || "";
          }),
        properties: {
          forEach: vi.fn(),
          getHasValue: vi.fn().mockReturnValue(false)
        }
      }
    } as any;

    // Generate RO-Crate metadata
    const roCrateData = await getRoCrate(
      projectWithContinent,
      projectWithContinent
    );
    const roCrateJson =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find the root dataset entry
    const rootDataset = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === "./"
    );

    expect(rootDataset).toBeDefined();
    expect(rootDataset.continent).toBeUndefined();
    expect(rootDataset.contentLocation).toBeDefined();

    const placeId = rootDataset.contentLocation[0]["@id"];
    const placeEntity = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === placeId
    );

    expect(placeEntity).toBeDefined();
    expect(placeEntity["@type"]).toBe("Place");
    expect(placeEntity.name).toBe("Asia");
  });

  it("should not create contentLocation when neither country nor continent is provided", async () => {
    // Create a mock project with neither field
    const projectWithoutLocation = {
      ...mockProject,
      metadataFile: {
        getTextProperty: vi
          .fn()
          .mockImplementation((key: string, defaultValue?: string) => {
            if (key === "title") return "Test Project";
            if (key === "country") return "";
            if (key === "continent") return "";
            return defaultValue || "";
          }),
        properties: {
          forEach: vi.fn(),
          getHasValue: vi.fn().mockReturnValue(false)
        }
      }
    } as any;

    // Generate RO-Crate metadata
    const roCrateData = await getRoCrate(
      projectWithoutLocation,
      projectWithoutLocation
    );
    const roCrateJson =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find the root dataset entry
    const rootDataset = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === "./"
    );

    expect(rootDataset).toBeDefined();
    expect(rootDataset.country).toBeUndefined();
    expect(rootDataset.continent).toBeUndefined();
    expect(rootDataset.contentLocation).toBeUndefined();
  });
});
