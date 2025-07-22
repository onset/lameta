import { vi, describe, it, beforeEach, expect } from "vitest";
import {
  createSessionLicense,
  getSessionLicenseId,
  createLdacAccessTypeDefinitions,
  createUniqueLicenses
} from "./RoCrateLicenses";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";

describe("RoCrateLicenses", () => {
  let mockProject: Project;
  let mockSession: Session;

  beforeEach(() => {
    // Mock project
    mockProject = {
      filePrefix: "project1",
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
        })
      }
    } as any;

    // Mock session
    mockSession = {
      filePrefix: "test_session",
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "access") return "F: Free to All";
          return "";
        })
      }
    } as any;
  });

  describe("createSessionLicense", () => {
    it("should create LDAC-compliant license with OpenAccess for open access", () => {
      const license = createSessionLicense(mockSession, mockProject);

      expect(license).toBeDefined();
      expect(license["@id"]).toBe("#license-testarchive-f");
      expect(license["@type"]).toBe("ldac:DataReuseLicense");
      expect(license["ldac:access"]).toEqual({ "@id": "ldac:OpenAccess" });
      expect(license.description).toContain("TestArchive-specific term");
      expect(license.description).toContain("'F: Free to All'");
      expect(license.description).toContain("'access is Free to all'");
    });

    it("should create LDAC-compliant license with AuthorizedAccess for restricted access", () => {
      // Change the access to restricted
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "access") return "U: All Registered Users";
          return "";
        });

      const license = createSessionLicense(mockSession, mockProject);

      expect(license).toBeDefined();
      expect(license["@type"]).toBe("ldac:DataReuseLicense");
      expect(license["ldac:access"]).toEqual({
        "@id": "ldac:AuthorizedAccess"
      });
      expect(license.description).toContain("TestArchive-specific term");
      expect(license.description).toContain("'U: All Registered Users'");
      expect(license.description).toContain(
        "'all Users can access (requires registration)'"
      );
    });

    it("should handle unspecified access", () => {
      // Test with empty access
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "access") return "";
          return "";
        });

      const license = createSessionLicense(mockSession, mockProject);

      expect(license).toBeDefined();
      expect(license["ldac:access"]).toEqual({ "@id": "ldac:OpenAccess" });
    });

    it("should fall back to AuthorizedAccess if ldacAccessCategory is missing", () => {
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
          if (key === "access") return "X: Unknown Access";
          return "";
        });

      const license = createSessionLicense(mockSession, mockProject);

      expect(license).toBeDefined();
      expect(license["ldac:access"]).toEqual({
        "@id": "ldac:AuthorizedAccess"
      });
    });
  });

  describe("getSessionLicenseId", () => {
    it("should return correct normalized license ID for session", () => {
      const licenseId = getSessionLicenseId(mockSession, mockProject);
      expect(licenseId).toBe("#license-testarchive-f");
    });
  });

  describe("createLdacAccessTypeDefinitions", () => {
    it("should create all required LDAC access type definitions", () => {
      const definitions = createLdacAccessTypeDefinitions();

      expect(definitions).toHaveLength(4);

      // Check AccessTypes term set
      const accessTypes = definitions.find(
        (def: any) => def["@id"] === "ldac:AccessTypes"
      );
      expect(accessTypes).toBeDefined();
      expect((accessTypes as any)["@type"]).toBe("DefinedTermSet");

      // Check OpenAccess term
      const openAccess = definitions.find(
        (def: any) => def["@id"] === "ldac:OpenAccess"
      );
      expect(openAccess).toBeDefined();
      expect((openAccess as any)["@type"]).toBe("DefinedTerm");
      expect((openAccess as any).inDefinedTermSet).toEqual({
        "@id": "ldac:AccessTypes"
      });

      // Check AuthorizedAccess term
      const authorizedAccess = definitions.find(
        (def: any) => def["@id"] === "ldac:AuthorizedAccess"
      );
      expect(authorizedAccess).toBeDefined();
      expect((authorizedAccess as any)["@type"]).toBe("DefinedTerm");
      expect((authorizedAccess as any).inDefinedTermSet).toEqual({
        "@id": "ldac:AccessTypes"
      });

      // Check DataReuseLicense class
      const dataReuseLicense = definitions.find(
        (def: any) => def["@id"] === "ldac:DataReuseLicense"
      );
      expect(dataReuseLicense).toBeDefined();
      expect((dataReuseLicense as any)["@type"]).toBe("Class");
      expect((dataReuseLicense as any).subClassOf).toEqual({
        "@id": "http://schema.org/CreativeWork"
      });
    });
  });

  describe("createUniqueLicenses", () => {
    it("should create only unique license objects for sessions with same access", () => {
      // Create multiple sessions with the same access level
      const session1 = {
        filePrefix: "session1",
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "access") return "F: Free to All";
            return "";
          })
        }
      } as any;

      const session2 = {
        filePrefix: "session2",
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "access") return "F: Free to All";
            return "";
          })
        }
      } as any;

      const session3 = {
        filePrefix: "session3",
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "access") return "U: All Registered Users";
            return "";
          })
        }
      } as any;

      const uniqueLicenses = createUniqueLicenses(
        [session1, session2, session3],
        mockProject
      );

      // Should only have 2 unique licenses (F and U access types)
      expect(uniqueLicenses).toHaveLength(2);

      // Verify the license IDs are normalized
      const licenseIds = uniqueLicenses.map((license) => license["@id"]);
      expect(licenseIds).toContain("#license-testarchive-f");
      expect(licenseIds).toContain("#license-testarchive-u");
    });

    it("should create different licenses for different access types", () => {
      const publicSession = {
        filePrefix: "public_session",
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "access") return "public";
            return "";
          })
        }
      } as any;

      const restrictedSession = {
        filePrefix: "restricted_session",
        metadataFile: {
          getTextProperty: vi.fn().mockImplementation((key: string) => {
            if (key === "access") return "restricted";
            return "";
          })
        }
      } as any;

      const uniqueLicenses = createUniqueLicenses(
        [publicSession, restrictedSession],
        mockProject
      );

      expect(uniqueLicenses).toHaveLength(2);

      const publicLicense = uniqueLicenses.find(
        (license) => license["@id"] === "#license-testarchive-public"
      );
      const restrictedLicense = uniqueLicenses.find(
        (license) => license["@id"] === "#license-testarchive-restricted"
      );

      expect(publicLicense).toBeDefined();
      expect(restrictedLicense).toBeDefined();
      expect(publicLicense["ldac:access"]).toEqual({
        "@id": "ldac:OpenAccess"
      });
      expect(restrictedLicense["ldac:access"]).toEqual({
        "@id": "ldac:AuthorizedAccess"
      });
    });
  });
});
