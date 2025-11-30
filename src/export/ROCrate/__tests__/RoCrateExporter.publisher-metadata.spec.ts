import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import {
  setupCommonMocks,
  setupExporterMocks,
  createMockProject,
  createFsExtraMock
} from "./test-utils/rocrate-test-setup";

// Setup all common mocks before imports
setupCommonMocks();
setupExporterMocks();
createFsExtraMock();

// Mock fs-extra specifically for reading archive configuration files
vi.mock("fs-extra", async () => {
  const actual = await vi.importActual<typeof import("fs-extra")>("fs-extra");
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockImplementation((path: string) => {
        // Return true for archive configuration settings files
        if (
          path.includes("archive-configurations") &&
          path.includes("settings.json5")
        ) {
          return true;
        }
        return true;
      }),
      readFileSync: vi.fn().mockImplementation((path: string) => {
        // Return mock archive configuration content
        if (path.includes("PARADISEC") && path.includes("settings.json5")) {
          return JSON.stringify({
            configurationFullName: "PARADISEC",
            description:
              "Pacific and Regional Archive for Digital Sources in Endangered Cultures",
            url: "https://www.paradisec.org.au/",
            archiveUsesParadisec: true
          });
        }
        if (path.includes("ELAR") && path.includes("settings.json5")) {
          return JSON.stringify({
            configurationFullName: "ELAR - Endangered Languages Archive",
            description:
              "Endangered Languages Archive at SOAS University of London",
            url: "https://www.elararchive.org/",
            archiveUsesImdi: true
          });
        }
        if (path.includes("lameta") && path.includes("settings.json5")) {
          return JSON.stringify({
            configurationFullName: "lameta"
            // No description or url for lameta
          });
        }
        return "mock file content";
      }),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      statSync: vi.fn().mockReturnValue({
        size: 1024,
        birthtime: new Date("2024-01-01T00:00:00.000Z")
      }),
      readdirSync: vi.fn().mockReturnValue([])
    },
    existsSync: vi.fn().mockImplementation((path: string) => {
      if (
        path.includes("archive-configurations") &&
        path.includes("settings.json5")
      ) {
        return true;
      }
      return true;
    }),
    readFileSync: vi.fn().mockImplementation((path: string) => {
      if (path.includes("PARADISEC") && path.includes("settings.json5")) {
        return JSON.stringify({
          configurationFullName: "PARADISEC",
          description:
            "Pacific and Regional Archive for Digital Sources in Endangered Cultures",
          url: "https://www.paradisec.org.au/",
          archiveUsesParadisec: true
        });
      }
      if (path.includes("ELAR") && path.includes("settings.json5")) {
        return JSON.stringify({
          configurationFullName: "ELAR - Endangered Languages Archive",
          description:
            "Endangered Languages Archive at SOAS University of London",
          url: "https://www.elararchive.org/",
          archiveUsesImdi: true
        });
      }
      if (path.includes("lameta") && path.includes("settings.json5")) {
        return JSON.stringify({
          configurationFullName: "lameta"
        });
      }
      return "mock file content";
    }),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    statSync: vi.fn().mockReturnValue({
      size: 1024,
      birthtime: new Date("2024-01-01T00:00:00.000Z")
    }),
    readdirSync: vi.fn().mockReturnValue([])
  };
});

describe("RoCrateExporter Publisher Metadata", () => {
  describe("Publisher Organization with description and url", () => {
    it("should include description and url for PARADISEC publisher", async () => {
      const mockProject = createMockProject({
        metadata: {
          title: "Test Project",
          collectionDescription: "A test project",
          archiveConfigurationName: "PARADISEC"
        }
      });
      (mockProject as any).sessions = { items: [] };

      const roCrateData = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrateData["@graph"];

      // Find the publisher entity
      const publisherEntity = graph.find(
        (item: any) => item["@id"] === "#publisher-paradisec"
      );

      expect(publisherEntity).toBeDefined();
      expect(publisherEntity["@type"]).toBe("Organization");
      expect(publisherEntity.name).toBe("PARADISEC");
      expect(publisherEntity.description).toBe(
        "Pacific and Regional Archive for Digital Sources in Endangered Cultures"
      );
      expect(publisherEntity.url).toBe("https://www.paradisec.org.au/");
    });

    it("should include description and url for ELAR publisher", async () => {
      const mockProject = createMockProject({
        metadata: {
          title: "Test Project",
          collectionDescription: "A test project",
          archiveConfigurationName: "ELAR"
        }
      });
      (mockProject as any).sessions = { items: [] };

      const roCrateData = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrateData["@graph"];

      // Find the publisher entity
      const publisherEntity = graph.find(
        (item: any) => item["@id"] === "#publisher-elar"
      );

      expect(publisherEntity).toBeDefined();
      expect(publisherEntity["@type"]).toBe("Organization");
      expect(publisherEntity.name).toBe("ELAR");
      expect(publisherEntity.description).toBe(
        "Endangered Languages Archive at SOAS University of London"
      );
      expect(publisherEntity.url).toBe("https://www.elararchive.org/");
    });

    it("should handle publisher without description/url gracefully", async () => {
      const mockProject = createMockProject({
        metadata: {
          title: "Test Project",
          collectionDescription: "A test project",
          archiveConfigurationName: "lameta"
        }
      });
      (mockProject as any).sessions = { items: [] };

      const roCrateData = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrateData["@graph"];

      // Find the publisher entity
      const publisherEntity = graph.find(
        (item: any) => item["@id"] === "#publisher-lameta"
      );

      expect(publisherEntity).toBeDefined();
      expect(publisherEntity["@type"]).toBe("Organization");
      expect(publisherEntity.name).toBe("lameta");
      // Should not have description or url if not in settings
      expect(publisherEntity.description).toBeUndefined();
      expect(publisherEntity.url).toBeUndefined();
    });

    it("should reference publisher in root dataset", async () => {
      const mockProject = createMockProject({
        metadata: {
          title: "Test Project",
          collectionDescription: "A test project",
          archiveConfigurationName: "PARADISEC"
        }
      });
      (mockProject as any).sessions = { items: [] };

      const roCrateData = (await getRoCrate(mockProject, mockProject)) as any;
      const graph = roCrateData["@graph"];

      // Find the root dataset
      const rootDataset = graph.find((item: any) => item["@id"] === "./");
      expect(rootDataset).toBeDefined();

      // Check that publisher is referenced
      expect(rootDataset.publisher).toBeDefined();
      expect(rootDataset.publisher["@id"]).toBe("#publisher-paradisec");

      // Check that holdingArchive also references the publisher
      expect(rootDataset.holdingArchive).toBeDefined();
      expect(rootDataset.holdingArchive["@id"]).toBe("#publisher-paradisec");
    });
  });
});
