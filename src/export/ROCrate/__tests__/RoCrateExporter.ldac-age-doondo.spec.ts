import { describe, it, expect } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import path from "path";
import fs from "fs-extra";

describe.skipIf(!process.env.ENABLE_EXPENSIVE_TESTS)(
  "RoCrateExporter ldac:age Doondo validation",
  () => {
    it("should have ldac:age as integer values, not strings (actual Doondo project)", async () => {
      const doondoProjectPath =
        "c:\\dev\\lameta projects\\SayMore Data from Brian Parker\\Doondo";
      const projectFile = path.join(doondoProjectPath, "Doondo.sprj");

      if (!fs.existsSync(projectFile)) {
        console.log(
          `Skipping test - Doondo project not found at ${projectFile}`
        );
        return;
      }

      console.log(`Loading project from: ${doondoProjectPath}`);
      const project = Project.fromDirectory(doondoProjectPath);

      if (project.loadingError) {
        throw new Error(
          `Failed to load Doondo project: ${project.loadingError}`
        );
      }

      console.log(`Project has ${project.sessions.items.length} sessions`);

      // Generate RO-Crate metadata for the entire project
      const roCrateData = await getRoCrate(project, project);
      const roCrateJson =
        typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

      // Find person entities with ldac:age property
      const personEntitiesWithAge = roCrateJson["@graph"].filter(
        (entity: any) =>
          entity["@type"]?.includes("Person") &&
          entity["ldac:age"] !== undefined
      );

      console.log(
        `Found ${personEntitiesWithAge.length} person entities with ldac:age property`
      );

      if (personEntitiesWithAge.length > 0) {
        console.log(
          "Sample person with ldac:age:",
          JSON.stringify(personEntitiesWithAge[0], null, 2)
        );

        // Check that ldac:age values are numbers (integers), not strings
        const problemAges: string[] = [];
        personEntitiesWithAge.forEach((personEntity: any) => {
          const age = personEntity["ldac:age"];
          if (typeof age === "string") {
            problemAges.push(
              `${personEntity["@id"]}: ldac:age is string "${age}" instead of number`
            );
          } else if (typeof age !== "number") {
            problemAges.push(
              `${
                personEntity["@id"]
              }: ldac:age is ${typeof age} instead of number`
            );
          }
        });

        if (problemAges.length > 0) {
          console.log("Problems found:");
          problemAges.forEach((problem) => console.log(`  - ${problem}`));
          expect.fail(
            `Found ${
              problemAges.length
            } persons with non-integer ldac:age values:\n${problemAges.join(
              "\n"
            )}`
          );
        } else {
          console.log("✅ All ldac:age values are properly typed as numbers");
        }
      } else {
        console.log("No person entities found with ldac:age property");
      }
    }, 180000); // 3 minutes timeout
  }
);
