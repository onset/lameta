import { describe, it, expect } from "vitest";
import { getVocabularyMapping, createTermDefinition, sanitizeForIri } from "../RoCrateUtils";

describe("RoCrateUtils - Vocabulary Handling", () => {
  it("should return simplified ID for unknown terms", async () => {
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
      const result = await getVocabularyMapping(
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

  it("should use normal project-specific ID for custom terms", async () => {
    const result = await getVocabularyMapping(
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
  it("should URL encode spaces instead of converting to dashes", () => {
    expect(sanitizeForIri("BAKEMBA Martine")).toBe("BAKEMBA%20Martine");
    expect(sanitizeForIri("NGOMA Martin")).toBe("NGOMA%20Martin");
    expect(sanitizeForIri("Multiple  Spaces")).toBe("Multiple%20Spaces"); // Multiple spaces collapsed to single space
  });

  it("should URL encode parentheses and exclamation marks", () => {
    expect(sanitizeForIri("BAKALA Michel (@Mfouati)")).toBe("BAKALA%20Michel%20%28@Mfouati%29");
    expect(sanitizeForIri("File with!")).toBe("File%20with%21");
  });

  it("should handle empty and undefined inputs", () => {
    expect(sanitizeForIri("")).toBe("");
    expect(sanitizeForIri(undefined)).toBe("");
  });

  it("should preserve other characters", () => {
    expect(sanitizeForIri("NGOMA-Martin")).toBe("NGOMA-Martin");
    expect(sanitizeForIri("file_name.ext")).toBe("file_name.ext");
    expect(sanitizeForIri("Test123")).toBe("Test123");
  });
});
