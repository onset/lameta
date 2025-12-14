import { describe, it, beforeEach, expect, afterEach } from "vitest";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { Person } from "./Person";
import { EncounteredVocabularyRegistry } from "../EncounteredVocabularyRegistry";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import * as mobx from "mobx";

mobx.configure({
  enforceActions: "never"
});

temp.track();

const languageFinder = new LanguageFinder(() => ({
  iso639_3: "",
  englishName: ""
}));

/**
 * Tests for Person.wouldCollideWithIdFields
 *
 * LAM-119: Person.wouldCollideWithIdFields was performing case-sensitive comparison
 * on the name field while correctly performing case-insensitive comparison on the code field.
 * This allowed users to create duplicate persons with the same name in different cases
 * (e.g., "Alice" and "alice"), bypassing the collision detection system.
 *
 * https://linear.app/lameta/issue/LAM-119
 */
describe("Person.wouldCollideWithIdFields", () => {
  let personDirectory: string;

  beforeEach(async () => {
    personDirectory = temp.mkdirSync("testPersonCollision");
  });

  afterEach(async () => {
    temp.cleanupSync();
  });

  function createPersonWithName(name: string): Person {
    const personId = Path.basename(personDirectory);
    fs.writeFileSync(
      Path.join(personDirectory, personId + ".person"),
      `<?xml version="1.0" encoding="utf-8"?>
<Person>
  <name>${name}</name>
</Person>`
    );
    return Person.fromDirectory(
      personDirectory,
      new EncounteredVocabularyRegistry(),
      () => {},
      languageFinder
    );
  }

  function createPersonWithNameAndCode(name: string, code: string): Person {
    const personId = Path.basename(personDirectory);
    fs.writeFileSync(
      Path.join(personDirectory, personId + ".person"),
      `<?xml version="1.0" encoding="utf-8"?>
<Person>
  <name>${name}</name>
  <code>${code}</code>
</Person>`
    );
    return Person.fromDirectory(
      personDirectory,
      new EncounteredVocabularyRegistry(),
      () => {},
      languageFinder
    );
  }

  it("should detect collision with exact same name", () => {
    const person = createPersonWithName("Alice");
    expect(person.wouldCollideWithIdFields("Alice")).toBe(true);
  });

  it("should detect collision with same name in different case (lowercase input)", () => {
    // LAM-119: This test was failing before the fix
    const person = createPersonWithName("Alice");
    expect(person.wouldCollideWithIdFields("alice")).toBe(true);
  });

  it("should detect collision with same name in different case (uppercase input)", () => {
    const person = createPersonWithName("alice");
    expect(person.wouldCollideWithIdFields("ALICE")).toBe(true);
  });

  it("should detect collision with same name in mixed case", () => {
    const person = createPersonWithName("Alice Johnson");
    expect(person.wouldCollideWithIdFields("ALICE JOHNSON")).toBe(true);
    expect(person.wouldCollideWithIdFields("alice johnson")).toBe(true);
    expect(person.wouldCollideWithIdFields("AlIcE jOhNsOn")).toBe(true);
  });

  it("should not detect collision with different name", () => {
    const person = createPersonWithName("Alice");
    expect(person.wouldCollideWithIdFields("Bob")).toBe(false);
  });

  it("should detect collision with code (case-insensitive)", () => {
    const person = createPersonWithNameAndCode("Full Name", "ABC123");
    expect(person.wouldCollideWithIdFields("ABC123")).toBe(true);
    expect(person.wouldCollideWithIdFields("abc123")).toBe(true);
    expect(person.wouldCollideWithIdFields("Abc123")).toBe(true);
  });

  it("should detect collision with name even when code is set", () => {
    const person = createPersonWithNameAndCode("Alice", "ABC");
    // Should collide with both name and code
    expect(person.wouldCollideWithIdFields("alice")).toBe(true);
    expect(person.wouldCollideWithIdFields("abc")).toBe(true);
  });

  it("should handle whitespace in input correctly", () => {
    const person = createPersonWithName("Alice");
    expect(person.wouldCollideWithIdFields("  alice  ")).toBe(true);
    expect(person.wouldCollideWithIdFields("  ALICE  ")).toBe(true);
  });

  it("should handle unicode names with case folding", () => {
    // Example with accented characters
    const person = createPersonWithName("José García");
    expect(person.wouldCollideWithIdFields("josé garcía")).toBe(true);
    expect(person.wouldCollideWithIdFields("JOSÉ GARCÍA")).toBe(true);
  });
});
