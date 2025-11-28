/**
 * LAM-96: License entities missing `name` property - hewya project
 * https://linear.app/lameta/issue/LAM-96/ro-crate-license-entities-missing-name-property-hewya-project
 *
 * Per RO-Crate spec line 651: "The entity SHOULD have a human-readable `name`,
 * in particular if its `@id` does not go to a human-readable Web page."
 *
 * This test verifies that:
 * 1. Session license entities have a `name` property
 * 2. The ldac:DataReuseLicense class entity has a `name` property
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createSessionLicense,
  createLdacAccessTypeDefinitions,
  clearLdacAccessTypeDefinitionsCache
} from "../RoCrateLicenseManager";
import { expandLdacId } from "../RoCrateUtils";
import {
  createMockProject,
  createMockSession
} from "./test-utils/rocrate-test-setup";

describe("LAM-96: License entities must have name property", () => {
  beforeEach(() => {
    clearLdacAccessTypeDefinitionsCache();
  });

  afterEach(() => {
    clearLdacAccessTypeDefinitionsCache();
  });

  describe("createSessionLicense", () => {
    it("should include name property on session license entities", () => {
      const mockSession = createMockSession({
        metadata: {
          access: "public"
        }
      });

      const mockProject = createMockProject({
        metadata: {
          archiveConfigurationName: "PARADISEC"
        }
      });

      const license = createSessionLicense(mockSession, mockProject);

      // LAM-96: Verify name property exists and is a non-empty string
      expect(license.name).toBeDefined();
      expect(typeof license.name).toBe("string");
      expect(license.name.length).toBeGreaterThan(0);
    });

    it("should generate descriptive name including archive name and access type", () => {
      const mockSession = createMockSession({
        metadata: {
          access: "Open"
        }
      });

      const mockProject = createMockProject({
        metadata: {
          archiveConfigurationName: "PARADISEC"
        }
      });

      const license = createSessionLicense(mockSession, mockProject);

      // Name should include both archive name and access type
      expect(license.name).toBe("PARADISEC Open License");
    });

    it("should handle various access types in the name", () => {
      const mockProject = createMockProject({
        metadata: {
          archiveConfigurationName: "REAP"
        }
      });

      // Test with restricted access
      const restrictedSession = createMockSession({
        metadata: {
          access: "REAP Users"
        }
      });

      const restrictedLicense = createSessionLicense(
        restrictedSession,
        mockProject
      );
      expect(restrictedLicense.name).toBe("REAP REAP Users License");

      // Test with public access
      const publicSession = createMockSession({
        metadata: {
          access: "public"
        }
      });

      const publicLicense = createSessionLicense(publicSession, mockProject);
      expect(publicLicense.name).toBe("REAP public License");
    });

    it("should use 'public' in name when access is unspecified", () => {
      const mockSession = createMockSession({
        metadata: {
          access: "unspecified"
        }
      });

      const mockProject = createMockProject({
        metadata: {
          archiveConfigurationName: "TestArchive"
        }
      });

      const license = createSessionLicense(mockSession, mockProject);

      expect(license.name).toBe("TestArchive public License");
    });

    it("should use default archive name when not specified", () => {
      const mockSession = createMockSession({
        metadata: {
          access: "public"
        }
      });

      const mockProject = createMockProject({
        metadata: {}
      });

      const license = createSessionLicense(mockSession, mockProject);

      // The mock setup defaults to "lameta" as archiveConfigurationName
      expect(license.name).toBe("lameta public License");
    });
  });

  describe("createLdacAccessTypeDefinitions", () => {
    it("should include name property on ldac:DataReuseLicense class entity", () => {
      const definitions = createLdacAccessTypeDefinitions();

      const licenseClass = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:DataReuseLicense")
      );

      expect(licenseClass).toBeDefined();
      expect((licenseClass as any).name).toBeDefined();
      expect(typeof (licenseClass as any).name).toBe("string");
      expect((licenseClass as any).name).toBe("Data Reuse License");
    });

    it("should have name on all DefinedTerm entities", () => {
      const definitions = createLdacAccessTypeDefinitions();

      const definedTerms = definitions.filter(
        (d: any) => d["@type"] === "DefinedTerm"
      );

      // All DefinedTerm entities should have names
      expect(definedTerms.length).toBeGreaterThan(0);
      definedTerms.forEach((term: any) => {
        expect(term.name).toBeDefined();
        expect(typeof term.name).toBe("string");
        expect(term.name.length).toBeGreaterThan(0);
      });
    });

    it("should have name on DefinedTermSet entities", () => {
      const definitions = createLdacAccessTypeDefinitions();

      const termSet = definitions.find(
        (d: any) => d["@type"] === "DefinedTermSet"
      );

      expect(termSet).toBeDefined();
      expect((termSet as any).name).toBeDefined();
      expect(typeof (termSet as any).name).toBe("string");
    });
  });
});
