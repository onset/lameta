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

describe("RoCrateExporter ldac:age LDAC compliance", () => {
  it("should export ldac:age a string", async () => {
    // Mock the person's ageOn method to return a string (as it normally does)
    const mockPerson = createMockPerson({
      filePrefix: "test-person",
      metadata: {
        name: "Test Person",
        birthYear: "1995"
      }
    });

    // Add the ageOn method that returns a string
    (mockPerson as any).ageOn = vi.fn().mockReturnValue("28");

    // Create a mock session with a date so we can calculate age
    const mockSession = createMockSession({
      filePrefix: "test-session",
      metadata: {
        title: "Test Session",
        date: "2023-01-01"
      }
    });

    const mockProject = createMockProject({
      filePrefix: "test-project",
      metadata: {
        title: "Test Project"
      }
    });

    // Add sessions and people to the project
    (mockProject as any).sessions = {
      items: [mockSession]
    };

    // Call getRoCrate with the person directly (this is how people are exported)
    const roCrateData = await getRoCrate(mockProject, mockPerson);
    const roCrateJson =
      typeof roCrateData === "string" ? JSON.parse(roCrateData) : roCrateData;

    // Find the person entity in the graph
    const personEntity = roCrateJson["@graph"].find(
      (entity: any) => entity["@type"] === "Person"
    );

    expect(personEntity).toBeDefined();
    console.log("Person entity:", JSON.stringify(personEntity, null, 2));

    expect(typeof personEntity["ldac:age"]).toBe("string");
  });
});
