import { RoCrateLicense } from "./src/export/ROCrate/RoCrateLicense";
import { Session } from "./src/model/Project/Session/Session";
import { Project } from "./src/model/Project/Project";

// Test to debug the license issue
const rocrateLicense = new RoCrateLicense();

// Mock session that mimics the real session
const mockSession = {
  metadataFile: {
    getTextProperty: (key: string) => {
      if (key === "access") return "Strategic partners";
      return "";
    }
  },
  files: [
    {
      getActualFilePath: () => "/sessions/test/test.session",
      properties: {
        getTextStringOrEmpty: (key: string) => {
          if (key === "license") return "Strategic partners";
          return "";
        }
      }
    }
  ]
} as any;

const mockProject = {
  metadataFile: {
    getTextProperty: (key: string) => {
      if (key === "archiveConfigurationName") return "REAP";
      return "";
    }
  }
} as any;

const sessionFile = mockSession.files[0];

console.log("=== Debug License Issue ===");
console.log(
  "Session access:",
  mockSession.metadataFile.getTextProperty("access")
);
console.log(
  "File license property:",
  sessionFile.properties.getTextStringOrEmpty("license")
);

// Test the ensureFileLicense method
rocrateLicense.ensureFileLicense(sessionFile, mockSession, mockProject);

// Check what license was assigned
const result = rocrateLicense.getFileLicense("/sessions/test/test.session");
console.log("Final license ID:", result);
console.log("Expected:", "#license-reap-strategic-partners");
console.log("Is correct:", result === "#license-reap-strategic-partners");
