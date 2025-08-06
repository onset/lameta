import { describe, it, expect } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import path from "path";
import fs from "fs-extra";

describe("RoCrateExporter Problem 3 - Location Fields Broader Test", () => {
  it("should check all sessions and places for location field handling", async () => {
    const doondoProjectPath =
      "c:\\dev\\lameta projects\\SayMore Data from Brian Parker\\Doondo";

    // Skip test if Doondo project doesn't exist
    const projectFile = path.join(doondoProjectPath, "Doondo.sprj");
    if (!fs.existsSync(projectFile)) {
      console.log("Skipping test - Doondo project not found");
      return;
    }

    const project = Project.fromDirectory(doondoProjectPath);
    if (project.loadingError) {
      throw new Error(`Failed to load Doondo project: ${project.loadingError}`);
    }

    // Generate RO-Crate for the project
    const roCrateData = await getRoCrate(project, project);
    const roCrateJson =
      typeof roCrateData === "string"
        ? roCrateData
        : JSON.stringify(roCrateData, null, 2);
    const roCrate = JSON.parse(roCrateJson);

    console.log(`Total entities in RO-Crate: ${roCrate["@graph"].length}`);

    // Count entities with problematic location properties
    const entitiesWithBadLocationProps = roCrate["@graph"].filter(
      (entity: any) =>
        entity.locationRegion ||
        entity.locationCountry ||
        entity.locationContinent
    );

    console.log(
      `Entities with problematic location properties: ${entitiesWithBadLocationProps.length}`
    );
    if (entitiesWithBadLocationProps.length > 0) {
      console.log(
        "Examples:",
        entitiesWithBadLocationProps.slice(0, 3).map((e) => ({
          id: e["@id"],
          type: e["@type"],
          locationRegion: e.locationRegion,
          locationCountry: e.locationCountry,
          locationContinent: e.locationContinent
        }))
      );
    }

    // Count Place entities
    const placeEntities = roCrate["@graph"].filter(
      (entity: any) => entity["@type"] === "Place"
    );
    console.log(`Total Place entities: ${placeEntities.length}`);

    // Count Place entities with descriptions
    const placeEntitiesWithDescriptions = placeEntities.filter(
      (entity: any) => entity.description
    );
    console.log(
      `Place entities with descriptions: ${placeEntitiesWithDescriptions.length}`
    );

    if (placeEntitiesWithDescriptions.length > 0) {
      console.log("Examples of Place entities with descriptions:");
      placeEntitiesWithDescriptions.slice(0, 3).forEach((place) => {
        console.log(`- ${place.name}: ${place.description}`);
      });
    }

    // Count session entities
    const sessionEntities = roCrate["@graph"].filter((entity: any) =>
      entity["@id"]?.includes("Sessions/")
    );
    console.log(`Total Session entities: ${sessionEntities.length}`);

    // Count session entities with location references
    const sessionEntitiesWithLocation = sessionEntities.filter(
      (entity: any) => entity.location
    );
    console.log(
      `Session entities with location references: ${sessionEntitiesWithLocation.length}`
    );

    // The main assertion: NO entities should have the problematic location properties
    expect(entitiesWithBadLocationProps).toHaveLength(0);
    console.log(
      "✅ No entities have locationRegion, locationCountry, or locationContinent properties"
    );
  });
});
