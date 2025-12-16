import { describe, it, beforeEach, expect, afterEach, vi } from "vitest";
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
 * Tests for LAM-112: IdMightHaveChanged not called on name edits when sanitized name is unchanged
 *
 * Bug: When a user modifies a person's name in a way that changes the raw name value
 * but doesn't affect the sanitized folder name, `IdMightHaveChanged()` is never called.
 *
 * For example, changing "John" to "John!" should trigger IdMightHaveChanged() because
 * the ID (raw name) changed from "John" to "John!", even though the folder name stays
 * as "John" (since "!" is stripped by sanitization).
 *
 * https://linear.app/lameta/issue/LAM-112
 */
describe("LAM-112: Person ID changes when folder name does not", () => {
  let personDirectory: string;

  beforeEach(async () => {
    personDirectory = temp.mkdirSync("testPersonIdChange");
  });

  afterEach(async () => {
    temp.cleanupSync();
  });

  function createPersonWithName(
    name: string,
    idChangeHandler?: (oldId: string, newId: string) => void
  ): Person {
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
      idChangeHandler || (() => {}),
      languageFinder
    );
  }

  it("should detect that ID changes when name changes from John to John! even though folder name stays the same", () => {
    // Create a person named "John"
    const person = createPersonWithName("John");

    // Verify initial state
    expect(person.getIdToUseForReferences()).toBe("John");
    expect(person.getNeedRenameOfFolder()).toBe(false); // folder already named correctly

    // Change the name to "John!" (with a special character)
    person.properties.setText("name", "John!");

    // The ID should now be "John!" (raw name)
    expect(person.getIdToUseForReferences()).toBe("John!");

    // But the folder doesn't need to be renamed (because "John!" sanitizes to "John")
    // This is the key insight of LAM-112: folder rename check returns false,
    // but the ID HAS actually changed!
    expect(person.getNeedRenameOfFolder()).toBe(false);
  });

  it("should call the id change handler when IdMightHaveChanged is called after name changes", () => {
    const idChangeHandler = vi.fn();
    const person = createPersonWithName("John", idChangeHandler);

    // Verify initial state - previousId is "John"
    expect(person.getIdToUseForReferences()).toBe("John");

    // Change the name to "John!"
    person.properties.setText("name", "John!");

    // Call IdMightHaveChanged (this is what the fix should do unconditionally)
    person.IdMightHaveChanged();

    // The handler should have been called with old and new IDs
    expect(idChangeHandler).toHaveBeenCalledWith("John", "John!");
  });

  it("should NOT call id change handler when IdMightHaveChanged is called but ID hasn't actually changed", () => {
    const idChangeHandler = vi.fn();
    const person = createPersonWithName("John", idChangeHandler);

    // Just call IdMightHaveChanged without changing anything
    person.IdMightHaveChanged();

    // The handler should NOT have been called
    expect(idChangeHandler).not.toHaveBeenCalled();
  });

  it("should detect ID changes for various special characters that get sanitized", () => {
    const testCases = [
      { from: "John", to: "John!", sanitizedFolder: "John" },
      { from: "Alice", to: "Alice?", sanitizedFolder: "Alice" },
      { from: "Bob", to: "Bob*", sanitizedFolder: "Bob" },
      { from: "Mary", to: "Mary<>", sanitizedFolder: "Mary" },
      { from: "Sam", to: "Sam:", sanitizedFolder: "Sam" }
    ];

    for (const testCase of testCases) {
      // Create a fresh directory for each test case
      const dir = temp.mkdirSync("testPersonIdChange" + testCase.from);
      const personId = Path.basename(dir);
      fs.writeFileSync(
        Path.join(dir, personId + ".person"),
        `<?xml version="1.0" encoding="utf-8"?>
<Person>
  <name>${testCase.from}</name>
</Person>`
      );

      const person = Person.fromDirectory(
        dir,
        new EncounteredVocabularyRegistry(),
        () => {},
        languageFinder
      );

      // Change the name
      person.properties.setText("name", testCase.to);

      // ID changed but folder doesn't need rename
      expect(person.getIdToUseForReferences()).toBe(testCase.to);
      expect(person.getNeedRenameOfFolder()).toBe(false);
    }
  });

  /**
   * LAM-112: This test demonstrates the bug in PersonForm.tsx
   *
   * The PersonForm's onBlur handler for the name field currently does:
   *   if (getNeedRenameOfFolder()) {
   *     nameMightHaveChanged();
   *     IdMightHaveChanged();
   *   }
   *
   * This means when the name changes in a way that only affects the ID (raw name)
   * but not the folder (sanitized name), IdMightHaveChanged() is never called.
   *
   * The fix is to call IdMightHaveChanged() unconditionally, outside the if block.
   */
  it("REGRESSION: simulates buggy behavior where IdMightHaveChanged is skipped when folder rename not needed", () => {
    const idChangeHandler = vi.fn();
    const person = createPersonWithName("John", idChangeHandler);

    // Simulate user changing "John" to "John!"
    person.properties.setText("name", "John!");

    // This is what the BUGGY PersonForm does:
    // Only call IdMightHaveChanged if folder needs rename
    if (person.getNeedRenameOfFolder()) {
      person.nameMightHaveChanged();
      person.IdMightHaveChanged();
    }

    // BUG: The handler was NOT called because getNeedRenameOfFolder() returned false
    // Even though the ID DID change from "John" to "John!"
    expect(idChangeHandler).not.toHaveBeenCalled(); // This passes, demonstrating the bug

    // PROOF that the ID actually changed:
    expect(person.getIdToUseForReferences()).toBe("John!");
  });

  it("FIXED: simulates correct behavior where IdMightHaveChanged is called unconditionally", () => {
    const idChangeHandler = vi.fn();
    const person = createPersonWithName("John", idChangeHandler);

    // Simulate user changing "John" to "John!"
    person.properties.setText("name", "John!");

    // This is what the FIXED PersonForm should do:
    if (person.getNeedRenameOfFolder()) {
      person.nameMightHaveChanged();
    }
    // Call IdMightHaveChanged unconditionally
    person.IdMightHaveChanged();

    // FIXED: The handler IS called even though getNeedRenameOfFolder() returned false
    expect(idChangeHandler).toHaveBeenCalledWith("John", "John!");
  });
});

describe("referenceIdMatches should match by name even when person has a code", () => {
  let personDirectory: string;

  beforeEach(async () => {
    personDirectory = temp.mkdirSync("testPersonRefMatch");
  });

  afterEach(async () => {
    temp.cleanupSync();
  });

  function createPersonWithNameAndCode(
    name: string,
    code: string
  ): Person {
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

  it("should match by code when person has a code", () => {
    const person = createPersonWithNameAndCode("Erma Ramos", "ER");
    expect(person.referenceIdMatches("ER")).toBe(true);
    expect(person.referenceIdMatches("er")).toBe(true); // case insensitive
  });

  it("should match by full name even when person has a code", () => {
    // This is the key fix: contributor was added as "Erma Ramos" before
    // the person record was given the code "ER"
    const person = createPersonWithNameAndCode("Erma Ramos", "ER");
    expect(person.referenceIdMatches("Erma Ramos")).toBe(true);
    expect(person.referenceIdMatches("erma ramos")).toBe(true); // case insensitive
  });

  it("should match by name when person has no code", () => {
    const dir = temp.mkdirSync("testPersonNoCode");
    const personId = Path.basename(dir);
    fs.writeFileSync(
      Path.join(dir, personId + ".person"),
      `<?xml version="1.0" encoding="utf-8"?>
<Person>
  <name>John Smith</name>
</Person>`
    );
    const person = Person.fromDirectory(
      dir,
      new EncounteredVocabularyRegistry(),
      () => {},
      languageFinder
    );
    expect(person.referenceIdMatches("John Smith")).toBe(true);
    expect(person.referenceIdMatches("john smith")).toBe(true);
  });

  it("should not match unrelated names or codes", () => {
    const person = createPersonWithNameAndCode("Erma Ramos", "ER");
    expect(person.referenceIdMatches("John Smith")).toBe(false);
    expect(person.referenceIdMatches("JS")).toBe(false);
    expect(person.referenceIdMatches("Erma")).toBe(false); // partial match should fail
  });
});
