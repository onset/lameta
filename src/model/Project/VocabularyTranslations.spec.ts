import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { VocabularyTranslations } from "./VocabularyTranslations";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

describe("VocabularyTranslations", () => {
  let tempDir: string;
  let vocabTranslations: VocabularyTranslations;
  const testLanguageCodes = ["es", "fr"];

  beforeEach(() => {
    // Create a temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vocab-test-"));
    vocabTranslations = new VocabularyTranslations(tempDir);
  });

  afterEach(() => {
    // Clean up temp directory
    fs.removeSync(tempDir);
  });

  describe("initialization", () => {
    it("should initialize with empty genres and roles", () => {
      expect(vocabTranslations.genres).toEqual({});
      expect(vocabTranslations.roles).toEqual({});
    });

    it("should use correct file path", () => {
      expect(vocabTranslations.filePath).toBe(
        path.join(tempDir, "vocabulary-translations.json")
      );
    });
  });

  describe("load and save", () => {
    it("should save and reload data correctly", () => {
      // Add some data using the correct API
      vocabTranslations.setGenre("folk_tale", "project", { es: "cuento popular", fr: "conte populaire" });
      vocabTranslations.setRole("speaker", "project", { es: "hablante" });

      // Save
      vocabTranslations.save();

      // Verify file exists
      expect(fs.existsSync(vocabTranslations.filePath)).toBe(true);

      // Create new instance and load
      const loaded = new VocabularyTranslations(tempDir);
      loaded.load();

      expect(loaded.getGenreTranslation("folk_tale", "es")).toBe("cuento popular");
      expect(loaded.getGenreTranslation("folk_tale", "fr")).toBe("conte populaire");
      expect(loaded.getRoleTranslation("speaker", "es")).toBe("hablante");
    });

    it("should handle missing file gracefully", () => {
      vocabTranslations.load();
      expect(vocabTranslations.genres).toEqual({});
    });

    it("should handle corrupted JSON gracefully", () => {
      // Write invalid JSON
      fs.writeFileSync(vocabTranslations.filePath, "{ invalid json }");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vocabTranslations.load();
      consoleSpy.mockRestore();

      // Should have empty data after failed load
      expect(vocabTranslations.genres).toEqual({});
    });
  });

  describe("genre translations", () => {
    it("should set and get genre translation", () => {
      vocabTranslations.setGenre("myth", "project", { es: "mito" });
      expect(vocabTranslations.getGenreTranslation("myth", "es")).toBe("mito");
    });

    it("should return undefined for missing translation", () => {
      expect(vocabTranslations.getGenreTranslation("myth", "es")).toBeUndefined();
    });

    it("should update existing genre translation", () => {
      vocabTranslations.setGenre("myth", "project", { es: "mito original" });
      vocabTranslations.updateGenreTranslation("myth", "es", "mito actualizado");
      expect(vocabTranslations.getGenreTranslation("myth", "es")).toBe("mito actualizado");
    });

    it("should ensure genre entry exists with language placeholders (excluding English)", () => {
      const languageCodes = ["en", "es", "fr"];
      vocabTranslations.ensureGenreEntry("custom_genre", "project", languageCodes);
      expect(vocabTranslations.hasGenre("custom_genre")).toBe(true);
      // Empty placeholders are stored but getGenreTranslation returns undefined for empty strings
      // This is expected behavior - empty means "no translation yet"
      // English should NOT be included since the key itself is the English value
      expect(vocabTranslations.getGenreTranslation("custom_genre", "es")).toBeUndefined();
      expect(vocabTranslations.getGenreTranslation("custom_genre", "fr")).toBeUndefined();
      
      // Verify that English is NOT in the translations object
      const genres = vocabTranslations.genres;
      expect(genres["custom_genre"].translations).not.toHaveProperty("en");
      expect(genres["custom_genre"].translations).toHaveProperty("es");
      expect(genres["custom_genre"].translations).toHaveProperty("fr");
    });

    it("should not overwrite existing translation when ensuring entry", () => {
      vocabTranslations.setGenre("genre1", "project", { es: "género uno" });
      const languageCodes = ["en", "es", "fr"];
      vocabTranslations.ensureGenreEntry("genre1", "builtin", languageCodes);
      
      // Should preserve existing translation
      expect(vocabTranslations.getGenreTranslation("genre1", "es")).toBe("género uno");
      // French placeholder is added but returns undefined because it's empty
      expect(vocabTranslations.getGenreTranslation("genre1", "fr")).toBeUndefined();
    });

    it("should detect missing translations", () => {
      vocabTranslations.setGenre("genre1", "project", { es: "género" });
      // Has es, but missing fr
      expect(vocabTranslations.isGenreMissingTranslations("genre1", ["es", "fr"])).toBe(true);
      expect(vocabTranslations.isGenreMissingTranslations("genre1", ["es"])).toBe(false);
    });

    it("should return true for missing translations when genre not in file", () => {
      // Unknown genres are considered as missing translations
      expect(vocabTranslations.isGenreMissingTranslations("unknown", ["es"])).toBe(true);
    });
  });

  describe("role translations", () => {
    it("should set and get role translation", () => {
      vocabTranslations.setRole("interviewer", "project", { es: "entrevistador" });
      expect(vocabTranslations.getRoleTranslation("interviewer", "es")).toBe("entrevistador");
    });

    it("should return undefined for missing translation", () => {
      expect(vocabTranslations.getRoleTranslation("speaker", "fr")).toBeUndefined();
    });

    it("should ensure role entry exists with language placeholders (excluding English)", () => {
      const languageCodes = ["en", "es", "fr"];
      vocabTranslations.ensureRoleEntry("custom_role", "project", languageCodes);
      expect(vocabTranslations.hasRole("custom_role")).toBe(true);
      // English should NOT be included since the key itself is the English value
      expect(vocabTranslations.getRoleTranslation("custom_role", "es")).toBeUndefined();
      expect(vocabTranslations.getRoleTranslation("custom_role", "fr")).toBeUndefined();
      
      // Verify that English is NOT in the translations object
      const roles = vocabTranslations.roles;
      expect(roles["custom_role"].translations).not.toHaveProperty("en");
      expect(roles["custom_role"].translations).toHaveProperty("es");
      expect(roles["custom_role"].translations).toHaveProperty("fr");
    });

    it("should detect missing role translations", () => {
      vocabTranslations.setRole("role1", "project", { es: "rol" });
      
      expect(vocabTranslations.isRoleMissingTranslations("role1", ["es", "fr"])).toBe(true);
      expect(vocabTranslations.isRoleMissingTranslations("role1", ["es"])).toBe(false);
    });
  });

  describe("special characters and Unicode", () => {
    it("should handle genre values with spaces and special characters", () => {
      vocabTranslations.setGenre("folk tale / myth", "project", { es: "cuento popular / mito" });
      expect(vocabTranslations.getGenreTranslation("folk tale / myth", "es")).toBe("cuento popular / mito");
    });

    it("should handle Unicode language names and translations", () => {
      vocabTranslations.setGenre("narrative", "project", {
        zh: "叙事",
        ar: "رواية",
        he: "נרטיב"
      });
      
      expect(vocabTranslations.getGenreTranslation("narrative", "zh")).toBe("叙事");
      expect(vocabTranslations.getGenreTranslation("narrative", "ar")).toBe("رواية");
      expect(vocabTranslations.getGenreTranslation("narrative", "he")).toBe("נרטיב");
    });

    it("should preserve Unicode through save/load cycle", () => {
      vocabTranslations.setGenre("story", "project", { ja: "物語" });
      vocabTranslations.setRole("narrator", "project", { ko: "이야기꾼" });
      
      vocabTranslations.save();
      
      const loaded = new VocabularyTranslations(tempDir);
      loaded.load();
      
      expect(loaded.getGenreTranslation("story", "ja")).toBe("物語");
      expect(loaded.getRoleTranslation("narrator", "ko")).toBe("이야기꾼");
    });
  });

  describe("genres and roles accessors", () => {
    it("should return all genre entries", () => {
      vocabTranslations.setGenre("genre1", "project", { es: "uno" });
      vocabTranslations.setGenre("genre2", "builtin", { es: "dos" });
      
      const genres = vocabTranslations.genres;
      expect(Object.keys(genres)).toHaveLength(2);
      expect(genres["genre1"]).toBeDefined();
      expect(genres["genre2"]).toBeDefined();
    });

    it("should return all role entries", () => {
      vocabTranslations.setRole("role1", "project", { es: "uno" });
      vocabTranslations.setRole("role2", "builtin", { es: "dos" });
      
      const roles = vocabTranslations.roles;
      expect(Object.keys(roles)).toHaveLength(2);
    });
  });

  describe("dirty tracking", () => {
    it("should track dirty state after changes", () => {
      expect(vocabTranslations.isDirty).toBe(false);
      vocabTranslations.setGenre("test", "project", { en: "test" });
      expect(vocabTranslations.isDirty).toBe(true);
    });

    it("should clear dirty state after save", () => {
      vocabTranslations.setGenre("test", "project", { en: "test" });
      vocabTranslations.save();
      expect(vocabTranslations.isDirty).toBe(false);
    });
  });
});
