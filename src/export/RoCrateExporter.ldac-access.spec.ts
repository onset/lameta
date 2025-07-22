import { vi, describe, it, beforeEach, expect } from "vitest";
import { getRoCrate } from "./RoCrateExporter";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { fieldDefinitionsOfCurrentConfig } from "../model/field/ConfiguredFieldDefinitions";

describe("RoCrateExporter LDAC access handling", () => {
  let mockProject: Project;
  let mockSession: Session;

  beforeEach(() => {
    // Mock the field definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      []
    );

    // Mock project
    mockProject = {
      filePrefix: "project1",
      sessions: { items: [] },
      findPerson: vi.fn(),
      authorityLists: {
        accessChoicesOfCurrentProtocol: [
          {
            id: "F",
            label: "F: Free to All",
            description: "access is Free to all",
            ldacAccessCategory: "ldac:OpenAccess"
          },
          {
            id: "U",
            label: "U: All Registered Users",
            description: "all Users can access (requires registration)",
            ldacAccessCategory: "ldac:AuthorizedAccess"
          },
          {
            id: "C",
            label: "C: Community members only",
            description: "only Community members are allowed access",
            ldacAccessCategory: "ldac:AuthorizedAccess"
          }
        ]
      },
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "archiveConfigurationName") return "TestArchive";
          return "";
        }),
        properties: {
          forEach: vi.fn()
        }
      },
      knownFields: [],
      files: []
    } as any;

    // Mock session
    mockSession = {
      filePrefix: "test_session",
      knownFields: [],
      files: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "description") return "Test Description";
          if (key === "access") return "F: Free to All";
          return "";
        }),
        properties: {
          getHasValue: vi.fn(() => false),
          forEach: vi.fn()
        }
      },
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as any;
  });

  it("should create LDAC-compliant license with OpenAccess for open access", async () => {
    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the license entry (normalized)
    const license = result["@graph"].find(
      (item: any) => item["@id"] === "#license-testarchive-f"
    );

    expect(license).toBeDefined();
    expect(license["@type"]).toBe("ldac:DataReuseLicense");
    expect(license["ldac:access"]).toEqual({ "@id": "ldac:OpenAccess" });
    expect(license.description).toContain("TestArchive-specific term");
    expect(license.description).toContain("'F: Free to All'");
    expect(license.description).toContain("'access is Free to all'");
  });

  it("should create LDAC-compliant license with AuthorizedAccess for restricted access", async () => {
    // Change the access to restricted
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "U: All Registered Users";
        return "";
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the license entry (normalized)
    const license = result["@graph"].find(
      (item: any) => item["@id"] === "#license-testarchive-u"
    );

    expect(license).toBeDefined();
    expect(license["@type"]).toBe("ldac:DataReuseLicense");
    expect(license["ldac:access"]).toEqual({ "@id": "ldac:AuthorizedAccess" });
    expect(license.description).toContain("TestArchive-specific term");
    expect(license.description).toContain("'U: All Registered Users'");
    expect(license.description).toContain(
      "'all Users can access (requires registration)'"
    );
  });

  it("should include LDAC access type definitions in the graph", async () => {
    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Check for LDAC access type definitions
    const accessTypes = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:AccessTypes"
    );
    expect(accessTypes).toBeDefined();
    expect(accessTypes["@type"]).toBe("DefinedTermSet");
    expect(accessTypes.name).toBe("Access Types");

    const openAccess = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:OpenAccess"
    );
    expect(openAccess).toBeDefined();
    expect(openAccess["@type"]).toBe("DefinedTerm");
    expect(openAccess.name).toBe("Open Access");
    expect(openAccess.inDefinedTermSet).toEqual({ "@id": "ldac:AccessTypes" });

    const authorizedAccess = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:AuthorizedAccess"
    );
    expect(authorizedAccess).toBeDefined();
    expect(authorizedAccess["@type"]).toBe("DefinedTerm");
    expect(authorizedAccess.name).toBe("Authorized Access");

    const dataReuseLicense = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:DataReuseLicense"
    );
    expect(dataReuseLicense).toBeDefined();
    expect(dataReuseLicense["@type"]).toBe("Class");
    expect(dataReuseLicense.subClassOf).toEqual({
      "@id": "http://schema.org/CreativeWork"
    });
  });

  it("should default to OpenAccess for unspecified access", async () => {
    // Set access to unspecified
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "";
        return "";
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the license entry (normalized - unspecified becomes "public")
    const license = result["@graph"].find(
      (item: any) => item["@id"] === "#license-testarchive-public"
    );

    expect(license).toBeDefined();
    expect(license["ldac:access"]).toEqual({ "@id": "ldac:OpenAccess" });
  });

  it("should fall back to AuthorizedAccess if ldacAccessCategory is missing", async () => {
    // Update mock to not have ldacAccessCategory
    mockProject.authorityLists.accessChoicesOfCurrentProtocol = [
      {
        id: "X",
        label: "X: Unknown Access",
        description: "some access without ldacAccessCategory"
      }
    ];

    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "X: Unknown Access";
        return "";
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the license entry (normalized)
    const license = result["@graph"].find(
      (item: any) => item["@id"] === "#license-testarchive-x"
    );

    expect(license).toBeDefined();
    expect(license["ldac:access"]).toEqual({ "@id": "ldac:AuthorizedAccess" });
  });
});
