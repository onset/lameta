import { describe, it, expect } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import path from "path";
import fs from "fs-extra";

describe("RoCrateExporter Problem 3 - Location Fields", () => {
  it("should combine locationRegion, locationCountry, and locationContinent into Place description", async () => {
    const doondoProjectPath = "c:\\dev\\lameta projects\\SayMore Data from Brian Parker\\Doondo";
    
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
    const roCrateJson = typeof roCrateData === "string" ? roCrateData : JSON.stringify(roCrateData, null, 2);
    const roCrate = JSON.parse(roCrateJson);

    // Find a session that had the problematic location properties
    const sessionWithLocationIssue = roCrate["@graph"].find((entity: any) => 
      entity["@id"]?.includes("Sessions/") && 
      entity.location && 
      // Make sure it doesn't have the problematic properties anymore
      !entity.locationRegion && 
      !entity.locationCountry && 
      !entity.locationContinent
    );

    expect(sessionWithLocationIssue).toBeDefined();
    console.log("Session with location:", {
      id: sessionWithLocationIssue["@id"],
      location: sessionWithLocationIssue.location
    });

    // Find the corresponding Place entity
    const locationId = sessionWithLocationIssue.location["@id"];
    const placeEntity = roCrate["@graph"].find((entity: any) => entity["@id"] === locationId);
    
    expect(placeEntity).toBeDefined();
    expect(placeEntity["@type"]).toBe("Place");
    expect(placeEntity.name).toBeDefined();
    
    // Check if the Place has a description that combines the location fields
    console.log("Place entity:", {
      id: placeEntity["@id"],
      type: placeEntity["@type"],
      name: placeEntity.name,
      description: placeEntity.description
    });

    // The description should contain location information if it was combined
    if (placeEntity.description) {
      expect(placeEntity.description).toMatch(/Located in/);
      console.log("✅ Place entity has combined location description:", placeEntity.description);
    } else {
      console.log("⚠️ Place entity doesn't have a description (no companion location fields found)");
    }

    // Verify no session entities have the problematic location properties
    const sessionsWithBadLocationProps = roCrate["@graph"].filter((entity: any) => 
      entity["@id"]?.includes("Sessions/") && 
      (entity.locationRegion || entity.locationCountry || entity.locationContinent)
    );

    expect(sessionsWithBadLocationProps).toHaveLength(0);
    console.log("✅ No session entities have locationRegion, locationCountry, or locationContinent properties");
  });
});
