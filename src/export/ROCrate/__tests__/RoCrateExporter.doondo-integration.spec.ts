import { vi, describe, it, beforeAll, expect } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import path from "path";
import fs from "fs-extra";

describe("RoCrateExporter Doondo Project Integration", () => {
  let project: Project;
  const doondoProjectPath =
    "c:\\dev\\lameta projects\\SayMore Data from Brian Parker\\Doondo";

  beforeAll(() => {
    // Check if the Doondo project exists
    const projectFile = path.join(doondoProjectPath, "Doondo.sprj");
    if (!fs.existsSync(projectFile)) {
      throw new Error(`Doondo project not found at ${projectFile}`);
    }

    // Load the real Doondo project
    project = Project.fromDirectory(doondoProjectPath);

    if (project.loadingError) {
      throw new Error(`Failed to load Doondo project: ${project.loadingError}`);
    }
  });

  it("should not have any raw license values in session files", async () => {
    console.log(`Loading project from: ${doondoProjectPath}`);
    console.log(`Project has ${project.sessions.items.length} sessions`);

    // Generate RO-Crate metadata for the entire project
    const roCrateData = await getRoCrate(project, project);

    // Parse the JSON if it's a string
    const metadata =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find all license references in the @graph
    const allLicenseReferences: any[] = [];

    metadata["@graph"].forEach((item: any) => {
      if (item.license && item.license["@id"]) {
        allLicenseReferences.push({
          entityId: item["@id"],
          licenseId: item.license["@id"],
          entityType: item["@type"]
        });
      }
    });

    console.log(`Found ${allLicenseReferences.length} license references:`);
    allLicenseReferences.forEach((ref) => {
      console.log(`  Entity: ${ref.entityId} -> License: ${ref.licenseId}`);
    });

    // Check for any raw license values (not normalized)
    const rawLicenseReferences = allLicenseReferences.filter(
      (ref) =>
        !ref.licenseId.startsWith("#") &&
        !ref.licenseId.startsWith("http") &&
        ref.licenseId !== "CC0" // CC0 is also valid
    );

    if (rawLicenseReferences.length > 0) {
      console.error("Found raw license values that should be normalized:");
      rawLicenseReferences.forEach((ref) => {
        console.error(
          `  PROBLEM: Entity ${ref.entityId} has raw license: "${ref.licenseId}"`
        );
      });
    }

    // The test should fail if any raw license values are found
    expect(rawLicenseReferences).toHaveLength(0);

    // Also check specifically for the "Strategic partners" issue
    const strategicPartnersRefs = allLicenseReferences.filter(
      (ref) => ref.licenseId === "Strategic partners"
    );

    expect(strategicPartnersRefs).toHaveLength(0);

    // All license references should be properly normalized (start with # or be a URL)
    allLicenseReferences.forEach((ref) => {
      expect(
        ref.licenseId.startsWith("#") ||
          ref.licenseId.startsWith("http") ||
          ref.licenseId === "CC0"
      ).toBe(true);
    });
  });

  it("should have normalized license IDs for all entities", async () => {
    const roCrateData = await getRoCrate(project, project);
    const metadata =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find any session files specifically
    const sessionFiles = metadata["@graph"].filter(
      (item: any) =>
        item["@id"] && item["@id"].includes(".session") && item.license
    );

    console.log(`Found ${sessionFiles.length} session files with licenses`);

    sessionFiles.forEach((sessionFile: any) => {
      console.log(
        `Session file: ${sessionFile["@id"]} -> License: ${sessionFile.license["@id"]}`
      );

      // Each session file should have a normalized license ID
      expect(sessionFile.license["@id"]).toMatch(/^#license-/);
    });
  });

  it("should have consistently URI-encoded @id values", async () => {
    const roCrateData = await getRoCrate(project, project);
    const metadata =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // we have a path to a file, "dde-bakala(BZV)1-ori\dde-bakala(BZV)1-ori.session".
    // ensure that the @id for this has been encoded properly so that we get
    // dde-bakala%28BZV%291-ori/dde-bakala%28BZV%291-ori.session

    // Find the specific dde-bakala(BZV)1-ori.session file
    const ddeBakalaFile = metadata["@graph"].find(
      (item: any) =>
        item["@id"] &&
        item["@id"].includes("dde-bakala") &&
        item["@id"].includes("BZV") &&
        item["@id"].includes(".session")
    );

    expect(ddeBakalaFile).toBeTruthy();

    console.log(`Found dde-bakala file with @id: ${ddeBakalaFile["@id"]}`);

    // Check that the @id is exactly: Sessions/dde-bakala%28BZV%291-ori/dde-bakala%28BZV%291-ori.session
    expect(ddeBakalaFile["@id"]).toBe(
      "Sessions/dde-bakala%28BZV%291-ori/dde-bakala%28BZV%291-ori.session"
    );
  });
});
