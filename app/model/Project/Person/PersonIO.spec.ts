import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { CustomFieldRegistry } from "../CustomFieldRegistry";
import { PersonMetadataFile } from "./Person";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
let personDirectory;
let personId;
const languageFinder = new LanguageFinder(() => ({
  iso639_3: "",
  englishName: "",
}));

describe("Person Languages Read", () => {
  beforeEach(async () => {
    personDirectory = temp.mkdirSync("test2");
    personId = Path.basename(personDirectory);
  });
  afterEach(async () => {
    temp.cleanupSync();
  });
  it("can read two languages and keeps them in the order given", () => {
    const p = GetPersonFileWithOneTag(
      "languages",
      '<language tag="foo"/><language tag="etr" primary="true" mother="true"/>'
    );
    expect(p.languages.length).toBe(2);
    expect(p.languages[1].primary).toBe(true);
    expect(p.languages[1].mother).toBe(true);
    expect(p.languages[1].father).toBe(false);
  });
  it("is ok if there are no languages", () => {
    const p = GetPersonFileWithOneTag("languages", "");
    expect(p.languages.length).toBe(0);
  });

  it("does migration if there are no languages", () => {
    const p = GetPersonFileWithOneTag("primaryLanguage", "etr");
    p.migrate(languageFinder);
    expect(p.languages.length).toBe(1);
    expect(p.languages[0].tag).toBe("etr");
    expect(p.languages[0].primary).toBe(true);
  });
  it("does not do migration if there are languages", () => {
    const p = GetPersonFileWithContents(
      '<languages><language tag="foo"/></languages><primaryLanguage>fr</primaryLanguage>'
    );
    expect(p.languages.length).toBe(1);
    expect(p.languages[0].tag).toBe("foo");
  });
});

function GetPersonFileWithOneTag(
  tag: string,
  content: string
): PersonMetadataFile {
  fs.writeFileSync(
    Path.join(personDirectory, personId + ".person"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Person><${tag}>${content}</${tag}></Person>`
  );
  return new PersonMetadataFile(personDirectory, new CustomFieldRegistry());
}
function GetPersonFileWithContents(content: string): PersonMetadataFile {
  fs.writeFileSync(
    Path.join(personDirectory, personId + ".person"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Person>${content}</Person>`
  );
  return new PersonMetadataFile(personDirectory, new CustomFieldRegistry());
}
