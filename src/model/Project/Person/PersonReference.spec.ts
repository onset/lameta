import { describe, it, beforeEach, expect, afterEach } from "vite-plus/test";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { Person } from "./Person";
import { EncounteredVocabularyRegistry } from "../EncounteredVocabularyRegistry";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";

temp.track();

const languageFinder = new LanguageFinder(() => ({
  iso639_3: "",
  englishName: "",
}));

const nfc = (s: string) => s.normalize("NFC");
const nfd = (s: string) => s.normalize("NFD");

describe("Person.referenceIdMatches", () => {
  let personDirectory: string;

  beforeEach(() => {
    personDirectory = temp.mkdirSync("personReference");
  });
  afterEach(() => {
    temp.cleanupSync();
  });

  function createPerson(fields: string): Person {
    fs.writeFileSync(
      Path.join(personDirectory, Path.basename(personDirectory) + ".person"),
      `<?xml version="1.0" encoding="utf-8"?><Person>${fields}</Person>`,
    );
    return Person.fromDirectory(
      personDirectory,
      new EncounteredVocabularyRegistry(),
      () => {},
      languageFinder,
    );
  }

  it("matches a name stored with spaces around it", () => {
    const person = createPerson("<name> Ana López </name>");
    expect(person.referenceIdMatches("Ana López")).toBe(true);
  });

  it("matches a reference with spaces around it", () => {
    const person = createPerson("<name>Ana López</name>");
    expect(person.referenceIdMatches(" ana lópez ")).toBe(true);
  });

  it("matches a name whose accents are composed differently", () => {
    const nfdPerson = createPerson(`<name>${nfd("José Núñez")}</name>`);
    expect(nfdPerson.referenceIdMatches(nfc("José Núñez"))).toBe(true);

    const nfcPerson = createPerson(`<name>${nfc("Zoë Ångström")}</name>`);
    expect(nfcPerson.referenceIdMatches(nfd("Zoë Ångström"))).toBe(true);
  });

  it("matches a code the same way", () => {
    const person = createPerson(`<name>Someone</name><code> ${nfd("Zoë")} </code>`);
    expect(person.referenceIdMatches(nfc("zoë"))).toBe(true);
  });

  it("counts a new name or code that refers to this person as a collision", () => {
    const person = createPerson(`<name>${nfd("José Núñez")}</name><code> ${nfd("Zoë")} </code>`);
    expect(person.wouldCollideWithIdFields(nfc("josé núñez"))).toBe(true);
    expect(person.wouldCollideWithIdFields(nfc("Zoë"))).toBe(true);
    expect(person.wouldCollideWithIdFields("Someone Else")).toBe(false);
  });

  it("does not match a different name", () => {
    const person = createPerson("<name>Ana López</name>");
    expect(person.referenceIdMatches("Ana Lopez")).toBe(false);
  });
});
