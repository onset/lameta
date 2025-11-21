import { describe, it, expect } from "vitest";
import {
  getVocabularyMapping,
  createTermDefinition,
  sanitizeForIri
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
  it("should URL encode spaces", () => {
    expect(sanitizeForIri("BAKEMBA Martine")).toBe("BAKEMBA%20Martine");
    expect(sanitizeForIri("NGOMA Martin")).toBe("NGOMA%20Martin");
    expect(sanitizeForIri("Multiple  Spaces")).toBe("Multiple%20%20Spaces");
  });

  it("should URL encode parentheses and special punctuation", () => {
    expect(sanitizeForIri("BAKALA Michel (@Mfouati)")).toBe(
      "BAKALA%20Michel%20%28%40Mfouati%29"
    );
    expect(sanitizeForIri("File with!")).toBe("File%20with%21");
  });

  it("should handle empty and undefined inputs", () => {
    expect(sanitizeForIri("")).toBe("");
    expect(sanitizeForIri(undefined)).toBe("");
  });

  it("should preserve unreserved URI characters", () => {
    // encodeURIComponent preserves: A-Z a-z 0-9 - _ . ~ * '
    // But our sanitizer additionally encodes: ( ) !
    expect(sanitizeForIri("NGOMA-Martin")).toBe("NGOMA-Martin");
    expect(sanitizeForIri("file_name.ext")).toBe("file_name.ext");
    expect(sanitizeForIri("Test123")).toBe("Test123");
    expect(sanitizeForIri("test~file")).toBe("test~file");
    expect(sanitizeForIri("test'file")).toBe("test'file");
    expect(sanitizeForIri("test*file")).toBe("test*file");
  });

  describe("exotic and non-Latin character handling", () => {
    it("should properly encode Chinese characters", () => {
      const result = sanitizeForIri("张伟");
      expect(result).toBe("%E5%BC%A0%E4%BC%9F");
      // Verify it decodes back correctly
      expect(decodeURIComponent(result)).toBe("张伟");
    });

    it("should properly encode Arabic characters", () => {
      const result = sanitizeForIri("محمد");
      expect(result).toBe("%D9%85%D8%AD%D9%85%D8%AF");
      expect(decodeURIComponent(result)).toBe("محمد");
    });

    it("should properly encode Cyrillic characters", () => {
      const result = sanitizeForIri("Иван Петров");
      expect(result).toBe(
        "%D0%98%D0%B2%D0%B0%D0%BD%20%D0%9F%D0%B5%D1%82%D1%80%D0%BE%D0%B2"
      );
      expect(decodeURIComponent(result)).toBe("Иван Петров");
    });

    it("should properly encode Japanese characters (Hiragana, Katakana, Kanji)", () => {
      const result = sanitizeForIri("田中さん");
      expect(result).toBe("%E7%94%B0%E4%B8%AD%E3%81%95%E3%82%93");
      expect(decodeURIComponent(result)).toBe("田中さん");
    });

    it("should properly encode Korean characters", () => {
      const result = sanitizeForIri("김철수");
      expect(result).toBe("%EA%B9%80%EC%B2%A0%EC%88%98");
      expect(decodeURIComponent(result)).toBe("김철수");
    });

    it("should properly encode Hebrew characters", () => {
      const result = sanitizeForIri("דוד כהן");
      expect(result).toBe("%D7%93%D7%95%D7%93%20%D7%9B%D7%94%D7%9F");
      expect(decodeURIComponent(result)).toBe("דוד כהן");
    });

    it("should properly encode characters with diacritics", () => {
      expect(sanitizeForIri("José García")).toBe("Jos%C3%A9%20Garc%C3%ADa");
      expect(sanitizeForIri("François Müller")).toBe(
        "Fran%C3%A7ois%20M%C3%BCller"
      );
      expect(sanitizeForIri("Søren Østergård")).toBe(
        "S%C3%B8ren%20%C3%98sterg%C3%A5rd"
      );
    });

    it("should properly encode emoji", () => {
      const result = sanitizeForIri("User 😀");
      expect(result).toBe("User%20%F0%9F%98%80");
      expect(decodeURIComponent(result)).toBe("User 😀");
    });
  });

  describe("dangerous punctuation and special characters", () => {
    it("should encode URL-reserved characters", () => {
      expect(sanitizeForIri("a&b")).toBe("a%26b");
      expect(sanitizeForIri("a=b")).toBe("a%3Db");
      expect(sanitizeForIri("a?b")).toBe("a%3Fb");
      expect(sanitizeForIri("a#b")).toBe("a%23b");
      expect(sanitizeForIri("a/b")).toBe("a%2Fb");
      expect(sanitizeForIri("a\\b")).toBe("a%5Cb");
    });

    it("should encode square brackets and curly braces", () => {
      expect(sanitizeForIri("file[1]")).toBe("file%5B1%5D");
      expect(sanitizeForIri("data{key}")).toBe("data%7Bkey%7D");
    });

    it("should encode angle brackets", () => {
      expect(sanitizeForIri("<script>")).toBe("%3Cscript%3E");
      expect(sanitizeForIri("a<b>c")).toBe("a%3Cb%3Ec");
    });

    it("should encode quotes and backticks", () => {
      expect(sanitizeForIri('file"name')).toBe("file%22name");
      expect(sanitizeForIri("file`name")).toBe("file%60name");
    });

    it("should encode semicolons and colons", () => {
      expect(sanitizeForIri("a;b")).toBe("a%3Bb");
      expect(sanitizeForIri("a:b")).toBe("a%3Ab");
    });

    it("should encode comma and pipe", () => {
      expect(sanitizeForIri("a,b")).toBe("a%2Cb");
      expect(sanitizeForIri("a|b")).toBe("a%7Cb");
    });

    it("should encode percent signs", () => {
      expect(sanitizeForIri("100%")).toBe("100%25");
      expect(sanitizeForIri("a%20b")).toBe("a%2520b");
    });

    it("should encode plus and dollar signs", () => {
      expect(sanitizeForIri("a+b")).toBe("a%2Bb");
      expect(sanitizeForIri("$100")).toBe("%24100");
    });
  });

  describe("complex real-world names", () => {
    it("should handle names with multiple special character types", () => {
      const result = sanitizeForIri("O'Brien-Smith (Jr.)");
      expect(decodeURIComponent(result)).toBe("O'Brien-Smith (Jr.)");
    });

    it("should handle names with mixed scripts", () => {
      const result = sanitizeForIri("Александр Smith");
      expect(decodeURIComponent(result)).toBe("Александр Smith");
    });

    it("should handle file names with dangerous characters", () => {
      const result = sanitizeForIri("report_2024<draft>.pdf");
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(decodeURIComponent(result)).toBe("report_2024<draft>.pdf");
    });
  });
});
