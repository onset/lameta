import { describe, it, expect } from "vitest";
import {
  parseSlashSyntax,
  assignLanguagesToSegments,
  slashSyntaxToTaggedText,
  parseCommaSeparatedSlashSyntax,
  commaSeparatedSlashSyntaxToTaggedText
} from "./TextHolderMigration";

describe("parseSlashSyntax", () => {
  describe("basic cases", () => {
    it("should return empty segments for empty string", () => {
      const result = parseSlashSyntax("");
      expect(result.segments).toEqual([]);
      expect(result.hasSlashes).toBe(false);
    });

    it("should return single segment for text without slashes", () => {
      const result = parseSlashSyntax("hello world");
      expect(result.segments).toEqual(["hello world"]);
      expect(result.hasSlashes).toBe(false);
    });

    it("should split on slashes", () => {
      const result = parseSlashSyntax("casa/house");
      expect(result.segments).toEqual(["casa", "house"]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should handle three languages", () => {
      const result = parseSlashSyntax("casa/house/maison");
      expect(result.segments).toEqual(["casa", "house", "maison"]);
      expect(result.hasSlashes).toBe(true);
    });
  });

  describe("edge cases with empty segments", () => {
    it("should preserve trailing empty segment (casa/)", () => {
      const result = parseSlashSyntax("casa/");
      expect(result.segments).toEqual(["casa", ""]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should preserve leading empty segment (/casa)", () => {
      const result = parseSlashSyntax("/casa");
      expect(result.segments).toEqual(["", "casa"]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should preserve empty segment between slashes (casa//maison)", () => {
      const result = parseSlashSyntax("casa//maison");
      expect(result.segments).toEqual(["casa", "", "maison"]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should handle multiple consecutive slashes", () => {
      const result = parseSlashSyntax("a///b");
      expect(result.segments).toEqual(["a", "", "", "b"]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should handle just a slash", () => {
      const result = parseSlashSyntax("/");
      expect(result.segments).toEqual(["", ""]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should handle multiple slashes only", () => {
      const result = parseSlashSyntax("///");
      expect(result.segments).toEqual(["", "", "", ""]);
      expect(result.hasSlashes).toBe(true);
    });
  });

  describe("whitespace handling", () => {
    it("should preserve whitespace around segments", () => {
      const result = parseSlashSyntax(" casa / house ");
      expect(result.segments).toEqual([" casa ", " house "]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should preserve internal whitespace", () => {
      const result = parseSlashSyntax("the house/la casa");
      expect(result.segments).toEqual(["the house", "la casa"]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should handle mixed whitespace patterns", () => {
      const result = parseSlashSyntax("/casa / house");
      expect(result.segments).toEqual(["", "casa ", " house"]);
      expect(result.hasSlashes).toBe(true);
    });
  });

  describe("special characters", () => {
    it("should handle text with special characters", () => {
      const result = parseSlashSyntax("héllo/wörld/日本語");
      expect(result.segments).toEqual(["héllo", "wörld", "日本語"]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should handle text with brackets (but not our tag format)", () => {
      const result = parseSlashSyntax("[test]/[other]");
      expect(result.segments).toEqual(["[test]", "[other]"]);
      expect(result.hasSlashes).toBe(true);
    });

    it("should handle text with newlines", () => {
      const result = parseSlashSyntax("line1\nline2/other");
      expect(result.segments).toEqual(["line1\nline2", "other"]);
      expect(result.hasSlashes).toBe(true);
    });
  });
});

describe("assignLanguagesToSegments", () => {
  describe("balanced cases", () => {
    it("should assign languages to segments in order", () => {
      const result = assignLanguagesToSegments(["casa", "house"], ["es", "en"]);
      expect(result.assignments.get("es")).toBe("casa");
      expect(result.assignments.get("en")).toBe("house");
      expect(result.orderedTags).toEqual(["es", "en"]);
      expect(result.warnings).toEqual([]);
    });

    it("should handle three languages", () => {
      const result = assignLanguagesToSegments(
        ["casa", "house", "maison"],
        ["es", "en", "fr"]
      );
      expect(result.assignments.get("es")).toBe("casa");
      expect(result.assignments.get("en")).toBe("house");
      expect(result.assignments.get("fr")).toBe("maison");
      expect(result.orderedTags).toEqual(["es", "en", "fr"]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe("no slots (empty language tags)", () => {
    it("should assign all segments to unknown tags when no language tags provided", () => {
      const result = assignLanguagesToSegments(["casa", "house"], []);
      expect(result.assignments.get("unknown1")).toBe("casa");
      expect(result.assignments.get("unknown2")).toBe("house");
      expect(result.orderedTags).toEqual(["unknown1", "unknown2"]);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain("unknown1");
      expect(result.warnings[1]).toContain("unknown2");
    });

    it("should handle single segment with no tags", () => {
      const result = assignLanguagesToSegments(["hello"], []);
      expect(result.assignments.get("unknown1")).toBe("hello");
      expect(result.orderedTags).toEqual(["unknown1"]);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe("more slots than strings", () => {
    it("should assign empty strings to extra tags", () => {
      const result = assignLanguagesToSegments(["casa"], ["es", "en", "fr"]);
      expect(result.assignments.get("es")).toBe("casa");
      expect(result.assignments.get("en")).toBe("");
      expect(result.assignments.get("fr")).toBe("");
      expect(result.orderedTags).toEqual(["es", "en", "fr"]);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain("en");
      expect(result.warnings[1]).toContain("fr");
    });

    it("should handle empty segments array with tags", () => {
      const result = assignLanguagesToSegments([], ["es", "en"]);
      expect(result.assignments.get("es")).toBe("");
      expect(result.assignments.get("en")).toBe("");
      expect(result.orderedTags).toEqual(["es", "en"]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe("less slots than strings", () => {
    it("should assign extra segments to unknown tags", () => {
      const result = assignLanguagesToSegments(
        ["casa", "house", "maison", "hus"],
        ["es", "en"]
      );
      expect(result.assignments.get("es")).toBe("casa");
      expect(result.assignments.get("en")).toBe("house");
      expect(result.assignments.get("unknown1")).toBe("maison");
      expect(result.assignments.get("unknown2")).toBe("hus");
      expect(result.orderedTags).toEqual(["es", "en", "unknown1", "unknown2"]);
      expect(result.warnings).toHaveLength(2);
    });

    it("should handle single tag with multiple segments", () => {
      const result = assignLanguagesToSegments(["one", "two", "three"], ["en"]);
      expect(result.assignments.get("en")).toBe("one");
      expect(result.assignments.get("unknown1")).toBe("two");
      expect(result.assignments.get("unknown2")).toBe("three");
      expect(result.orderedTags).toEqual(["en", "unknown1", "unknown2"]);
    });
  });

  describe("empty segment handling", () => {
    it("should preserve empty segments in assignments", () => {
      const result = assignLanguagesToSegments(
        ["casa", "", "maison"],
        ["es", "en", "fr"]
      );
      expect(result.assignments.get("es")).toBe("casa");
      expect(result.assignments.get("en")).toBe("");
      expect(result.assignments.get("fr")).toBe("maison");
      expect(result.warnings).toEqual([]);
    });

    it("should handle leading empty segment", () => {
      const result = assignLanguagesToSegments(["", "house"], ["es", "en"]);
      expect(result.assignments.get("es")).toBe("");
      expect(result.assignments.get("en")).toBe("house");
      expect(result.warnings).toEqual([]);
    });
  });

  describe("whitespace preservation", () => {
    it("should preserve whitespace in segments", () => {
      const result = assignLanguagesToSegments(
        [" casa ", " house "],
        ["es", "en"]
      );
      expect(result.assignments.get("es")).toBe(" casa ");
      expect(result.assignments.get("en")).toBe(" house ");
    });
  });
});

describe("slashSyntaxToTaggedText", () => {
  describe("basic conversion", () => {
    it("should convert simple two-language text", () => {
      const result = slashSyntaxToTaggedText("casa/house", ["es", "en"]);
      expect(result).toBe("[[es]]casa[[en]]house");
    });

    it("should convert three-language text", () => {
      const result = slashSyntaxToTaggedText("casa/house/maison", [
        "es",
        "en",
        "fr"
      ]);
      expect(result).toBe("[[es]]casa[[en]]house[[fr]]maison");
    });
  });

  describe("no conversion needed", () => {
    it("should return original text when no slashes", () => {
      const result = slashSyntaxToTaggedText("hello world", ["en"]);
      expect(result).toBe("hello world");
    });

    it("should return empty string as-is", () => {
      const result = slashSyntaxToTaggedText("", ["en"]);
      expect(result).toBe("");
    });
  });

  describe("mismatched counts", () => {
    it("should handle more segments than tags", () => {
      const result = slashSyntaxToTaggedText("a/b/c", ["en"]);
      expect(result).toBe("[[en]]a[[unknown1]]b[[unknown2]]c");
    });

    it("should handle more tags than segments", () => {
      const result = slashSyntaxToTaggedText("casa", ["es", "en", "fr"]);
      // No slashes, so returns as-is
      expect(result).toBe("casa");
    });

    it("should handle empty tags array with slashes", () => {
      const result = slashSyntaxToTaggedText("a/b", []);
      expect(result).toBe("[[unknown1]]a[[unknown2]]b");
    });
  });

  describe("empty segment preservation", () => {
    it("should preserve empty segments in tagged output", () => {
      const result = slashSyntaxToTaggedText("casa//maison", [
        "es",
        "en",
        "fr"
      ]);
      expect(result).toBe("[[es]]casa[[en]][[fr]]maison");
    });

    it("should handle trailing slash", () => {
      const result = slashSyntaxToTaggedText("casa/", ["es", "en"]);
      expect(result).toBe("[[es]]casa[[en]]");
    });
  });
});

describe("parseSlashSyntax with comma-separated multilingual values", () => {
  // This tests the format: "item1-lang1 / item1-lang2, item2-lang1 / item2-lang2"
  // Real user data example: "History / Historia,Customs / Costumbres"
  // Each comma-separated item has its own slash-delimited translations

  it("documents current parseSlashSyntax behavior (splits on ALL slashes)", () => {
    // User's actual data format from incoming data
    const userInput = "History / Historia,Customs / Costumbres";

    // Current behavior: splits on ALL slashes, treating commas as part of text
    const result = parseSlashSyntax(userInput);

    // This is what parseSlashSyntax does (not the comma-aware version)
    expect(result.segments).toEqual([
      "History ",
      " Historia,Customs ",
      " Costumbres"
    ]);
  });

  it("documents current behavior with keywords example", () => {
    // Another real example from user data
    const userInput =
      "Mberyo / Mberyo,Everyday Activities / Actividades Cotidianas,Traditional Materials / Materiales";

    const result = parseSlashSyntax(userInput);

    // Current behavior - splits on ALL slashes:
    expect(result.segments).toEqual([
      "Mberyo ",
      " Mberyo,Everyday Activities ",
      " Actividades Cotidianas,Traditional Materials ",
      " Materiales"
    ]);
  });
});

describe("parseCommaSeparatedSlashSyntax", () => {
  // These tests verify the comma-aware slash syntax parser

  it("should correctly parse comma-separated items with slash translations", () => {
    const userInput = "History / Historia,Customs / Costumbres";

    const result = parseCommaSeparatedSlashSyntax(userInput, ["en", "es"]);

    expect(result.hasSlashes).toBe(true);
    expect(result.assignments.get("en")).toBe("History, Customs");
    expect(result.assignments.get("es")).toBe("Historia, Costumbres");
    expect(result.orderedTags).toEqual(["en", "es"]);
  });

  it("should handle keywords example from real user data", () => {
    const userInput =
      "Mberyo / Mberyo,Everyday Activities / Actividades Cotidianas,Traditional Materials / Materiales";

    const result = parseCommaSeparatedSlashSyntax(userInput, ["en", "es"]);

    expect(result.hasSlashes).toBe(true);
    expect(result.assignments.get("en")).toBe(
      "Mberyo, Everyday Activities, Traditional Materials"
    );
    expect(result.assignments.get("es")).toBe(
      "Mberyo, Actividades Cotidianas, Materiales"
    );
  });

  it("should handle items without slashes (monolingual items)", () => {
    const userInput = "Topic One, Topic Two";

    const result = parseCommaSeparatedSlashSyntax(userInput, ["en", "es"]);

    expect(result.hasSlashes).toBe(false);
    // When no slashes, each item is assigned to the first language only
    expect(result.assignments.get("en")).toBe("Topic One, Topic Two");
    expect(result.assignments.get("es")).toBe("");
  });

  it("should handle mixed items (some with slashes, some without)", () => {
    const userInput = "History / Historia, Plain Topic, Culture / Cultura";

    const result = parseCommaSeparatedSlashSyntax(userInput, ["en", "es"]);

    expect(result.hasSlashes).toBe(true);
    expect(result.assignments.get("en")).toBe("History, Plain Topic, Culture");
    expect(result.assignments.get("es")).toBe("Historia, Cultura");
  });

  it("should handle three languages", () => {
    const userInput =
      "History / Historia / Histoire, Culture / Cultura / Culture";

    const result = parseCommaSeparatedSlashSyntax(userInput, ["en", "es", "fr"]);

    expect(result.hasSlashes).toBe(true);
    expect(result.assignments.get("en")).toBe("History, Culture");
    expect(result.assignments.get("es")).toBe("Historia, Cultura");
    expect(result.assignments.get("fr")).toBe("Histoire, Culture");
  });

  it("should handle empty input", () => {
    const result = parseCommaSeparatedSlashSyntax("", ["en", "es"]);

    expect(result.hasSlashes).toBe(false);
    expect(result.assignments.get("en")).toBe("");
    expect(result.assignments.get("es")).toBe("");
  });

  it("should handle extra segments with unknown tags", () => {
    const userInput = "A / B / C / D, E / F / G / H";

    const result = parseCommaSeparatedSlashSyntax(userInput, ["en", "es"]);

    expect(result.hasSlashes).toBe(true);
    expect(result.assignments.get("en")).toBe("A, E");
    expect(result.assignments.get("es")).toBe("B, F");
    expect(result.assignments.get("unknown1")).toBe("C, G");
    expect(result.assignments.get("unknown2")).toBe("D, H");
    expect(result.orderedTags).toContain("unknown1");
    expect(result.orderedTags).toContain("unknown2");
  });

  it("should trim whitespace from segments", () => {
    const userInput = "  History  /  Historia  ,  Customs  /  Costumbres  ";

    const result = parseCommaSeparatedSlashSyntax(userInput, ["en", "es"]);

    expect(result.assignments.get("en")).toBe("History, Customs");
    expect(result.assignments.get("es")).toBe("Historia, Costumbres");
  });
});

describe("commaSeparatedSlashSyntaxToTaggedText", () => {
  it("should convert comma-separated slash syntax to tagged format", () => {
    const userInput = "History / Historia,Customs / Costumbres";

    const result = commaSeparatedSlashSyntaxToTaggedText(userInput, [
      "en",
      "es"
    ]);

    expect(result).toBe("[[en]]History, Customs[[es]]Historia, Costumbres");
  });

  it("should return original text when no slashes present", () => {
    const userInput = "History, Customs";

    const result = commaSeparatedSlashSyntaxToTaggedText(userInput, [
      "en",
      "es"
    ]);

    expect(result).toBe("History, Customs");
  });

  it("should handle real keywords example", () => {
    const userInput =
      "Mberyo / Mberyo,Everyday Activities / Actividades Cotidianas,Traditional Materials / Materiales";

    const result = commaSeparatedSlashSyntaxToTaggedText(userInput, [
      "en",
      "es"
    ]);

    expect(result).toBe(
      "[[en]]Mberyo, Everyday Activities, Traditional Materials[[es]]Mberyo, Actividades Cotidianas, Materiales"
    );
  });
});
