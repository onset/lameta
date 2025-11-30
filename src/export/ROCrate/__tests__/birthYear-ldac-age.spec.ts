import { describe, it, expect, vi } from "vitest";
import {
  setupCommonMocks,
  setupExporterMocks,
  createMockProject,
  createMockSession,
  createMockPerson,
  createFsExtraMock
} from "./test-utils/rocrate-test-setup";

// Setup all common mocks before imports
setupCommonMocks();
setupExporterMocks();
createFsExtraMock();

// Import main functionality after mocks
import { getRoCrate } from "../RoCrateExporter";

describe("ldac:age with different birthYear casing", () => {
  it("should export ldac:age for both lowercase <birthYear> and PascalCase <BirthYear>", async () => {
    // Create two mock persons - one with lowercase birthYear (like Awi), one with PascalCase (like Ilawi)

    // This simulates Awi's file which has <birthYear>1972</birthYear>
    const mockPersonAwiStyle = createMockPerson({
      filePrefix: "Awi_Heole",
      metadata: {
        name: "Awi Heole",
        birthYear: "1972", // lowercase key style
        gender: "Male"
      }
    });
    (mockPersonAwiStyle as any).ageOn = vi.fn().mockReturnValue("38");

    // Debug: Check what getTextProperty returns for birthYear
    console.log(
      "Awi birthYear from getTextProperty:",
      mockPersonAwiStyle.metadataFile?.getTextProperty("birthYear")
    );
    console.log(
      "Awi birthYear from metadataFile (direct):",
      (mockPersonAwiStyle as any).metadataFile
    );

    // This simulates Ilawi's file which has <BirthYear>1960</BirthYear>
    const mockPersonIlawiStyle = createMockPerson({
      filePrefix: "Ilawi_Amosa",
      metadata: {
        name: "Ilawi Amosa",
        birthYear: "1960", // Note: after loading, both should be stored under 'birthYear' key
        gender: "Male"
      }
    });
    (mockPersonIlawiStyle as any).ageOn = vi.fn().mockReturnValue("50");

    // Create a mock session with date 2010-06-06 and both people as contributors
    const mockSession = createMockSession({
      filePrefix: "ETR009",
      metadata: {
        title: "Test Session",
        date: "2010-06-06"
      }
    });

    // CRITICAL: Add properties.getDateField so session date can be retrieved
    (mockSession as any).properties = {
      getDateField: vi.fn().mockImplementation((key: string) => {
        if (key === "date") {
          return {
            asDate: () => new Date("2010-06-06")
          };
        }
        return undefined;
      })
    };

    // Add contributions for both people
    (mockSession as any).getAllContributionsToAllFiles = vi
      .fn()
      .mockReturnValue([
        { personReference: "Awi Heole", role: "participant" },
        { personReference: "Ilawi Amosa", role: "participant" }
      ]);

    const mockProject = createMockProject({
      filePrefix: "test-project",
      metadata: {
        title: "Test Project"
      }
    });

    // Setup project with sessions and findPerson
    (mockProject as any).sessions = {
      items: [mockSession]
    };

    (mockProject as any).findPerson = vi
      .fn()
      .mockImplementation((name: string) => {
        if (name === "Awi Heole") return mockPersonAwiStyle;
        if (name === "Ilawi Amosa") return mockPersonIlawiStyle;
        return undefined;
      });

    // Export the project
    const roCrateData = await getRoCrate(mockProject, mockProject);
    const roCrateJson =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find both person entities
    const awiEntity = roCrateJson["@graph"].find(
      (entity: any) =>
        entity["@type"] === "Person" && entity.name === "Awi Heole"
    );
    const ilawiEntity = roCrateJson["@graph"].find(
      (entity: any) =>
        entity["@type"] === "Person" && entity.name === "Ilawi Amosa"
    );

    console.log("Awi entity:", JSON.stringify(awiEntity, null, 2));
    console.log("Ilawi entity:", JSON.stringify(ilawiEntity, null, 2));

    // Both should be defined
    expect(awiEntity).toBeDefined();
    expect(ilawiEntity).toBeDefined();

    // CRITICAL: Both should have ldac:age
    expect(awiEntity["ldac:age"]).toBe("38");
    expect(ilawiEntity["ldac:age"]).toBe("50");
  });
});
