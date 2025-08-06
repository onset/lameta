import { describe, it, expect } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import path from "path";
import fs from "fs-extra";

describe.skipIf(!process.env.ENABLE_EXPENSIVE_TESTS)(
  "RoCrateExporter inLanguage Doondo validation",
  () => {
    it("should have inLanguage as string values, not object references (actual Doondo project)", async () => {
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

      // Find session entities with inLanguage property
      const sessionEntitiesWithInLanguage = roCrateJson["@graph"].filter(
        (entity: any) =>
          entity["@id"]?.startsWith("Sessions/") &&
          entity["@type"]?.includes("Event") &&
          entity.inLanguage !== undefined
      );

      console.log(
        `Found ${sessionEntitiesWithInLanguage.length} session entities with inLanguage property`
      );

      if (sessionEntitiesWithInLanguage.length > 0) {
        console.log(
          "Sample session with inLanguage:",
          JSON.stringify(sessionEntitiesWithInLanguage[0], null, 2)
        );

        // Check that inLanguage values are strings, not object references
        sessionEntitiesWithInLanguage.forEach(
          (sessionEntity: any, index: number) => {
            expect(
              typeof sessionEntity.inLanguage,
              `Session ${
                sessionEntity["@id"]
              } inLanguage should be string, got: ${JSON.stringify(
                sessionEntity.inLanguage
              )}`
            ).toBe("string");

            expect(
              sessionEntity.inLanguage,
              `Session ${sessionEntity["@id"]} inLanguage should not be an object with @id`
            ).not.toHaveProperty("@id");
          }
        );
      } else {
        console.log(
          "No session entities found with inLanguage property - this might be expected if using ldac:subjectLanguage instead"
        );

        // Check if sessions have ldac:subjectLanguage instead
        const sessionEntitiesWithSubjectLang = roCrateJson["@graph"].filter(
          (entity: any) =>
            entity["@id"]?.startsWith("Sessions/") &&
            entity["@type"]?.includes("Event") &&
            entity["ldac:subjectLanguage"] !== undefined
        );

        console.log(
          `Found ${sessionEntitiesWithSubjectLang.length} session entities with ldac:subjectLanguage property`
        );
        if (sessionEntitiesWithSubjectLang.length > 0) {
          console.log(
            "Sample session with ldac:subjectLanguage:",
            JSON.stringify(sessionEntitiesWithSubjectLang[0], null, 2)
          );
        }
      }
    }, 180000); // 3 minutes timeout
  }
);
