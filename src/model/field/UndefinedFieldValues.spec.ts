/**
 * Tests for handling undefined/null field values.
 *
 * These tests reproduce bugs where certain metadata files contain undefined values
 * that cause TypeErrors when the app tries to call .replace() or .trim() on them.
 *
 * Root cause: XML elements like `<code type="string"/>` (self-closing with type attribute
 * but no text content) are parsed by the xml2js library as:
 *   { $: { type: "string" }, _: undefined }
 *
 * The `_` property (text content) is undefined rather than an empty string. This can
 * happen when:
 * - A user or tool creates XML with empty typed elements
 * - A field is cleared but the type attribute is retained
 * - Data migration or export/import processes create such structures
 *
 * The specific errors this caused:
 * - TypeError: Cannot read properties of undefined (reading 'replace') at Field.escapeSpecialChars
 * - TypeError: Cannot read properties of undefined (reading 'trim')
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { Field, FieldType } from "./Field";
import { FieldSet } from "./FieldSet";
import { PersonMetadataFile } from "../Project/Person/Person";
import { SessionMetadataFile } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";

describe("Undefined Field Values", () => {
  describe("Field.escapeSpecialChars", () => {
    it("should handle undefined input gracefully", () => {
      const field = new Field("test", FieldType.Text, "");
      // Access the protected static method via the class
      // @ts-expect-error accessing protected static method for testing
      const result = Field.escapeSpecialChars(undefined);
      expect(result).toBe("");
    });

    it("should handle null input gracefully", () => {
      // @ts-expect-error accessing protected static method for testing
      const result = Field.escapeSpecialChars(null);
      expect(result).toBe("");
    });

    it("should handle empty string correctly", () => {
      // @ts-expect-error accessing protected static method for testing
      const result = Field.escapeSpecialChars("");
      expect(result).toBe("");
    });

    it("should escape special characters normally when input is valid", () => {
      // @ts-expect-error accessing protected static method for testing
      const result = Field.escapeSpecialChars("hello\\nworld");
      expect(result).toBe("hello\\nworld");
    });
  });

  describe("Field.typeAndValueEscapedForXml", () => {
    it("should not crash when field text is somehow undefined", () => {
      const field = new Field("test", FieldType.Text, "");
      // Force the internal text to be undefined to simulate the bug
      // @ts-expect-error forcing undefined for test
      field["textHolder"]["combinedText"] = undefined;

      // This used to crash with "Cannot read properties of undefined (reading 'replace')"
      expect(() => field.typeAndValueEscapedForXml()).not.toThrow();
    });

    it("should return empty value when field text is undefined", () => {
      const field = new Field("test", FieldType.Text, "");
      // Force the internal text to be undefined
      // @ts-expect-error forcing undefined for test
      field["textHolder"]["combinedText"] = undefined;

      const result = field.typeAndValueEscapedForXml();
      expect(result.value).toBe("");
    });
  });

  describe("FieldSet.getTextStringOrEmpty", () => {
    it("should return empty string when field does not exist", () => {
      const fieldSet = new FieldSet();
      const result = fieldSet.getTextStringOrEmpty("nonexistent");
      expect(result).toBe("");
    });

    it("should return empty string when field text is undefined", () => {
      const fieldSet = new FieldSet();
      const field = new Field("test", FieldType.Text, "");
      // Force the text to be undefined
      // @ts-expect-error forcing undefined for test
      field["textHolder"]["combinedText"] = undefined;
      fieldSet.setValue("test", field);

      // This should not crash and should return empty string
      const result = fieldSet.getTextStringOrEmpty("test");
      expect(result).toBe("");
    });

    it("should return actual text when field has value", () => {
      const fieldSet = new FieldSet();
      const field = new Field("test", FieldType.Text, "hello world");
      fieldSet.setValue("test", field);

      const result = fieldSet.getTextStringOrEmpty("test");
      expect(result).toBe("hello world");
    });
  });
});

describe("Empty XML Element Handling", () => {
  let directory: string;
  let folderName: string;

  beforeEach(() => {
    directory = temp.mkdirSync("test-empty-xml");
    folderName = Path.basename(directory);
  });

  afterEach(() => {
    temp.cleanupSync();
  });

  it("should handle Person file with empty typed XML element", () => {
    // This XML structure mimics what was found in problematic Person files:
    // <code type="string"/> - a self-closing element with type attribute but no text content
    // When parsed by xml2js, this becomes { $: { type: "string" }, _: undefined }
    const personXml = `<?xml version="1.0" encoding="utf-8"?>
<Person>
  <name type="string">Test Person</name>
  <code type="string"/>
  <gender type="string">Male</gender>
</Person>`;

    fs.writeFileSync(Path.join(directory, folderName + ".person"), personXml);

    // This should not throw an error
    expect(() => {
      const person = new PersonMetadataFile(
        directory,
        new EncounteredVocabularyRegistry()
      );
      // Try to get XML output (this would trigger escapeSpecialChars)
      person.getXml();
    }).not.toThrow();
  });

  it("should handle Session file with empty typed XML element", () => {
    // Similar structure for Session files
    const sessionXml = `<?xml version="1.0" encoding="utf-8"?>
<Session>
  <title type="string">Test Session</title>
  <date type="date">2023-01-15</date>
  <situation type="string"/>
  <synopsis type="string"/>
</Session>`;

    fs.writeFileSync(Path.join(directory, folderName + ".session"), sessionXml);

    expect(() => {
      const session = new SessionMetadataFile(
        directory,
        new EncounteredVocabularyRegistry()
      );
      session.getXml();
    }).not.toThrow();
  });

  it("should preserve empty fields through read/write cycle", () => {
    const personXml = `<?xml version="1.0" encoding="utf-8"?>
<Person>
  <name type="string">Test Person</name>
  <code type="string"/>
</Person>`;

    fs.writeFileSync(Path.join(directory, folderName + ".person"), personXml);

    const person = new PersonMetadataFile(
      directory,
      new EncounteredVocabularyRegistry()
    );

    // The code field should be readable as empty string, not undefined
    expect(person.getTextProperty("code", "")).toBe("");

    // Get the XML output and verify it doesn't contain "undefined"
    const outputXml = person.getXml();
    expect(outputXml).not.toContain("undefined");
  });

  it("should handle multiple empty typed elements", () => {
    // Test with multiple empty fields, which can happen in real-world data
    const personXml = `<?xml version="1.0" encoding="utf-8"?>
<Person>
  <name type="string">Test Person</name>
  <code type="string"/>
  <education type="string"/>
  <primaryOccupation type="string"/>
  <description type="string"/>
</Person>`;

    fs.writeFileSync(Path.join(directory, folderName + ".person"), personXml);

    expect(() => {
      const person = new PersonMetadataFile(
        directory,
        new EncounteredVocabularyRegistry()
      );
      // Try to get all the potentially empty fields
      person.getTextProperty("code", "");
      person.getTextProperty("education", "");
      person.getTextProperty("primaryOccupation", "");
      person.getTextProperty("description", "");
      person.getXml();
    }).not.toThrow();
  });
});
