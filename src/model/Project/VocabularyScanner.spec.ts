import { describe, expect, it, beforeEach, afterEach, vi, beforeAll } from "vitest";
import {
  isBuiltInGenre,
  isBuiltInRole,
  scanProjectForVocabulary,
  updateTranslationsFromScan,
  HARDCODED_EXPORT_GENRES,
  HARDCODED_EXPORT_ROLES
} from "./VocabularyScanner";
import { VocabularyTranslations } from "./VocabularyTranslations";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

// Set up language finder so BCP47 normalization works
beforeAll(() => {
  setupLanguageFinderForTests();
});

describe("VocabularyScanner", () => {
  describe("HARDCODED_EXPORT_GENRES", () => {
    it("should include 'Consent' for consent bundle exports", () => {
      expect(HARDCODED_EXPORT_GENRES).toContain("Consent");
    });

    it("should only contain genres that are built-in", () => {
      // All hardcoded export genres should exist in genres.json
      for (const genre of HARDCODED_EXPORT_GENRES) {
        expect(isBuiltInGenre(genre)).toBe(true);
      }
    });
  });

  describe("HARDCODED_EXPORT_ROLES", () => {
    it("should include 'Researcher' for project document bundle exports", () => {
      expect(HARDCODED_EXPORT_ROLES).toContain("Researcher");
    });

    it("should only contain roles that are built-in", () => {
      // All hardcoded export roles should exist in OLAC roles
      for (const role of HARDCODED_EXPORT_ROLES) {
        expect(isBuiltInRole(role)).toBe(true);
      }
    });
  });

  describe("isBuiltInGenre", () => {
    it("should return true for built-in genre IDs", () => {
      expect(isBuiltInGenre("drama")).toBe(true);
      expect(isBuiltInGenre("narrative")).toBe(true);
      expect(isBuiltInGenre("procedural_discourse")).toBe(true);
    });

    it("should return true for built-in genre labels", () => {
      expect(isBuiltInGenre("Drama")).toBe(true);
      expect(isBuiltInGenre("Narrative")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(isBuiltInGenre("DRAMA")).toBe(true);
      expect(isBuiltInGenre("Drama")).toBe(true);
      expect(isBuiltInGenre("drama")).toBe(true);
    });

    it("should return false for custom genre values", () => {
      expect(isBuiltInGenre("my_custom_genre")).toBe(false);
      expect(isBuiltInGenre("folk tale")).toBe(false);
      expect(isBuiltInGenre("community event")).toBe(false);
    });
  });

  describe("isBuiltInRole", () => {
    it("should return true for built-in OLAC roles", () => {
      expect(isBuiltInRole("speaker")).toBe(true);
      expect(isBuiltInRole("recorder")).toBe(true);
      expect(isBuiltInRole("researcher")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(isBuiltInRole("SPEAKER")).toBe(true);
      expect(isBuiltInRole("Speaker")).toBe(true);
    });

    it("should return false for custom roles", () => {
      expect(isBuiltInRole("my_custom_role")).toBe(false);
      expect(isBuiltInRole("community helper")).toBe(false);
    });
  });

  describe("updateTranslationsFromScan", () => {
    let tempDir: string;
    let vocabTranslations: VocabularyTranslations;
    const testLanguageCodes = ["es", "fr"];

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vocab-scanner-test-"));
      vocabTranslations = new VocabularyTranslations(tempDir);
    });

    afterEach(() => {
      fs.removeSync(tempDir);
    });

    it("should add custom genre entries as project source", () => {
      const scanResult = {
        customGenres: new Set(["my_custom_genre", "another_custom"]),
        builtInGenresMissingTranslations: new Set<string>(),
        customRoles: new Set<string>(),
        builtInRolesMissingTranslations: new Set<string>(),
        sessionsScanned: 5,
        peopleScanned: 3
      };

      updateTranslationsFromScan(vocabTranslations, scanResult, testLanguageCodes);

      expect(vocabTranslations.hasGenre("my_custom_genre")).toBe(true);
      expect(vocabTranslations.hasGenre("another_custom")).toBe(true);
    });

    it("should add built-in genres missing translations as builtin source", () => {
      const scanResult = {
        customGenres: new Set<string>(),
        builtInGenresMissingTranslations: new Set(["drama", "narrative"]),
        customRoles: new Set<string>(),
        builtInRolesMissingTranslations: new Set<string>(),
        sessionsScanned: 5,
        peopleScanned: 3
      };

      updateTranslationsFromScan(vocabTranslations, scanResult, testLanguageCodes);

      expect(vocabTranslations.hasGenre("drama")).toBe(true);
      expect(vocabTranslations.hasGenre("narrative")).toBe(true);
    });

    it("should add custom role entries", () => {
      const scanResult = {
        customGenres: new Set<string>(),
        builtInGenresMissingTranslations: new Set<string>(),
        customRoles: new Set(["community_helper"]),
        builtInRolesMissingTranslations: new Set<string>(),
        sessionsScanned: 5,
        peopleScanned: 3
      };

      updateTranslationsFromScan(vocabTranslations, scanResult, testLanguageCodes);

      expect(vocabTranslations.hasRole("community_helper")).toBe(true);
    });

    it("should not overwrite existing translations", () => {
      // Pre-populate with an existing entry
      vocabTranslations.setGenre("my_genre", "project", { es: "mi género" });

      const scanResult = {
        customGenres: new Set(["my_genre"]),
        builtInGenresMissingTranslations: new Set<string>(),
        customRoles: new Set<string>(),
        builtInRolesMissingTranslations: new Set<string>(),
        sessionsScanned: 5,
        peopleScanned: 3
      };

      updateTranslationsFromScan(vocabTranslations, scanResult, testLanguageCodes);

      // Should preserve existing translation
      expect(vocabTranslations.getGenreTranslation("my_genre", "es")).toBe("mi género");
    });

    it("should handle special characters in values", () => {
      const scanResult = {
        customGenres: new Set(["folk tale / myth", "genre with spaces"]),
        builtInGenresMissingTranslations: new Set<string>(),
        customRoles: new Set(["helper's role"]),
        builtInRolesMissingTranslations: new Set<string>(),
        sessionsScanned: 5,
        peopleScanned: 3
      };

      updateTranslationsFromScan(vocabTranslations, scanResult, testLanguageCodes);

      expect(vocabTranslations.hasGenre("folk tale / myth")).toBe(true);
      expect(vocabTranslations.hasGenre("genre with spaces")).toBe(true);
      expect(vocabTranslations.hasRole("helper's role")).toBe(true);
    });
  });

  // Note: Testing scanProjectForVocabulary requires a more complex setup with
  // actual Project, Session, and Person instances. These are better tested
  // through integration tests or e2e tests.
});
