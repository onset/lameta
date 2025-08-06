// Debug script to reproduce the license bug
import { RoCrateLicense } from "./src/export/ROCrate/RoCrateLicense";
import { File } from "./src/model/file/File";

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

const rocrateLicense = new RoCrateLicense();

console.log("Testing license normalization bug...");
console.log(
  "File license property:",
  mockFile.properties.getTextStringOrEmpty("license")
);
console.log(
  "Session access property:",
  mockSession.metadataFile.getTextProperty("access")
);
console.log(
  "Project archive:",
  mockProject.metadataFile.getTextProperty("archiveConfigurationName")
);

rocrateLicense.ensureFileLicense(mockFile, mockSession, mockProject);

const result = rocrateLicense.getFileLicense(
  "Sessions/dde-bakala(BZV)1-ori/dde-bakala(BZV)1-ori.session"
);
console.log("Result license ID:", result);
console.log("Expected:", "#license-reap-strategic-partners");
console.log("Bug reproduced:", result === "Strategic partners");
