import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { TextHolder } from "./TextHolder";

describe("TextHolder multilingual", () => {
  it("should set and get text", () => {
    const t = new TextHolder();
    t.setTextAxis("en", "house");
    expect(t.getSerialized()).toBe("house");
    expect(t.getTextAxis("en")).toBe("house");
    expect(t.getSerialized()).toBe("house");
    t.setTextAxis("es", "casa");
    expect(t.getSerialized()).toBe("[[en]]house[[es]]casa");
    expect(t.getTextAxis("es")).toBe("casa");
    expect(t.getTextAxis("en")).toBe("house");
    t.setTextAxis("es", " ");
    expect(t.getTextAxis("es")).toBe("");
    expect(t.getSerialized()).toBe("house");
  });

  it("throws if language is empty", () => {
    const textHolder = new TextHolder();
    expect(() => textHolder.setTextAxis("", "house")).toThrowError();
  });
});

describe("TextHolder.getFirstNonEmptyText", () => {
  it("should return empty string if no text is set for any language", () => {
    const t = new TextHolder();
    expect(t.getFirstNonEmptyText(["en"])).toBe("");
  });
  // note, the behavior we would want for this is not 100% clear. Maybe 90% clear.
  // we could say well show them something even if it isn't in the list
  it("should return empty if no text is set for the requested languages", () => {
    const t = new TextHolder();
    t.setTextAxis("es", "casa");
    expect(t.getFirstNonEmptyText(["en", "fr"])).toBe("");
  });
  it("should return the first match", () => {
    const t = new TextHolder();
    t.setTextAxis("es", "casa");
    t.setTextAxis("en", "house");
    expect(t.getFirstNonEmptyText(["en", "es"])).toBe("house");
    expect(t.getFirstNonEmptyText(["es", "en"])).toBe("casa");
  });
});

// describe("TextHolder.parseSerialized", () => {
//   it("should parse a serialized string", () => {
//     const t = TextHolder.parseSerialized("[[en]]house[[es]]casa");
//     expect(t.getTextAxis("en")).toBe("house");
//     expect(t.getTextAxis("es")).toBe("casa");
//   });
//   it("should parse a serialized string with no language tags", () => {
//     const t = TextHolder.parseSerialized("house");
//     expect(t.getTextAxis("en")).toBe("house");
//     expect(t.getTextAxis("es")).toBe("");
//     expect(t.monoLingualText).toBe("house");
//   });
// });

describe("TextHolder.monoLingualText", () => {
  it("returns empty string when no value is set", () => {
    const textHolder = new TextHolder();
    expect(textHolder.monoLingualText).toBe("");
  });
  it("returns the value that was set", () => {
    const textHolder = new TextHolder();
    textHolder.monoLingualText = "foo";
    expect(textHolder.monoLingualText).toBe("foo");
  });
  it("can be changed", () => {
    const textHolder = new TextHolder();
    textHolder.monoLingualText = "foo";
    expect(textHolder.monoLingualText).toBe("foo");
    textHolder.monoLingualText = "bar";
    expect(textHolder.monoLingualText).toBe("bar");
  });
  it("can be changed back to empty string", () => {
    const textHolder = new TextHolder();
    textHolder.monoLingualText = "foo";
    expect(textHolder.monoLingualText).toBe("foo");
    textHolder.monoLingualText = "";
    expect(textHolder.monoLingualText).toBe("");
  });
});

describe("TextHolder migration: multilingual ↔ monolingual", () => {
  describe("getAllNonEmptyTextAxes behavior", () => {
    it("should return ['en'] for plain untagged text", () => {
      const textHolder = new TextHolder();
      textHolder._text = "Plain monolingual text";

      const axes = textHolder.getAllNonEmptyTextAxes();
      expect(axes).toEqual(["en"]);
    });

    it("should return correct axes for tagged multilingual text", () => {
      const textHolder = new TextHolder();
      textHolder.setTextAxis("en", "English");
      textHolder.setTextAxis("es", "Español");

      const axes = textHolder.getAllNonEmptyTextAxes();
      expect(axes.length).toBe(2);
      expect(axes).toContain("en");
      expect(axes).toContain("es");
    });

    it("should return [] for empty text", () => {
      const textHolder = new TextHolder();
      // A freshly constructed TextHolder has empty text by default

      const axes = textHolder.getAllNonEmptyTextAxes();
      expect(axes).toEqual([]);
    });
  });

  describe("multilingual → monolingual: preserves tagged text verbatim", () => {
    it("should return raw tagged text when reading as monolingual", () => {
      const textHolder = new TextHolder();
      textHolder.setTextAxis("en", "house");
      textHolder.setTextAxis("es", "casa");
      expect(textHolder.getSerialized()).toBe("[[en]]house[[es]]casa");

      // When reading as monolingual, should return the raw tagged string
      expect(textHolder.monoLingualText).toBe("[[en]]house[[es]]casa");
    });

    it("should preserve tagged text with multiple languages", () => {
      const textHolder = new TextHolder();
      textHolder.setTextAxis("en", "Hello");
      textHolder.setTextAxis("es", "Hola");
      textHolder.setTextAxis("fr", "Bonjour");

      const serialized = textHolder.getSerialized();
      expect(serialized).toContain("[[en]]Hello");
      expect(serialized).toContain("[[es]]Hola");
      expect(serialized).toContain("[[fr]]Bonjour");

      // Monolingual text should show it all
      expect(textHolder.monoLingualText).toBe(serialized);
    });

    it("should handle tagged text with special characters", () => {
      const textHolder = new TextHolder();
      textHolder.setTextAxis("en", 'Text with <html> & "quotes"');
      textHolder.setTextAxis("es", "Texto con / \\ caracteres");

      const serialized = textHolder.getSerialized();
      expect(textHolder.monoLingualText).toBe(serialized);
    });

    it("should preserve tagged text with Unicode and RTL languages", () => {
      const textHolder = new TextHolder();
      textHolder.setTextAxis("en", "English text");
      textHolder.setTextAxis("ar", "نص عربي للاختبار");
      textHolder.setTextAxis("zh", "中文测试文本");

      const serialized = textHolder.getSerialized();
      expect(textHolder.monoLingualText).toBe(serialized);
    });
  });

  describe("monolingual → multilingual: treats plain text as English", () => {
    it("should treat plain text as English when reading as multilingual", () => {
      const textHolder = new TextHolder();
      textHolder.monoLingualText = "plain text";

      // When reading as English axis, should return the plain text
      expect(textHolder.getTextAxis("en")).toBe("plain text");
    });

    it("should return empty for non-English axes when text is plain", () => {
      const textHolder = new TextHolder();
      textHolder.monoLingualText = "plain text";

      expect(textHolder.getTextAxis("en")).toBe("plain text");
      expect(textHolder.getTextAxis("es")).toBe("");
      expect(textHolder.getTextAxis("fr")).toBe("");
    });

    it("should handle plain text with special characters", () => {
      const textHolder = new TextHolder();
      const specialText =
        'Text with <html>, "quotes", & ampersands, slashes/backslashes\\';
      textHolder.monoLingualText = specialText;

      expect(textHolder.getTextAxis("en")).toBe(specialText);
    });

    it("should handle plain text with Unicode characters", () => {
      const textHolder = new TextHolder();
      const unicodeText = "Text with émojis 🎉 and Chinese 中文 and Arabic نص";
      textHolder.monoLingualText = unicodeText;

      expect(textHolder.getTextAxis("en")).toBe(unicodeText);
    });
  });

  describe("round-trip preservation: mono→multi→mono→multi", () => {
    it("should preserve data through mono→multi→mono cycle", () => {
      const textHolder = new TextHolder();

      // Start monolingual
      textHolder.monoLingualText = "original text";
      expect(textHolder.monoLingualText).toBe("original text");

      // Add Spanish (now multilingual)
      textHolder.setTextAxis("es", "texto original");
      expect(textHolder.getSerialized()).toBe(
        "[[en]]original text[[es]]texto original"
      );

      // Read as monolingual (should show tagged format)
      expect(textHolder.monoLingualText).toBe(
        "[[en]]original text[[es]]texto original"
      );

      // Back to multilingual - should still parse correctly
      expect(textHolder.getTextAxis("en")).toBe("original text");
      expect(textHolder.getTextAxis("es")).toBe("texto original");
    });

    it("should preserve multilingual data when written as monolingual", () => {
      const textHolder = new TextHolder();

      // Start with multilingual data
      textHolder.setTextAxis("en", "house");
      textHolder.setTextAxis("es", "casa");
      textHolder.setTextAxis("fr", "maison");

      const originalSerialized = textHolder.getSerialized();

      // Read as monolingual (gets the tagged format)
      const monoView = textHolder.monoLingualText;
      expect(monoView).toBe(originalSerialized);

      // Create new holder and set it monolingual with the tagged format
      const textHolder2 = new TextHolder();
      textHolder2.combinedText = monoView;

      // Should parse back to multilingual correctly
      expect(textHolder2.getTextAxis("en")).toBe("house");
      expect(textHolder2.getTextAxis("es")).toBe("casa");
      expect(textHolder2.getTextAxis("fr")).toBe("maison");
    });

    it("should handle complex round-trip with modifications", () => {
      const textHolder = new TextHolder();

      // 1. Start monolingual
      textHolder.monoLingualText = "version 1";

      // 2. Go multilingual, add Spanish
      textHolder.setTextAxis("es", "versión 1");
      expect(textHolder.getTextAxis("en")).toBe("version 1");
      expect(textHolder.getTextAxis("es")).toBe("versión 1");

      // 3. Simulate going back to monolingual view
      const tagged = textHolder.monoLingualText;
      expect(tagged).toBe("[[en]]version 1[[es]]versión 1");

      // 4. Go multilingual again, modify English
      textHolder.setTextAxis("en", "version 2");
      expect(textHolder.getTextAxis("en")).toBe("version 2");
      expect(textHolder.getTextAxis("es")).toBe("versión 1");

      // 5. Add French
      textHolder.setTextAxis("fr", "version française");
      expect(textHolder.getTextAxis("en")).toBe("version 2");
      expect(textHolder.getTextAxis("es")).toBe("versión 1");
      expect(textHolder.getTextAxis("fr")).toBe("version française");
    });
  });

  describe("edge cases", () => {
    it("should handle empty text in both mono and multi modes", () => {
      const textHolder = new TextHolder();
      expect(textHolder.monoLingualText).toBe("");
      expect(textHolder.getTextAxis("en")).toBe("");
    });

    it("should handle whitespace-only text", () => {
      const textHolder = new TextHolder();
      textHolder.monoLingualText = "   ";

      // Whitespace-only is stored
      expect(textHolder.monoLingualText).toBe("   ");
      expect(textHolder.getTextAxis("en")).toBe("   ");
    });

    it("should handle literal [[ in content when monolingual", () => {
      const textHolder = new TextHolder();
      const textWithBrackets = "This text has [[ literal brackets ]] in it";
      textHolder.monoLingualText = textWithBrackets;

      // Should preserve the literal brackets
      expect(textHolder.monoLingualText).toBe(textWithBrackets);
      // When read as multilingual axis, should also work
      expect(textHolder.getTextAxis("en")).toBe(textWithBrackets);
    });

    it("should handle multilingual text without English", () => {
      const textHolder = new TextHolder();
      textHolder.setTextAxis("es", "solo español");
      textHolder.setTextAxis("fr", "seulement français");

      const serialized = textHolder.getSerialized();
      expect(serialized).toContain("[[es]]solo español");
      expect(serialized).toContain("[[fr]]seulement français");

      // English should be empty
      expect(textHolder.getTextAxis("en")).toBe("");

      // Monolingual view shows tagged format
      expect(textHolder.monoLingualText).toBe(serialized);
    });

    it("should handle text with newlines and tabs", () => {
      const textHolder = new TextHolder();
      const textWithWhitespace = "Line 1\nLine 2\n\tIndented";
      textHolder.monoLingualText = textWithWhitespace;

      expect(textHolder.monoLingualText).toBe(textWithWhitespace);
      expect(textHolder.getTextAxis("en")).toBe(textWithWhitespace);
    });

    it("should handle very long text", () => {
      const textHolder = new TextHolder();
      const longText = "This is a long sentence. ".repeat(100);
      textHolder.monoLingualText = longText;

      expect(textHolder.monoLingualText).toBe(longText);
      expect(textHolder.getTextAxis("en")).toBe(longText);

      // Add translation with long text
      const longSpanish = "Esta es una oración larga. ".repeat(100);
      textHolder.setTextAxis("es", longSpanish);

      expect(textHolder.getTextAxis("en")).toBe(longText);
      expect(textHolder.getTextAxis("es")).toBe(longSpanish);
    });

    it("should handle emoji and complex Unicode", () => {
      const textHolder = new TextHolder();
      const emojiText = "Emoji test: 🎉🌍🚀👍 and combining chars: é (e + ´)";
      textHolder.monoLingualText = emojiText;

      expect(textHolder.monoLingualText).toBe(emojiText);
      expect(textHolder.getTextAxis("en")).toBe(emojiText);
    });
  });
});

describe("TextHolder slash syntax virtual conversion", () => {
  describe("looksLikeSlashSyntax", () => {
    it("should return false for empty string", () => {
      const t = new TextHolder();
      expect(t.looksLikeSlashSyntax()).toBe(false);
    });

    it("should return false for plain text without slashes", () => {
      const t = new TextHolder();
      t.monoLingualText = "hello world";
      expect(t.looksLikeSlashSyntax()).toBe(false);
    });

    it("should return true for text with space-slash-space", () => {
      const t = new TextHolder();
      t.monoLingualText = "casa / house";
      expect(t.looksLikeSlashSyntax()).toBe(true);
    });

    it("should return false for tight slashes (dates, paths)", () => {
      const t = new TextHolder();
      t.monoLingualText = "01/01/2029";
      expect(t.looksLikeSlashSyntax()).toBe(false);
    });

    it("should return false for already-tagged text", () => {
      const t = new TextHolder();
      t.setTextAxis("en", "house");
      t.setTextAxis("es", "casa");
      expect(t.looksLikeSlashSyntax()).toBe(false);
    });

    it("should return false for tagged text even if it contains slashes in content", () => {
      const t = new TextHolder();
      // Need two languages to force tagged format storage
      t.setTextAxis("en", "path/to/file");
      t.setTextAxis("es", "ruta");
      // Now it starts with [[ so should not look like slash syntax
      expect(t.looksLikeSlashSyntax()).toBe(false);
    });

    it("should return false for English-only text with tight slashes", () => {
      // With the new space-slash-space requirement, paths/dates no longer
      // trigger false positives
      const t = new TextHolder();
      t.setTextAxis("en", "path/to/file");
      // Stored as plain "path/to/file" - no space-slash-space
      expect(t.looksLikeSlashSyntax()).toBe(false);
    });

    it("should return true for text with multiple space-slash-space", () => {
      const t = new TextHolder();
      t.monoLingualText = "casa / house / maison";
      expect(t.looksLikeSlashSyntax()).toBe(true);
    });
  });

  describe("getTextAxisVirtual", () => {
    it("should return virtual interpretation for slash syntax", () => {
      const t = new TextHolder();
      t.monoLingualText = "casa / house";
      expect(t.getTextAxisVirtual("es", ["es", "en"])).toBe("casa");
      expect(t.getTextAxisVirtual("en", ["es", "en"])).toBe("house");
    });

    it("should fall back to normal getTextAxis when not slash syntax", () => {
      const t = new TextHolder();
      t.setTextAxis("en", "house");
      t.setTextAxis("es", "casa");
      expect(t.getTextAxisVirtual("en", ["es", "en"])).toBe("house");
      expect(t.getTextAxisVirtual("es", ["es", "en"])).toBe("casa");
    });

    it("should handle more segments than tags", () => {
      const t = new TextHolder();
      t.monoLingualText = "one / two / three / four";
      expect(t.getTextAxisVirtual("en", ["en", "es"])).toBe("one");
      expect(t.getTextAxisVirtual("es", ["en", "es"])).toBe("two");
      expect(t.getTextAxisVirtual("unknown1", ["en", "es"])).toBe("three");
      expect(t.getTextAxisVirtual("unknown2", ["en", "es"])).toBe("four");
    });

    it("should trim whitespace from virtual segments", () => {
      const t = new TextHolder();
      t.monoLingualText = " casa / house ";
      expect(t.getTextAxisVirtual("es", ["es", "en"])).toBe("casa");
      expect(t.getTextAxisVirtual("en", ["es", "en"])).toBe("house");
    });

    it("should not modify stored text", () => {
      const t = new TextHolder();
      t.monoLingualText = "casa / house";
      t.getTextAxisVirtual("es", ["es", "en"]);
      t.getTextAxisVirtual("en", ["es", "en"]);
      expect(t.monoLingualText).toBe("casa / house");
    });
  });

  describe("getVirtualMultiAxisView", () => {
    it("should return null when not slash syntax", () => {
      const t = new TextHolder();
      t.monoLingualText = "plain text";
      expect(t.getVirtualMultiAxisView(["en"])).toBeNull();
    });

    it("should return map of all virtual axes", () => {
      const t = new TextHolder();
      t.monoLingualText = "casa / house / maison";
      const view = t.getVirtualMultiAxisView(["es", "en", "fr"]);
      expect(view).not.toBeNull();
      expect(view!.get("es")).toBe("casa");
      expect(view!.get("en")).toBe("house");
      expect(view!.get("fr")).toBe("maison");
    });

    it("should include unknown tags for extra segments", () => {
      const t = new TextHolder();
      t.monoLingualText = "a / b / c";
      const view = t.getVirtualMultiAxisView(["en"]);
      expect(view).not.toBeNull();
      expect(view!.get("en")).toBe("a");
      expect(view!.get("unknown1")).toBe("b");
      expect(view!.get("unknown2")).toBe("c");
    });
  });

  describe("commitSlashSyntaxConversion", () => {
    it("should convert slash syntax to tagged format", () => {
      const t = new TextHolder();
      t.monoLingualText = "casa / house";
      const result = t.commitSlashSyntaxConversion(["es", "en"]);
      expect(result).toBe(true);
      expect(t.monoLingualText).toBe("[[es]]casa[[en]]house");
      expect(t.getTextAxis("es")).toBe("casa");
      expect(t.getTextAxis("en")).toBe("house");
    });

    it("should return false when not slash syntax", () => {
      const t = new TextHolder();
      t.monoLingualText = "plain text";
      const result = t.commitSlashSyntaxConversion(["en"]);
      expect(result).toBe(false);
      expect(t.monoLingualText).toBe("plain text");
    });

    it("should return false for tight slashes (dates, paths)", () => {
      const t = new TextHolder();
      t.monoLingualText = "01/01/2029";
      const result = t.commitSlashSyntaxConversion(["es", "en"]);
      expect(result).toBe(false);
      expect(t.monoLingualText).toBe("01/01/2029");
    });

    it("should handle three languages", () => {
      const t = new TextHolder();
      t.monoLingualText = "casa / house / maison";
      t.commitSlashSyntaxConversion(["es", "en", "fr"]);
      expect(t.getTextAxis("es")).toBe("casa");
      expect(t.getTextAxis("en")).toBe("house");
      expect(t.getTextAxis("fr")).toBe("maison");
    });

    it("should add unknown tags for extra segments", () => {
      const t = new TextHolder();
      t.monoLingualText = "a / b / c / d";
      t.commitSlashSyntaxConversion(["en", "es"]);
      expect(t.getTextAxis("en")).toBe("a");
      expect(t.getTextAxis("es")).toBe("b");
      expect(t.getTextAxis("unknown1")).toBe("c");
      expect(t.getTextAxis("unknown2")).toBe("d");
    });

    it("should skip empty segments in output", () => {
      const t = new TextHolder();
      t.monoLingualText = "casa /  / maison";
      t.commitSlashSyntaxConversion(["es", "en", "fr"]);
      // Empty segment for "en" should not appear in output
      expect(t.monoLingualText).toBe("[[es]]casa[[fr]]maison");
      expect(t.getTextAxis("es")).toBe("casa");
      expect(t.getTextAxis("en")).toBe("");
      expect(t.getTextAxis("fr")).toBe("maison");
    });

    it("should no longer look like slash syntax after commit", () => {
      const t = new TextHolder();
      t.monoLingualText = "casa / house";
      expect(t.looksLikeSlashSyntax()).toBe(true);
      t.commitSlashSyntaxConversion(["es", "en"]);
      expect(t.looksLikeSlashSyntax()).toBe(false);
    });
  });

  describe("comma-separated slash syntax conversion", () => {
    // Tests for fields with separatorWithCommaInstructions (like topic, keyword)
    // Format: "item1-lang1 / item1-lang2, item2-lang1 / item2-lang2"

    it("should convert comma-separated items with per-item slash syntax", () => {
      const t = new TextHolder();
      t.monoLingualText = "History / Historia, Customs / Costumbres";
      const result = t.commitSlashSyntaxConversion(["en", "es"], true);
      expect(result).toBe(true);
      expect(t.getTextAxis("en")).toBe("History, Customs");
      expect(t.getTextAxis("es")).toBe("Historia, Costumbres");
    });

    it("should handle keywords example from real user data", () => {
      const t = new TextHolder();
      t.monoLingualText =
        "Mberyo / Mberyo,Everyday Activities / Actividades Cotidianas,Traditional Materials / Materiales";
      t.commitSlashSyntaxConversion(["en", "es"], true);
      expect(t.getTextAxis("en")).toBe(
        "Mberyo, Everyday Activities, Traditional Materials"
      );
      expect(t.getTextAxis("es")).toBe(
        "Mberyo, Actividades Cotidianas, Materiales"
      );
    });

    it("getTextAxisVirtual should parse comma-separated slash syntax correctly", () => {
      const t = new TextHolder();
      t.monoLingualText = "History / Historia, Customs / Costumbres";
      expect(t.getTextAxisVirtual("en", ["en", "es"], true)).toBe(
        "History, Customs"
      );
      expect(t.getTextAxisVirtual("es", ["en", "es"], true)).toBe(
        "Historia, Costumbres"
      );
      // Should not modify original text
      expect(t.monoLingualText).toBe(
        "History / Historia, Customs / Costumbres"
      );
    });

    it("getVirtualMultiAxisView should return all axes for comma-separated", () => {
      const t = new TextHolder();
      t.monoLingualText = "A / B, C / D";
      const view = t.getVirtualMultiAxisView(["en", "es"], true);
      expect(view).not.toBeNull();
      expect(view!.get("en")).toBe("A, C");
      expect(view!.get("es")).toBe("B, D");
    });

    it("should handle mixed items (some with slash, some without)", () => {
      const t = new TextHolder();
      t.monoLingualText = "History / Historia, Plain Topic, Culture / Cultura";
      t.commitSlashSyntaxConversion(["en", "es"], true);
      expect(t.getTextAxis("en")).toBe("History, Plain Topic, Culture");
      expect(t.getTextAxis("es")).toBe("Historia, Cultura");
    });
  });
});
