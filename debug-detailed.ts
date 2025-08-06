// Debug script to trace the exact license bug path
import { RoCrateLicense } from "./src/export/ROCrate/RoCrateLicense";
import { getSessionLicenseId } from "./src/export/ROCrate/RoCrateLicenses";

// Mock objects to reproduce the issue
const mockFile = {
  properties: {
    getTextStringOrEmpty: (key: string) => {
      if (key === "license") return "Strategic partners";
      return "";
    }
  },
  getActualFilePath: () =>
    "Sessions/dde-bakala(BZV)1-ori/dde-bakala(BZV)1-ori.session",
  metadataFilePath: "Sessions/dde-bakala(BZV)1-ori/dde-bakala(BZV)1-ori.session"
} as any;

const mockSession = {
  metadataFile: {
    getTextProperty: (key: string) => {
      if (key === "access") return "Strategic partners";
      return "";
    }
  }
} as any;

const mockProject = {
  metadataFile: {
    getTextProperty: (key: string) => {
      if (key === "archiveConfigurationName") return "REAP";
      return "";
    }
  }
} as any;

console.log("=== Testing both license functions ===");

// Test the standalone function from RoCrateLicenses.ts
const standaloneResult = getSessionLicenseId(mockSession, mockProject);
console.log("Standalone getSessionLicenseId result:", standaloneResult);

// Test the instance method from RoCrateLicense.ts
const rocrateLicense = new RoCrateLicense();
const instanceResult = rocrateLicense.getSessionLicenseId(
  mockSession,
  mockProject
);
console.log("Instance getSessionLicenseId result:", instanceResult);

console.log("Results match:", standaloneResult === instanceResult);

// Now test the full ensureFileLicense flow
console.log("\n=== Testing ensureFileLicense flow ===");
rocrateLicense.ensureFileLicense(mockFile, mockSession, mockProject);
const finalResult = rocrateLicense.getFileLicense(
  "Sessions/dde-bakala(BZV)1-ori/dde-bakala(BZV)1-ori.session"
);
console.log("Final license from ensureFileLicense:", finalResult);
