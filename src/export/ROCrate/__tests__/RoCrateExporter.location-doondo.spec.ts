import { describe, it, expect } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import path from "path";
import fs from "fs-extra";

describe.skipIf(!process.env.ENABLE_EXPENSIVE_TESTS)(
  "RoCrateExporter location properties Doondo validation", 
  () => {
    it("should not use non-standard location properties like locationRegion, locationCountry, locationContinent", async () => {
      const doondoProjectPath = "c:\\dev\\lameta projects\\SayMore Data from Brian Parker\\Doondo";
      const projectFile = path.join(doondoProjectPath, "Doondo.sprj");
      
      if (!fs.existsSync(projectFile)) {
        console.log(`Skipping test - Doondo project not found at ${projectFile}`);
        return;
      }

      console.log(`Loading project from: ${doondoProjectPath}`);
      const project = Project.fromDirectory(doondoProjectPath);

      if (project.loadingError) {
        throw new Error(`Failed to load Doondo project: ${project.loadingError}`);
      }

      console.log(`Project has ${project.sessions.items.length} sessions`);

      // Generate RO-Crate metadata for the entire project  
      const roCrateData = await getRoCrate(project, project);
      const roCrateJson = typeof roCrateData === "string" 
        ? JSON.parse(roCrateData) 
        : roCrateData;

      // Find entities with problematic location properties
      const entitiesWithBadLocationProps = roCrateJson["@graph"].filter((entity: any) => 
        entity.locationRegion !== undefined ||
        entity.locationCountry !== undefined ||
        entity.locationContinent !== undefined
      );

      console.log(`Found ${entitiesWithBadLocationProps.length} entities with non-standard location properties`);

      if (entitiesWithBadLocationProps.length > 0) {
        console.log("Sample entity with problematic location properties:", JSON.stringify(entitiesWithBadLocationProps[0], null, 2));
        
        const problemProps: string[] = [];
        entitiesWithBadLocationProps.forEach((entity: any) => {
          if (entity.locationRegion) problemProps.push(`${entity["@id"]}: has locationRegion "${entity.locationRegion}"`);
          if (entity.locationCountry) problemProps.push(`${entity["@id"]}: has locationCountry "${entity.locationCountry}"`);
          if (entity.locationContinent) problemProps.push(`${entity["@id"]}: has locationContinent "${entity.locationContinent}"`);
        });
        
        console.log("Problems found:");
        problemProps.slice(0, 10).forEach(problem => console.log(`  - ${problem}`));
        if (problemProps.length > 10) {
          console.log(`  ... and ${problemProps.length - 10} more`);
        }
        
        expect.fail(`Found ${entitiesWithBadLocationProps.length} entities with non-standard location properties. These should use 'location' property linking to Place entities instead.`);
      } else {
        console.log("✅ No entities found using non-standard location properties");
      }
    }, 180000); // 3 minutes timeout
  }
);
