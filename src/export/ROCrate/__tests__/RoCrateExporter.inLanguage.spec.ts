import { describe, it, expect } from "vitest";
import {
  setupCommonMocks,
  setupExporterMocks,
  createMockProject,
  createMockSession,
  createFsExtraMock
} from "./test-utils/rocrate-test-setup";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

// Setup all common mocks before imports
setupCommonMocks();
setupExporterMocks();
createFsExtraMock();

// Import main functionality after mocks
import { getRoCrate } from "../RoCrateExporter";

describe("RoCrateExporter inLanguage LDAC compliance", () => {
  it("should export inLanguage as an object reference", async () => {
    // Create a mock session with workingLanguages field set to a language code (this maps to inLanguage in export)
    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: {
        title: "Test Session",
        workingLanguages: "etr" // This should map to inLanguage in the RO-Crate export
      }
    });

    const mockProject = createMockProject({
      filePrefix: "test-project",
      metadata: {
        title: "Test Project"
      }
    });

    // Add sessions to the project (the mock returns sessions as array, but exporter expects sessions.items)
    (mockProject as any).sessions = {
      items: [mockSession]
    };

    // Generate RO-Crate
    const roCrateData = await getRoCrate(mockProject, mockProject);
    const roCrateJson =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find the session entity in the graph
    const sessionEntity = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === "Sessions/test-session/"
    );

    expect(sessionEntity).toBeDefined();
    console.log("Session entity:", JSON.stringify(sessionEntity, null, 2));

    // There is some ambiguity in the LDAC profile regarding inLanguage. We have seen a claim that
    // it should be a string, but our Paradisec example use an object reference, so we are
    // going to take that as the correct approach. inLanguage should be an entity.

    // It should be an object reference
    expect(typeof sessionEntity.inLanguage).toBe("object");
    expect(sessionEntity.inLanguage).toHaveProperty("@id");
  });

  it("should export inLanguage with 'und' fallback when workingLanguages is missing", async () => {
    // Create a mock session WITHOUT workingLanguages field
    const mockSession = createMockSession({
      filePrefix: "test-session-no-lang",
      metadata: {
        title: "Test Session Without Language",
        description: "A session with no working language specified"
      }
    });

    const mockProject = createMockProject({
      filePrefix: "test-project",
      metadata: {
        title: "Test Project"
      }
    });

    // Add sessions to the project
    (mockProject as any).sessions = {
      items: [mockSession]
    };

    // Generate RO-Crate
    const roCrateData = await getRoCrate(mockProject, mockProject);
    const roCrateJson =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find the session entity in the graph
    const sessionEntity = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === "Sessions/test-session-no-lang/"
    );

    expect(sessionEntity).toBeDefined();

    // inLanguage should be set to "und" (undetermined) when workingLanguages is missing
    expect(sessionEntity.inLanguage).toBeDefined();
    expect(typeof sessionEntity.inLanguage).toBe("object");
    expect(sessionEntity.inLanguage).toHaveProperty("@id");
    expect(sessionEntity.inLanguage["@id"]).toBe("#language_und");

    // Verify that the "und" language entity exists in the graph
    const undLanguageEntity = roCrateJson["@graph"].find(
      (entity: any) => entity["@id"] === "#language_und"
    );

    expect(undLanguageEntity).toBeDefined();
    expect(undLanguageEntity["@type"]).toBe("Language");
    expect(undLanguageEntity.code).toBe("und");
    expect(undLanguageEntity.name).toBe("Undetermined");
  });
});
