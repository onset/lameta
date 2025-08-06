import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import { writeROCrateFile } from "../WriteROCrateFile";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";

// Mock fs-extra
vi.mock("fs-extra", () => ({
  pathExists: vi.fn(),
  remove: vi.fn(),
  writeJson: vi.fn(),
  writeFile: vi.fn(),
  stat: vi.fn()
}));

// Mock the RoCrateExporter
vi.mock("../RoCrateExporter", () => ({
  getRoCrate: vi.fn()
}));

// Mock Path.join to return predictable paths
vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join("/"))
  };
});

const mockFs = fs as any;
const mockGetRoCrate = vi.mocked(getRoCrate);

describe("writeROCrateFile", () => {
  let mockProject: Project;
  const mockProjectDirectory = "/test/project";
  const expectedRoCrateFilePath = "/test/project/ro-crate-metadata.json";
  const mockRoCrateData = {
    "@context": ["https://w3id.org/ro/crate/1.2/context"],
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": "ro-crate-metadata.json",
        conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a minimal mock project
    mockProject = {
      directory: mockProjectDirectory
    } as Project;

    // Setup default mock implementations
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.remove.mockResolvedValue(undefined);
    mockFs.writeJson.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ mode: 0o666 });
    mockGetRoCrate.mockResolvedValue(mockRoCrateData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when project is valid", () => {
    it("should create a new RO-Crate file when none exists", async () => {
      mockFs.pathExists.mockResolvedValue(false);

      await writeROCrateFile(mockProject);

      expect(Path.join).toHaveBeenCalledWith(
        mockProjectDirectory,
        "ro-crate-metadata.json"
      );
      expect(mockFs.pathExists).toHaveBeenCalledWith(expectedRoCrateFilePath);
      expect(mockFs.remove).not.toHaveBeenCalled();
      expect(mockGetRoCrate).toHaveBeenCalledWith(mockProject, mockProject);
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expectedRoCrateFilePath,
        mockRoCrateData,
        { spaces: 2 }
      );
    });

    it("should replace existing RO-Crate file when one exists", async () => {
      mockFs.pathExists.mockResolvedValue(true);

      await writeROCrateFile(mockProject);

      expect(mockFs.pathExists).toHaveBeenCalledWith(expectedRoCrateFilePath);
      expect(mockFs.remove).toHaveBeenCalledWith(expectedRoCrateFilePath);
      expect(mockGetRoCrate).toHaveBeenCalledWith(mockProject, mockProject);
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expectedRoCrateFilePath,
        mockRoCrateData,
        { spaces: 2 }
      );
    });

    it("should format JSON with 2 spaces indentation", async () => {
      await writeROCrateFile(mockProject);

      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expectedRoCrateFilePath,
        mockRoCrateData,
        { spaces: 2 }
      );
    });

    it("should handle complex RO-Crate data structure", async () => {
      const complexRoCrateData = {
        "@context": [
          "https://w3id.org/ro/crate/1.2/context",
          { "@vocab": "http://schema.org/" }
        ],
        "@graph": [
          {
            "@type": "CreativeWork",
            "@id": "ro-crate-metadata.json",
            conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" },
            about: { "@id": "./" }
          },
          {
            "@type": "Dataset",
            "@id": "./",
            name: "Test Project",
            description: "A test project for RO-Crate"
          }
        ]
      };

      mockGetRoCrate.mockResolvedValue(complexRoCrateData);

      await writeROCrateFile(mockProject);

      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expectedRoCrateFilePath,
        complexRoCrateData,
        { spaces: 2 }
      );
    });
  });

  describe("when project is invalid", () => {
    it("should throw error when project is null", async () => {
      await expect(writeROCrateFile(null as any)).rejects.toThrow(
        "No valid project provided"
      );

      expect(mockFs.pathExists).not.toHaveBeenCalled();
      expect(mockFs.remove).not.toHaveBeenCalled();
      expect(mockGetRoCrate).not.toHaveBeenCalled();
      expect(mockFs.writeJson).not.toHaveBeenCalled();
    });

    it("should throw error when project is undefined", async () => {
      await expect(writeROCrateFile(undefined as any)).rejects.toThrow(
        "No valid project provided"
      );

      expect(mockFs.pathExists).not.toHaveBeenCalled();
      expect(mockFs.remove).not.toHaveBeenCalled();
      expect(mockGetRoCrate).not.toHaveBeenCalled();
      expect(mockFs.writeJson).not.toHaveBeenCalled();
    });

    it("should throw error when project directory is null", async () => {
      const projectWithoutDirectory = { directory: null } as any;

      await expect(writeROCrateFile(projectWithoutDirectory)).rejects.toThrow(
        "No valid project provided"
      );

      expect(mockFs.pathExists).not.toHaveBeenCalled();
      expect(mockFs.remove).not.toHaveBeenCalled();
      expect(mockGetRoCrate).not.toHaveBeenCalled();
      expect(mockFs.writeJson).not.toHaveBeenCalled();
    });

    it("should throw error when project directory is undefined", async () => {
      const projectWithoutDirectory = {} as Project;

      await expect(writeROCrateFile(projectWithoutDirectory)).rejects.toThrow(
        "No valid project provided"
      );

      expect(mockFs.pathExists).not.toHaveBeenCalled();
      expect(mockFs.remove).not.toHaveBeenCalled();
      expect(mockGetRoCrate).not.toHaveBeenCalled();
      expect(mockFs.writeJson).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should propagate fs.pathExists errors", async () => {
      const fsError = new Error("Permission denied");
      mockFs.pathExists.mockRejectedValue(fsError);

      await expect(writeROCrateFile(mockProject)).rejects.toThrow(
        "Permission denied"
      );

      expect(mockFs.pathExists).toHaveBeenCalledWith(expectedRoCrateFilePath);
      expect(mockFs.remove).not.toHaveBeenCalled();
      expect(mockGetRoCrate).not.toHaveBeenCalled();
      expect(mockFs.writeJson).not.toHaveBeenCalled();
    });

    it("should propagate fs.remove errors", async () => {
      mockFs.pathExists.mockResolvedValue(true);
      const fsError = new Error("Failed to remove file");
      mockFs.remove.mockRejectedValue(fsError);

      await expect(writeROCrateFile(mockProject)).rejects.toThrow(
        "Failed to remove file"
      );

      expect(mockFs.pathExists).toHaveBeenCalledWith(expectedRoCrateFilePath);
      expect(mockFs.remove).toHaveBeenCalledWith(expectedRoCrateFilePath);
      expect(mockGetRoCrate).not.toHaveBeenCalled();
      expect(mockFs.writeJson).not.toHaveBeenCalled();
    });

    it("should propagate getRoCrate errors", async () => {
      const exporterError = new Error("Failed to generate RO-Crate");
      mockGetRoCrate.mockRejectedValue(exporterError);

      await expect(writeROCrateFile(mockProject)).rejects.toThrow(
        "Failed to generate RO-Crate"
      );

      expect(mockFs.pathExists).toHaveBeenCalledWith(expectedRoCrateFilePath);
      expect(mockGetRoCrate).toHaveBeenCalledWith(mockProject, mockProject);
      expect(mockFs.writeJson).not.toHaveBeenCalled();
    });

    it("should propagate fs.writeJson errors", async () => {
      const fsError = new Error("Failed to write file");
      mockFs.writeJson.mockRejectedValue(fsError);

      await expect(writeROCrateFile(mockProject)).rejects.toThrow(
        "Failed to write file"
      );

      expect(mockFs.pathExists).toHaveBeenCalledWith(expectedRoCrateFilePath);
      expect(mockGetRoCrate).toHaveBeenCalledWith(mockProject, mockProject);
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expectedRoCrateFilePath,
        mockRoCrateData,
        { spaces: 2 }
      );
    });
  });

  describe("file system interaction order", () => {
    it("should follow correct sequence when file exists", async () => {
      mockFs.pathExists.mockResolvedValue(true);

      const callOrder: string[] = [];
      mockFs.pathExists.mockImplementation(async () => {
        callOrder.push("pathExists");
        return true;
      });
      mockFs.remove.mockImplementation(async () => {
        callOrder.push("remove");
      });
      mockGetRoCrate.mockImplementation(async () => {
        callOrder.push("getRoCrate");
        return mockRoCrateData;
      });
      mockFs.writeJson.mockImplementation(async () => {
        callOrder.push("writeJson");
      });

      await writeROCrateFile(mockProject);

      expect(callOrder).toEqual([
        "pathExists",
        "remove",
        "pathExists",
        "remove",
        "getRoCrate",
        "writeJson"
      ]);
    });

    it("should follow correct sequence when file does not exist", async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const callOrder: string[] = [];
      mockFs.pathExists.mockImplementation(async () => {
        callOrder.push("pathExists");
        return false;
      });
      mockGetRoCrate.mockImplementation(async () => {
        callOrder.push("getRoCrate");
        return mockRoCrateData;
      });
      mockFs.writeJson.mockImplementation(async () => {
        callOrder.push("writeJson");
      });

      await writeROCrateFile(mockProject);

      expect(callOrder).toEqual([
        "pathExists",
        "pathExists",
        "getRoCrate",
        "writeJson"
      ]);
      expect(mockFs.remove).not.toHaveBeenCalled();
    });
  });
});
