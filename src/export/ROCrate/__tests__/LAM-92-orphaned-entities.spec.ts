/**
 * LAM-92: Contextual entities not referenced (orphaned entities) - hewya project
 * https://linear.app/lameta/issue/LAM-92/ro-crate-contextual-entities-not-referenced-orphaned-entities-hewya
 *
 * Per RO-Crate spec:
 * - (line 431) Any referenced contextual entities SHOULD be described in the RO-Crate Metadata Document
 * - (line 654) The entity SHOULD be ultimately referenceable from the root data entity
 *
 * Problem: createLdacAccessTypeDefinitions() always returns ALL LDAC access type definitions
 * (ldac:OpenAccess, ldac:AuthorizedAccess, ldac:DataReuseLicense) regardless of what's actually used.
 * This causes orphaned entities when only one access type is used.
 *
 * Fix: Only include LDAC access type definitions that are actually referenced by license entities.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createSessionLicense,
  createLdacAccessTypeDefinitions,
  createDistinctLicenses,
  clearLdacAccessTypeDefinitionsCache
} from "../RoCrateLicenseManager";
import { expandLdacId } from "../RoCrateUtils";
import {
  createMockProject,
  createMockSession
} from "./test-utils/rocrate-test-setup";

describe("LAM-92: Only include used LDAC access type definitions", () => {
  beforeEach(() => {
    clearLdacAccessTypeDefinitionsCache();
  });

  afterEach(() => {
    clearLdacAccessTypeDefinitionsCache();
  });

  describe("createLdacAccessTypeDefinitions with usedAccessTypes parameter", () => {
    it("should only include ldac:OpenAccess when only open access is used", () => {
      const usedAccessTypes = new Set([expandLdacId("ldac:OpenAccess")]);
      const definitions = createLdacAccessTypeDefinitions(usedAccessTypes);

      // Should include AccessTypes container and OpenAccess
      const accessTypesEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:AccessTypes")
      );
      const openAccessEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:OpenAccess")
      );
      const authorizedAccessEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:AuthorizedAccess")
      );

      expect(accessTypesEntity).toBeDefined();
      expect(openAccessEntity).toBeDefined();
      // LAM-92: AuthorizedAccess should NOT be included when only OpenAccess is used
      expect(authorizedAccessEntity).toBeUndefined();
    });

    it("should only include ldac:AuthorizedAccess when only authorized access is used", () => {
      const usedAccessTypes = new Set([expandLdacId("ldac:AuthorizedAccess")]);
      const definitions = createLdacAccessTypeDefinitions(usedAccessTypes);

      const accessTypesEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:AccessTypes")
      );
      const openAccessEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:OpenAccess")
      );
      const authorizedAccessEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:AuthorizedAccess")
      );

      expect(accessTypesEntity).toBeDefined();
      // LAM-92: OpenAccess should NOT be included when only AuthorizedAccess is used
      expect(openAccessEntity).toBeUndefined();
      expect(authorizedAccessEntity).toBeDefined();
    });

    it("should include both access types when both are used", () => {
      const usedAccessTypes = new Set([
        expandLdacId("ldac:OpenAccess"),
        expandLdacId("ldac:AuthorizedAccess")
      ]);
      const definitions = createLdacAccessTypeDefinitions(usedAccessTypes);

      const accessTypesEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:AccessTypes")
      );
      const openAccessEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:OpenAccess")
      );
      const authorizedAccessEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:AuthorizedAccess")
      );

      expect(accessTypesEntity).toBeDefined();
      expect(openAccessEntity).toBeDefined();
      expect(authorizedAccessEntity).toBeDefined();
    });

    it("should NOT include ldac:DataReuseLicense class (it's used as @type, not referenced by @id)", () => {
      // LAM-92: The ldac:DataReuseLicense class entity was orphaned because it's used as
      // "@type": "ldac:DataReuseLicense" in licenses, not as {"@id": "ldac:DataReuseLicense"}.
      // Since it's an external vocabulary term used as a type, we don't need to define it in-crate.
      const usedAccessTypes = new Set([
        expandLdacId("ldac:OpenAccess"),
        expandLdacId("ldac:AuthorizedAccess")
      ]);
      const definitions = createLdacAccessTypeDefinitions(usedAccessTypes);

      const dataReuseLicenseEntity = definitions.find(
        (d: any) => d["@id"] === expandLdacId("ldac:DataReuseLicense")
      );

      // LAM-92: This entity should NOT be in the output - it causes orphaned entity warnings
      expect(dataReuseLicenseEntity).toBeUndefined();
    });

    it("should return empty array when no access types are used", () => {
      const usedAccessTypes = new Set<string>();
      const definitions = createLdacAccessTypeDefinitions(usedAccessTypes);

      // When nothing is used, we shouldn't include any definitions
      expect(definitions).toEqual([]);
    });
  });

  describe("Integration: licenses should only generate their used access types", () => {
    it("should only generate OpenAccess definition when all sessions have open access", () => {
      const mockProject = createMockProject({
        metadata: {
          archiveConfigurationName: "TestArchive"
        },
        authorityLists: {
          accessChoicesOfCurrentProtocol: [
            {
              id: "public",
              label: "public",
              description: "Open access",
              ldacAccessCategory: "ldac:OpenAccess"
            }
          ]
        }
      });

      const session1 = createMockSession({ metadata: { access: "public" } });
      const session2 = createMockSession({ metadata: { access: "public" } });

      const licenses = createDistinctLicenses(
        [session1, session2],
        mockProject
      );

      // All licenses should reference OpenAccess
      licenses.forEach((license) => {
        expect(license["ldac:access"]["@id"]).toBe(
          expandLdacId("ldac:OpenAccess")
        );
      });

      // Collect used access types from licenses
      const usedAccessTypes = new Set(
        licenses.map((l) => l["ldac:access"]["@id"])
      );

      // Generate definitions with only used types
      const definitions = createLdacAccessTypeDefinitions(usedAccessTypes);

      // Should have OpenAccess but NOT AuthorizedAccess
      expect(
        definitions.some(
          (d: any) => d["@id"] === expandLdacId("ldac:OpenAccess")
        )
      ).toBe(true);
      expect(
        definitions.some(
          (d: any) => d["@id"] === expandLdacId("ldac:AuthorizedAccess")
        )
      ).toBe(false);
    });

    it("should generate both access type definitions when sessions have mixed access", () => {
      const mockProject = createMockProject({
        metadata: {
          archiveConfigurationName: "TestArchive"
        },
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
        }
      });

      const publicSession = createMockSession({
        metadata: { access: "public" }
      });
      const restrictedSession = createMockSession({
        metadata: { access: "restricted" }
      });

      const licenses = createDistinctLicenses(
        [publicSession, restrictedSession],
        mockProject
      );

      // Collect used access types from licenses
      const usedAccessTypes = new Set(
        licenses.map((l) => l["ldac:access"]["@id"])
      );

      // Should have both access types
      expect(usedAccessTypes.has(expandLdacId("ldac:OpenAccess"))).toBe(true);
      expect(usedAccessTypes.has(expandLdacId("ldac:AuthorizedAccess"))).toBe(
        true
      );

      // Generate definitions with used types
      const definitions = createLdacAccessTypeDefinitions(usedAccessTypes);

      // Should have both
      expect(
        definitions.some(
          (d: any) => d["@id"] === expandLdacId("ldac:OpenAccess")
        )
      ).toBe(true);
      expect(
        definitions.some(
          (d: any) => d["@id"] === expandLdacId("ldac:AuthorizedAccess")
        )
      ).toBe(true);
    });
  });
});
