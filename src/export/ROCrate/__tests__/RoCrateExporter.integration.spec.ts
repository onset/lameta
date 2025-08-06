import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import {
  createMockProject,
  createMockSession
} from "./test-utils/rocrate-test-setup";
import * as fs from "fs";
import * as path from "path";
import { Session } from "../../../model/Project/Session/Session";

// Mock fs for file operations
vi.mock("fs", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 12345,
    birthtime: new Date("2023-01-01"),
    isFile: () => true
  }),
  existsSync: vi.fn().mockReturnValue(true)
}));

// Mock path operations
vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
    ...actual,
    basename: vi.fn(
      (p: string) => p.split("/").pop() || p.split("\\").pop() || p
    ),
    extname: vi.fn((p: string) => {
      const parts = p.split(".");
      return parts.length > 1 ? "." + parts[parts.length - 1] : "";
    })
  };
});

function createMockFile(filePath: string, overrides: any = {}) {
  return {
    getActualFilePath: () => filePath,
    getModifiedDate: () => new Date("2023-01-01"),
    pathInFolderToLinkFileOrLocalCopy: path.basename(filePath),
    properties: {
      getTextStringOrEmpty: (key: string) => "",
      ...overrides.properties
    },
    ...overrides
  };
}

describe("RoCrateExporter Integration Tests", () => {
  let mockProject: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProject = createMockProject({
      metadata: {
        title: "Test Project",
        archiveConfigurationName: "REAP"
      }
    });
  });

  it("should export session files with properly normalized license IDs", async () => {
    // Create a session with raw access value
    const mockSession = createMockSession({
      metadata: {
        title: "Test Session",
        access: "Strategic partners",
        location: "Test Location"
      }
    });

    // Create a session file (.session) with raw license property
    const sessionFile = createMockFile("/sessions/test/test.session", {
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license") return "Strategic partners";
          return "";
        }
      },
      pathInFolderToLinkFileOrLocalCopy: "test.session"
    });

    mockSession.files = [sessionFile];
    mockProject.sessions.items = [mockSession];

    const result = await getRoCrate(mockProject, mockProject);
    const graph = (result as any)["@graph"];

    // Find the session file entry
    const sessionFileEntry = graph.find(
      (item: any) => item.name === "test.session"
    );

    expect(sessionFileEntry).toBeDefined();
    expect(sessionFileEntry.license).toBeDefined();
    expect(sessionFileEntry.license["@id"]).toBe(
      "#license-reap-strategic-partners"
    );

    // This is the key test - it should NOT be the raw value
    expect(sessionFileEntry.license["@id"]).not.toBe("Strategic partners");

    // Verify the corresponding license object exists in the graph
    const licenseObject = graph.find(
      (item: any) => item["@id"] === "#license-reap-strategic-partners"
    );

    expect(licenseObject).toBeDefined();
    expect(licenseObject["@type"]).toBe("ldac:DataReuseLicense");
  });

  it("should handle multiple session files with different raw license values", async () => {
    const session1 = createMockSession({
      metadata: {
        title: "Session 1",
        access: "Strategic partners"
      }
    });

    const session2 = createMockSession({
      metadata: {
        title: "Session 2",
        access: "Public"
      }
    });

    const sessionFile1 = createMockFile("/sessions/session1/session1.session", {
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license") return "Strategic partners";
          return "";
        }
      },
      pathInFolderToLinkFileOrLocalCopy: "session1.session"
    });

    const sessionFile2 = createMockFile("/sessions/session2/session2.session", {
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license") return "Public";
          return "";
        }
      },
      pathInFolderToLinkFileOrLocalCopy: "session2.session"
    });

    session1.files = [sessionFile1];
    session2.files = [sessionFile2];
    mockProject.sessions.items = [session1, session2];

    const result = await getRoCrate(mockProject, mockProject);
    const graph = (result as any)["@graph"];

    // Check session file 1
    const sessionFile1Entry = graph.find(
      (item: any) => item.name === "session1.session"
    );
    expect(sessionFile1Entry.license["@id"]).toBe(
      "#license-reap-strategic-partners"
    );
    expect(sessionFile1Entry.license["@id"]).not.toBe("Strategic partners");

    // Check session file 2
    const sessionFile2Entry = graph.find(
      (item: any) => item.name === "session2.session"
    );
    expect(sessionFile2Entry.license["@id"]).toBe("#license-reap-public");
    expect(sessionFile2Entry.license["@id"]).not.toBe("Public");

    // Verify both license objects exist
    const license1 = graph.find(
      (item: any) => item["@id"] === "#license-reap-strategic-partners"
    );
    const license2 = graph.find(
      (item: any) => item["@id"] === "#license-reap-public"
    );

    expect(license1).toBeDefined();
    expect(license2).toBeDefined();
  });

  it("should demonstrate that the bug would have been caught by this integration test", async () => {
    // This test recreates the exact scenario that was failing:
    // A session file with raw "Strategic partners" value should get normalized to "#license-reap-strategic-partners"

    const mockSession = createMockSession({
      metadata: {
        title: "Problem Session",
        access: "Strategic partners"
      }
    });

    const sessionFile = createMockFile("/sessions/problem/problem.session", {
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license") return "Strategic partners";
          return "";
        }
      },
      pathInFolderToLinkFileOrLocalCopy: "problem.session"
    });

    mockSession.files = [sessionFile];
    mockProject.sessions.items = [mockSession];

    const result = await getRoCrate(mockProject, mockProject);
    const graph = (result as any)["@graph"];

    const problemSessionFile = graph.find(
      (item: any) => item.name === "problem.session"
    );

    // Before the fix, this would have been: { "@id": "Strategic partners" }
    // After the fix, this should be: { "@id": "#license-reap-strategic-partners" }
    expect(problemSessionFile.license["@id"]).toBe(
      "#license-reap-strategic-partners"
    );

    // This assertion would have caught the bug
    expect(problemSessionFile.license["@id"]).not.toBe("Strategic partners");
  });
});
