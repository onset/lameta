import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import * as temp from "temp";
import fs from "fs-extra";
import Path from "path";
import { Project } from "./Project";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

const legacyContinents = ["North-America", "Middle-America", "South-America"];

let projectDirectory: string;
let projectName: string;

beforeAll(() => {
  setupLanguageFinderForTests();
});

describe("Continent migration for Americas-only configurations", () => {
  beforeEach(() => {
    projectDirectory = temp.mkdirSync("test-continent-migration");
    projectName = Path.basename(projectDirectory);
    fs.ensureDirSync(Path.join(projectDirectory, "Sessions"));
    fs.ensureDirSync(Path.join(projectDirectory, "People"));
  });

  afterEach(() => {
    temp.cleanupSync();
  });

  it.each(legacyContinents)(
    "ELAR migrates project and session %s to Americas",
    (legacyValue) => {
      writeProjectFile("ELAR", legacyValue);
      writeSession("Session1", legacyValue);

      const project = Project.fromDirectory(projectDirectory);
      const session = project.sessions.items[0];

      expect(project.properties.getTextStringOrEmpty("continent")).toBe(
        "Americas"
      );
      expect(session.properties.getTextStringOrEmpty("locationContinent")).toBe(
        "Americas"
      );
    }
  );

  it.each(legacyContinents)(
    "non-ELAR keeps %s until configuration switches to ELAR",
    (legacyValue) => {
      writeProjectFile("lameta", legacyValue);
      writeSession("Session1", legacyValue);

      let project = Project.fromDirectory(projectDirectory);
      let session = project.sessions.items[0];

      expect(project.properties.getTextStringOrEmpty("continent")).toBe(
        legacyValue
      );
      expect(session.properties.getTextStringOrEmpty("locationContinent")).toBe(
        legacyValue
      );

      writeProjectFile("ELAR", legacyValue);

      project = Project.fromDirectory(projectDirectory);
      session = project.sessions.items[0];

      expect(project.properties.getTextStringOrEmpty("continent")).toBe(
        "Americas"
      );
      expect(session.properties.getTextStringOrEmpty("locationContinent")).toBe(
        "Americas"
      );
    }
  );
});

function writeProjectFile(archiveConfig: string, continent: string): void {
  fs.writeFileSync(
    Path.join(projectDirectory, projectName + ".sprj"),
    `<?xml version="1.0" encoding="utf-8"?>
<Project>
  <ArchiveConfigurationName>${archiveConfig}</ArchiveConfigurationName>
  <Continent>${continent}</Continent>
</Project>`
  );
}

function writeSession(sessionId: string, continent: string): void {
  const sessionDir = Path.join(projectDirectory, "Sessions", sessionId);
  fs.ensureDirSync(sessionDir);
  fs.writeFileSync(
    Path.join(sessionDir, sessionId + ".session"),
    `<?xml version="1.0" encoding="utf-8"?>
<Session>
  <AdditionalFields>
    <Location_Continent type="string">${continent}</Location_Continent>
  </AdditionalFields>
</Session>`
  );
}
