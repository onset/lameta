import { vi, describe, it, beforeEach, expect } from "vitest";
import { getRoCrate } from "./RoCrateExporter";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { fieldDefinitionsOfCurrentConfig } from "../model/field/ConfiguredFieldDefinitions";

describe("RoCrateExporter Session-Specific Licensing Demo", () => {
  let mockProject: Project;
  let mockSession1: Session;
  let mockSession2: Session;

  beforeEach(() => {
    // Mock the field definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      []
    );
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "common", "get").mockReturnValue(
      []
    );

    // Mock project
    mockProject = {
      filePrefix: "demo-project",
      authorityLists: {
        accessChoicesOfCurrentProtocol: [
          {
            id: "public",
            label: "public",
            description: "Open access",
            ldacAccessCategory: "ldac:OpenAccess"
          },
          {
            id: "restricted",
            label: "restricted",
            description: "Restricted access",
            ldacAccessCategory: "ldac:AuthorizedAccess"
          }
        ]
      },
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "archiveConfigurationName") return "DemoArchive";
          if (key === "title") return "Demo Project with Multiple Sessions";
          if (key === "description")
            return "A project demonstrating session-specific licensing";
          return "";
        }),
        properties: {
          forEach: vi.fn()
        }
      },
      knownFields: [],
      files: [],
      sessions: { items: [] },
      findPerson: vi.fn()
    } as any;

    // Mock first session with public access
    mockSession1 = {
      filePrefix: "public_session",
      knownFields: [],
      files: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Public Session";
          if (key === "description")
            return "This session is publicly accessible";
          if (key === "access") return "public";
          return "";
        }),
        properties: {
          getHasValue: vi.fn(() => false),
          forEach: vi.fn()
        }
      },
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as any;

    // Mock second session with restricted access
    mockSession2 = {
      filePrefix: "restricted_session",
      knownFields: [],
      files: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Restricted Session";
          if (key === "description")
            return "This session has restricted access";
          if (key === "access") return "restricted";
          return "";
        }),
        properties: {
          getHasValue: vi.fn(() => false),
          forEach: vi.fn()
        }
      },
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as any;

    // Add sessions to project
    mockProject.sessions.items = [mockSession1, mockSession2];
  });

  it("should generate unique licenses for different sessions", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // Log the entire graph for debugging
    console.log("Full graph:", JSON.stringify(result["@graph"], null, 2));

    // Check that project references both sessions
    const projectDataset = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );
    expect(projectDataset["pcdm:hasMember"]).toContainEqual({
      "@id": "Sessions/public_session/"
    });
    expect(projectDataset["pcdm:hasMember"]).toContainEqual({
      "@id": "Sessions/restricted_session/"
    });

    // Find the session events - both should be in the graph
    const publicSession = result["@graph"].find(
      (item: any) =>
        item["@id"] === "Sessions/public_session/" &&
        item["@type"].includes("Event")
    );
    const restrictedSession = result["@graph"].find(
      (item: any) =>
        item["@id"] === "Sessions/restricted_session/" &&
        item["@type"].includes("Event")
    );

    // Both sessions should exist in the graph
    expect(publicSession).toBeDefined();
    expect(restrictedSession).toBeDefined();

    // Find licenses for each session (normalized)
    const publicLicense = result["@graph"].find(
      (item: any) => item["@id"] === "#license-demoarchive-public"
    );
    const restrictedLicense = result["@graph"].find(
      (item: any) => item["@id"] === "#license-demoarchive-restricted"
    );

    // Both licenses should exist
    expect(publicLicense).toBeDefined();
    expect(restrictedLicense).toBeDefined();

    // They should have different access types
    expect(publicLicense["ldac:access"]).toEqual({ "@id": "ldac:OpenAccess" });
    expect(restrictedLicense["ldac:access"]).toEqual({
      "@id": "ldac:AuthorizedAccess"
    });

    // They should have different descriptions
    expect(publicLicense.description).toContain("'public'");
    expect(restrictedLicense.description).toContain("'restricted'");

    // Sessions should reference their normalized licenses
    expect(publicSession.license).toEqual({
      "@id": "#license-demoarchive-public"
    });
    expect(restrictedSession.license).toEqual({
      "@id": "#license-demoarchive-restricted"
    });

    // Project should NOT have a license (we removed it)
    expect(projectDataset.license).toBeUndefined();

    // Count the total number of session events in the graph
    const sessionEvents = result["@graph"].filter(
      (item: any) => item["@type"] && item["@type"].includes("Event")
    );
    expect(sessionEvents).toHaveLength(2);
  });
});
