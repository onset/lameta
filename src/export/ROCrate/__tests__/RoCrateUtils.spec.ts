import { describe, it, expect } from "vitest";
import {
  getVocabularyMapping,
  createTermDefinition,
  sanitizeForIri,
  createFragmentId,
  createSessionId,
  createPersonId,
  createUnresolvedContributorId,
  createFileId
} from "../RoCrateUtils";

describe("RoCrateUtils - Vocabulary Handling", () => {
  it("should return simplified ID for unknown terms", () => {
    const unknownTerms = [
      "unknown",
      "Unknown",
      "<Unknown>",
      "unspecified",
      "",
      "null",
      "undefined"
    ];

    for (const term of unknownTerms) {
      const result = getVocabularyMapping(
        term,
        "genres.json", // This file might not exist but that's OK for this test
        "Test Project"
      );

      expect(result.id).toBe("tag:lameta/unknown");
      expect(result.term).toBe("tag:lameta/unknown");
      expect(result.originalTerm).toBe(term);
      expect(result.definition).toBeNull();
    }
  });

  it("should use normal project-specific ID for custom terms", () => {
    const result = getVocabularyMapping(
      "some_nonexistent_custom_genre",
      "genres.json", // This file might not exist but that's OK for this test
      "Test Project"
    );

    // Should not be the simplified unknown ID
    expect(result.id).not.toBe("tag:lameta/unknown");
    // Should contain the project name for custom terms
    expect(result.id).toContain("Test Project");
    expect(result.id).toContain("some_nonexistent_custom_genre");
  });

  it("should create clean term definitions without angle brackets for unknown terms", () => {
    const mapping = {
      id: "tag:lameta/unknown",
      term: "tag:lameta/unknown",
      originalTerm: "<Unknown>",
      definition: null
    };

    const termDefinition = createTermDefinition(mapping);

    expect(termDefinition["@id"]).toBe("tag:lameta/unknown");
    expect(termDefinition["@type"]).toBe("DefinedTerm");
    expect(termDefinition.name).toBe("Unknown"); // Should be clean without < >
    expect(termDefinition.description).toBe("Custom term: Unknown");
    expect(termDefinition.inDefinedTermSet["@id"]).toBe("#CustomGenreTerms");
  });

  it("should preserve original term names for non-unknown custom terms", () => {
    const mapping = {
      id: "tag:lameta,TestProject:genre/CustomGenre",
      term: "tag:lameta,TestProject:genre/CustomGenre",
      originalTerm: "CustomGenre",
      definition: null
    };

    const termDefinition = createTermDefinition(mapping);

    expect(termDefinition["@id"]).toBe(
      "tag:lameta,TestProject:genre/CustomGenre"
    );
    expect(termDefinition.name).toBe("CustomGenre"); // Should preserve original
    expect(termDefinition.description).toBe("Custom term: CustomGenre");
  });
});

describe("RoCrateUtils - IRI Sanitization", () => {
  it("should convert spaces to underscores", () => {
    expect(sanitizeForIri("BAKEMBA Martine")).toBe("BAKEMBA_Martine");
    expect(sanitizeForIri("NGOMA Martin")).toBe("NGOMA_Martin");
    expect(sanitizeForIri("Multiple  Spaces")).toBe("Multiple__Spaces");
  });

  it("should encode parentheses", () => {
    expect(sanitizeForIri("BAKALA Michel (@Mfouati)")).toBe(
      "BAKALA_Michel_%28@Mfouati%29"
    );
    // Exclamation marks are allowed in IRIs
    expect(sanitizeForIri("File with!")).toBe("File_with!");
  });

  it("should handle empty and undefined inputs", () => {
    expect(sanitizeForIri("")).toBe("");
    expect(sanitizeForIri(undefined)).toBe("");
  });

  it("should preserve unreserved URI characters", () => {
    expect(sanitizeForIri("NGOMA-Martin")).toBe("NGOMA-Martin");
    expect(sanitizeForIri("file_name.ext")).toBe("file_name.ext");
    expect(sanitizeForIri("Test123")).toBe("Test123");
    expect(sanitizeForIri("test~file")).toBe("test~file");
    expect(sanitizeForIri("test'file")).toBe("test'file");
    expect(sanitizeForIri("test*file")).toBe("test*file");
  });

  describe("non-Latin character handling", () => {
    it("should preserve Chinese characters (IRIs allow Unicode)", () => {
      const result = sanitizeForIri("张伟");
      expect(result).toBe("张伟");
    });

    it("should preserve Arabic characters", () => {
      const result = sanitizeForIri("محمد");
      expect(result).toBe("محمد");
    });

    it("should preserve Cyrillic characters with spaces as underscores", () => {
      const result = sanitizeForIri("Иван Петров");
      expect(result).toBe("Иван_Петров");
    });

    it("should preserve Japanese characters (Hiragana, Katakana, Kanji)", () => {
      const result = sanitizeForIri("田中さん");
      expect(result).toBe("田中さん");
    });

    it("should preserve Korean characters", () => {
      const result = sanitizeForIri("김철수");
      expect(result).toBe("김철수");
    });

    it("should preserve Hebrew characters with spaces as underscores", () => {
      const result = sanitizeForIri("דוד כהן");
      expect(result).toBe("דוד_כהן");
    });

    it("should preserve characters with diacritics", () => {
      expect(sanitizeForIri("José García")).toBe("José_García");
      expect(sanitizeForIri("François Müller")).toBe("François_Müller");
      expect(sanitizeForIri("Søren Østergård")).toBe("Søren_Østergård");
    });

    it("should preserve emoji", () => {
      const result = sanitizeForIri("User 😀");
      expect(result).toBe("User_😀");
    });
  });

  describe("IRI-reserved characters that must be encoded", () => {
    it("should encode hash (would start a new fragment)", () => {
      expect(sanitizeForIri("a#b")).toBe("a%23b");
    });

    it("should encode question mark (would start query string)", () => {
      expect(sanitizeForIri("a?b")).toBe("a%3Fb");
    });

    it("should encode slash (would be path separator)", () => {
      expect(sanitizeForIri("a/b")).toBe("a%2Fb");
    });

    it("should encode parentheses (can cause issues in some contexts)", () => {
      expect(sanitizeForIri("file(1)")).toBe("file%281%29");
    });
  });

  describe("characters allowed in IRIs (not encoded)", () => {
    it("should preserve ampersand, equals, etc.", () => {
      expect(sanitizeForIri("a&b")).toBe("a&b");
      expect(sanitizeForIri("a=b")).toBe("a=b");
      expect(sanitizeForIri("a\\b")).toBe("a\\b");
    });

    it("should preserve square brackets and curly braces", () => {
      expect(sanitizeForIri("file[1]")).toBe("file[1]");
      expect(sanitizeForIri("data{key}")).toBe("data{key}");
    });

    it("should preserve angle brackets", () => {
      expect(sanitizeForIri("<script>")).toBe("<script>");
      expect(sanitizeForIri("a<b>c")).toBe("a<b>c");
    });

    it("should preserve quotes and backticks", () => {
      expect(sanitizeForIri('file"name')).toBe('file"name');
      expect(sanitizeForIri("file`name")).toBe("file`name");
    });

    it("should preserve semicolons and colons", () => {
      expect(sanitizeForIri("a;b")).toBe("a;b");
      expect(sanitizeForIri("a:b")).toBe("a:b");
    });

    it("should preserve comma and pipe", () => {
      expect(sanitizeForIri("a,b")).toBe("a,b");
      expect(sanitizeForIri("a|b")).toBe("a|b");
    });

    it("should preserve percent signs", () => {
      expect(sanitizeForIri("100%")).toBe("100%");
      expect(sanitizeForIri("a%20b")).toBe("a%20b");
    });

    it("should preserve plus and dollar signs", () => {
      expect(sanitizeForIri("a+b")).toBe("a+b");
      expect(sanitizeForIri("$100")).toBe("$100");
    });
  });

  describe("complex real-world names", () => {
    it("should handle names with multiple special character types", () => {
      const result = sanitizeForIri("O'Brien-Smith (Jr.)");
      expect(result).toBe("O'Brien-Smith_%28Jr.%29");
    });

    it("should handle names with mixed scripts", () => {
      const result = sanitizeForIri("Александр Smith");
      expect(result).toBe("Александр_Smith");
    });

    it("should handle file names with various characters", () => {
      const result = sanitizeForIri("report_2024<draft>.pdf");
      // Angle brackets are allowed, only spaces/hash/question/slash/parens encoded
      expect(result).toBe("report_2024<draft>.pdf");
    });
  });
});

describe("RoCrateUtils - ID Generation", () => {
  describe("createFragmentId", () => {
    it("should create fragment ID with prefix and sanitized value", () => {
      expect(createFragmentId("test", "Value")).toBe("#test-Value");
      // Spaces become underscores
      expect(createFragmentId("session", "My Session")).toBe(
        "#session-My_Session"
      );
    });

    it("should encode parentheses", () => {
      expect(createFragmentId("contributor", "John (Smith)")).toBe(
        "#contributor-John_%28Smith%29"
      );
    });

    it("should preserve non-Latin characters", () => {
      // Non-Latin characters are preserved in IRIs
      expect(createFragmentId("contributor", "José")).toBe("#contributor-José");
    });

    it("should handle empty values by using prefix as fallback", () => {
      expect(createFragmentId("contributor", "")).toBe(
        "#contributor-contributor"
      );
      expect(createFragmentId("test", "   ")).toBe("#test-test");
    });

    it("should trim whitespace from values", () => {
      expect(createFragmentId("prefix", "  value  ")).toBe("#prefix-value");
    });
  });

  describe("createSessionId", () => {
    it("should create session fragment ID from filePrefix", () => {
      expect(createSessionId({ filePrefix: "Session001" })).toBe(
        "#session-Session001"
      );
    });

    it("should handle sessions with special characters", () => {
      expect(createSessionId({ filePrefix: "My Session (2024)" })).toBe(
        "#session-My_Session_%282024%29"
      );
    });

    it("should use 'session' as default for missing filePrefix", () => {
      expect(createSessionId({})).toBe("#session-session");
      expect(createSessionId(null)).toBe("#session-session");
      expect(createSessionId(undefined)).toBe("#session-session");
    });
  });

  describe("createPersonId", () => {
    it("should create person fragment ID without prefix", () => {
      expect(createPersonId({ filePrefix: "John_Smith" })).toBe("#John_Smith");
    });

    it("should convert spaces to underscores", () => {
      expect(createPersonId({ filePrefix: "John Smith" })).toBe("#John_Smith");
    });

    it("should encode parentheses", () => {
      expect(createPersonId({ filePrefix: "John (Smith)" })).toBe(
        "#John_%28Smith%29"
      );
    });

    it("should use 'person' as default for missing filePrefix", () => {
      expect(createPersonId({})).toBe("#person");
      expect(createPersonId(null)).toBe("#person");
      expect(createPersonId(undefined)).toBe("#person");
    });
  });

  describe("createUnresolvedContributorId", () => {
    it("should create bare fragment ID without prefix", () => {
      // Spaces become underscores, but no prefix
      expect(createUnresolvedContributorId("John Smith")).toBe("#John_Smith");
    });

    it("should encode parentheses", () => {
      expect(createUnresolvedContributorId("John (Consultant)")).toBe(
        "#John_%28Consultant%29"
      );
    });

    it("should preserve non-Latin characters", () => {
      // Non-Latin characters are preserved in IRIs
      expect(createUnresolvedContributorId("José")).toBe("#José");
    });

    it("should handle empty contributor names", () => {
      expect(createUnresolvedContributorId("")).toBe("#contributor");
    });
  });

  describe("createFileId", () => {
    it("should create session file path for session folders", () => {
      const sessionFolder = {
        filePrefix: "Session001",
        getAllContributionsToAllFiles: () => []
      };
      expect(createFileId(sessionFolder, "audio.wav")).toBe(
        "Sessions/Session001/audio.wav"
      );
    });

    it("should create person file path for person folders", () => {
      const personFolder = {
        filePrefix: "John_Smith",
        knownFields: [],
        files: []
      };
      expect(createFileId(personFolder, "photo.jpg")).toBe(
        "People/John_Smith/photo.jpg"
      );
    });

    it("should create root-relative path for project folders", () => {
      const projectFolder = {
        filePrefix: "MyProject",
        sessions: []
      };
      expect(createFileId(projectFolder, "project.sprj")).toBe(
        "./project.sprj"
      );
    });

    it("should sanitize special characters in file names", () => {
      const sessionFolder = {
        filePrefix: "Session001",
        getAllContributionsToAllFiles: () => []
      };
      // Spaces become underscores
      expect(createFileId(sessionFolder, "file with spaces.wav")).toBe(
        "Sessions/Session001/file_with_spaces.wav"
      );
    });
  });
});
