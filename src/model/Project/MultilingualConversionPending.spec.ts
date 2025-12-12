import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import * as temp from "temp";
import fs from "fs-extra";
import Path from "path";
import { Project } from "./Project";
import { EncounteredVocabularyRegistry } from "./EncounteredVocabularyRegistry";
import {
  prepareGlobalFieldDefinitionCatalog,
  fieldDefinitionsOfCurrentConfig
} from "../field/ConfiguredFieldDefinitions";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

// Set up language finder so BCP47 normalization works
beforeAll(() => {
  setupLanguageFinderForTests();
});

let projectDirectory: string;
let projectName: string;

/**
 * Creates a project with the specified archive configuration.
 * Optionally adds multilingualConversionPending to the project file.
 */
function createProjectFile(
  archiveConfig: string = "lameta",
  multilingualConversionPending?: string
): string {
  const pendingTag = multilingualConversionPending !== undefined
    ? `<MultilingualConversionPending>${multilingualConversionPending}</MultilingualConversionPending>`
    : "";
  
  const sprjPath = Path.join(projectDirectory, projectName + ".sprj");
  fs.writeFileSync(
    sprjPath,
    `<?xml version="1.0" encoding="utf-8"?>
<Project>
  <Title>Test Project</Title>
  <ArchiveConfigurationName>${archiveConfig}</ArchiveConfigurationName>
  ${pendingTag}
</Project>`
  );
  return sprjPath;
}

/**
 * Creates a session folder with a session file containing the specified title.
 * If title contains "/", it simulates slash-syntax content.
 */
function createSession(sessionId: string, title: string): void {
  const sessionDir = Path.join(projectDirectory, "Sessions", sessionId);
  fs.ensureDirSync(sessionDir);
  fs.writeFileSync(
    Path.join(sessionDir, sessionId + ".session"),
    `<?xml version="1.0" encoding="utf-8"?>
<Session>
  <title type="string">${title}</title>
  <description type="string">${title}</description>
  <genre type="string">narrative</genre>
</Session>`
  );
}

describe("MultilingualConversionPending Detection", () => {
  beforeEach(() => {
    projectDirectory = temp.mkdirSync("test-multilingual-detection");
    projectName = Path.basename(projectDirectory);
    fs.ensureDirSync(Path.join(projectDirectory, "Sessions"));
    fs.ensureDirSync(Path.join(projectDirectory, "People"));
  });

  afterEach(() => {
    temp.cleanupSync();
  });

  describe("checkAndSetMultilingualConversionPending", () => {
    it("should set pending=true when ELAR config and sessions have slash-syntax", () => {
      // Create project with ELAR config (has multilingual fields)
      createProjectFile("ELAR");
      
      // Create sessions with slash-syntax content (like "English / Spanish")
      createSession("Session1", "My Title / Mi Título");
      createSession("Session2", "Another / Otro");
      createSession("Session3", "Third One / Tercero");
      createSession("Session4", "Fourth / Cuarto");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      expect(project.multilingualConversionPending).toBe(true);
    });

    it("should NOT set pending when no slash-syntax content", () => {
      // Create project with ELAR config
      createProjectFile("ELAR");
      
      // Create sessions WITHOUT slash-syntax
      createSession("Session1", "Just a plain title");
      createSession("Session2", "Another plain title");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      expect(project.multilingualConversionPending).toBe(false);
    });

    it("should NOT change pending when already set to 'true'", () => {
      // Project file already has multilingualConversionPending=true
      createProjectFile("ELAR", "true");
      
      // Sessions don't matter - should stay true
      createSession("Session1", "Plain title");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      expect(project.multilingualConversionPending).toBe(true);
    });

    it("should NOT change pending when already set to 'false' if no slash-syntax content", () => {
      // Project file already has multilingualConversionPending=false
      // No slash-syntax content, so it stays false
      createProjectFile("ELAR", "false");
      
      createSession("Session1", "Plain text");
      createSession("Session2", "More plain text");
      createSession("Session3", "Even more plain");
      createSession("Session4", "Still plain");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      // No slash-syntax, so pending stays false
      expect(project.multilingualConversionPending).toBe(false);
    });

    it("should set pending=true when sessions have slash-syntax and pending was never set", () => {
      // Project file has NO multilingualConversionPending field at all
      createProjectFile("ELAR");
      
      createSession("Session1", "English / Spanish / French");
      createSession("Session2", "One / Dos / Trois");
      createSession("Session3", "A / B / C");
      createSession("Session4", "X / Y / Z");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      expect(project.multilingualConversionPending).toBe(true);
    });

    it("should NOT set pending for lameta config (no multilingual session fields)", () => {
      // Default lameta config only has description as multilingual (on Person)
      // Not session fields like title/description
      createProjectFile("lameta");
      
      // Even with slash-syntax, config doesn't have multilingual session fields
      createSession("Session1", "English / Spanish");
      createSession("Session2", "A / B");
      createSession("Session3", "C / D");
      createSession("Session4", "E / F");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      // lameta's session fields aren't multilingual, so no pending needed
      expect(project.multilingualConversionPending).toBe(false);
    });
  });

  describe("configurationHasMultilingualFields", () => {
    it("should return true for ELAR configuration", () => {
      prepareGlobalFieldDefinitionCatalog("ELAR");
      expect(Project.configurationHasMultilingualFields()).toBe(true);
    });

    it("should return true for lameta configuration (has person description)", () => {
      prepareGlobalFieldDefinitionCatalog("lameta");
      // lameta has at least person.description as multilingual
      expect(Project.configurationHasMultilingualFields()).toBe(true);
    });
  });

  describe("detectSlashSyntaxInSessions", () => {
    it("should detect when ANY of first 4 sessions have slash-syntax", () => {
      createProjectFile("ELAR");
      
      // Only 1 of 4 has slash-syntax - should still detect
      createSession("Session1", "Plain text");
      createSession("Session2", "More plain");
      createSession("Session3", "A / B");
      createSession("Session4", "Also plain");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      // Any session with slash-syntax triggers detection
      expect(project.multilingualConversionPending).toBe(true);
    });

    it("should NOT detect when none of first 4 sessions have slash-syntax", () => {
      createProjectFile("ELAR");
      
      // 0 of 4 have slash-syntax
      createSession("Session1", "Plain text");
      createSession("Session2", "More plain");
      createSession("Session3", "Still plain");
      createSession("Session4", "Also plain");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      expect(project.multilingualConversionPending).toBe(false);
    });

    it("should detect with just 1 session that has slash-syntax", () => {
      createProjectFile("ELAR");
      
      // Single session with slash-syntax
      createSession("OnlySession", "English / Español");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      expect(project.multilingualConversionPending).toBe(true);
    });

    it("should detect with 2 sessions where 1 has slash-syntax", () => {
      createProjectFile("ELAR");
      
      createSession("Session1", "Plain text");
      createSession("Session2", "Has / Slash");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      expect(project.multilingualConversionPending).toBe(true);
    });
  });

  describe("User scenario: re-detection after migration", () => {
    it("should trigger detection when MultilingualConversionPending is empty", () => {
      // Scenario: Project file has the field but with empty value
      // This is what happens when lameta writes the field but doesn't set a value
      
      const sprjPath = Path.join(projectDirectory, projectName + ".sprj");
      fs.writeFileSync(
        sprjPath,
        `<?xml version="1.0" encoding="utf-8"?>
<Project>
  <Title>Test Project</Title>
  <ArchiveConfigurationName>ELAR</ArchiveConfigurationName>
  <MultilingualConversionPending></MultilingualConversionPending>
</Project>`
      );
      
      createSession("Session1", "English / Español");
      createSession("Session2", "One / Uno");
      createSession("Session3", "Two / Dos");
      createSession("Session4", "Three / Tres");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      // Empty value should be treated as "not set" and trigger detection
      expect(project.multilingualConversionPending).toBe(true);
    });

    it("should re-detect and re-enable pending when new slash-syntax content is added after migration", () => {
      // Scenario: User previously completed migration (pending set to false)
      // Later they added new content with slash-syntax  
      // Expected: pending should become true again to show the migration panel
      // FIXED: Now it does re-detect and set to true
      
      // Project was previously migrated (pending = false)
      createProjectFile("ELAR", "false");
      
      // User later adds new sessions with slash-syntax content
      createSession("NewSession1", "English / Español / Français");
      createSession("NewSession2", "One / Uno / Un");
      createSession("NewSession3", "Two / Dos / Deux");
      createSession("NewSession4", "Three / Tres / Trois");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      // FIXED BEHAVIOR: pending is now true because slash-syntax was detected
      expect(project.multilingualConversionPending).toBe(true);
    });

    it("should re-enable pending when slash-syntax is found after migration", () => {
      // Verifying the fix works - pending=false but slash-syntax exists
      
      createProjectFile("ELAR", "false");
      
      createSession("NewSession1", "English / Español / Français");
      createSession("NewSession2", "One / Uno / Un");
      createSession("NewSession3", "Two / Dos / Deux");
      createSession("NewSession4", "Three / Tres / Trois");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      // FIXED: Now it re-detects slash-syntax and re-enables pending
      expect(project.multilingualConversionPending).toBe(true);
    });

    it("should detect even with single session having slash-syntax among many", () => {
      createProjectFile("ELAR");
      
      // 1 of 4 has slash-syntax - should still detect
      createSession("Session1", "English / Español");
      createSession("Session2", "Plain text");
      createSession("Session3", "More plain");
      createSession("Session4", "Yet more plain");
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      // Any slash-syntax triggers detection
      expect(project.multilingualConversionPending).toBe(true);
    });

    it("should only check first 4 sessions (optimization)", () => {
      createProjectFile("ELAR");
      
      // Create 6 sessions, only last 2 have slash-syntax
      // Detection only looks at first 4, so should NOT trigger
      createSession("AAA_Session1", "Plain text");
      createSession("BBB_Session2", "More plain");
      createSession("CCC_Session3", "Still plain");
      createSession("DDD_Session4", "Yet more plain");
      createSession("EEE_Session5", "English / Español");  // Won't be checked
      createSession("FFF_Session6", "One / Uno");          // Won't be checked
      
      const project = Project.fromDirectory(
        projectDirectory,
        new EncounteredVocabularyRegistry()
      );
      
      // First 4 are plain, so no slash-syntax detected
      expect(project.multilingualConversionPending).toBe(false);
    });
  });
});
