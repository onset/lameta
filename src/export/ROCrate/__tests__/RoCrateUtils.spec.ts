import { describe, it, expect } from "vitest";
import { getVocabularyMapping } from "../RoCrateUtils";

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
});
