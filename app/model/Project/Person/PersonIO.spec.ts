import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { CustomFieldRegistry } from "../CustomFieldRegistry";
import { PersonMetadataFile } from "./Person";
import {
  LanguageFinder,
  setupLanguageFinderForTests,
} from "../../../languageFinder/LanguageFinder";

import {
  setResultXml,
  xexpect as expect,
  count,
  value,
} from "../../../other/xmlUnitTestUtils";

let personDirectory;
let personId;
const languageFinder = new LanguageFinder(() => ({
  iso639_3: "",
  englishName: "",
}));

describe("Person Languages Read", () => {
  beforeAll(() => {
    setupLanguageFinderForTests();
  });
  beforeEach(async () => {
    personDirectory = temp.mkdirSync("test2");
    personId = Path.basename(personDirectory);
  });
  afterEach(async () => {
    temp.cleanupSync();
  });
  /* MAY 201: all these pass with jest, but several fail with wallabjs. Grrrr */
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
    p.migrateFromPreviousVersions();
    expect(p.languages.length).toBe(1);
    expect(p.languages[0].code).toBe("etr");
    expect(p.languages[0].primary).toBe(true);
  });
  it("does not do migration if there are languages", () => {
    const p = GetPersonFileWithContents(
      '<languages><language tag="foo"/></languages><primaryLanguage>fr</primaryLanguage>'
    );
    expect(p.languages.length).toBe(1);
    expect(p.languages[0].code).toBe("foo");
  });

  it("should output languages element", () => {
    const f = new PersonMetadataFile(
      personDirectory,
      new CustomFieldRegistry()
    );
    f.languages.push({ code: "foo" });
    setResultXml(f.getXml());
    expect("Person/languages").toHaveCount(1);
    expect("Person/languages/language[1]").toHaveAttributeValue("tag", "foo");
  });
  it("should output correct defaults for a language", () => {
    const f = new PersonMetadataFile(
      personDirectory,
      new CustomFieldRegistry()
    );
    f.languages.push({ code: "foo" });
    setResultXml(f.getXml());
    expect("Person/languages").toHaveCount(1);
    expect("Person/languages/language[1]").toHaveAttributeValue("tag", "foo");
    expect("Person/languages/language[1]").toHaveAttributeValue(
      "mother",
      "false"
    );
    expect("Person/languages/language[1]").toHaveAttributeValue(
      "father",
      "false"
    );
    expect("Person/languages/language[1]").toHaveAttributeValue(
      "primary",
      "false"
    );
  });
  it("should output deprecated xml fields for person languages for use by saymore", () => {
    /*   <primaryLanguage type="string">etr</primaryLanguage>
  <primaryLanguageLearnedIn type="string">Huya</primaryLanguageLearnedIn>
  <otherLanguage0 type="string">hui</otherLanguage0>
  <otherLanguage1 type="string">tpi</otherLanguage1>
  <fathersLanguage type="string">etr</fathersLanguage>
  <mothersLanguage type="string">etr</mothersLanguage>
  */

    const f = new PersonMetadataFile(
      personDirectory,
      new CustomFieldRegistry()
    );
    f.languages.push({
      code: "fra",
      mother: false,
      father: true,
      primary: true,
    });
    f.languages.push({
      code: "spa",
      mother: true,
      father: false,
      primary: false,
    });
    f.languages.push({
      code: "qaa",
      mother: true, // but we should only output the first one
      father: true, // but we should only output the first one
      primary: true, // but we should only output the first one
    });
    const x = f.getXml();
    setResultXml(x);
    expect("Person/primaryLanguage").toHaveCount(1); // we should only output the first one
    expect("Person/mothersLanguage").toHaveCount(1); // we should only output the first one
    expect("Person/fathersLanguage").toHaveCount(1); // we should only output the first one
    expect('Person/primaryLanguage[text()="French"]').toHaveCount(1);
    expect('Person/fathersLanguage[text()="French"]').toHaveCount(1);
    expect('Person/mothersLanguage[text()="Spanish"]').toHaveCount(1);
    expect('Person/mothersLanguage[text()="qaa"]').toHaveCount(0); // we should only output the first one
    expect('Person/otherLanguage0[text()="Spanish"]').toHaveCount(1);
    expect('Person/otherLanguage1[text()="qaa"]').toHaveCount(1);
  });

  it("should output all the fields of a language", () => {
    const f = new PersonMetadataFile(
      personDirectory,
      new CustomFieldRegistry()
    );
    f.languages.push({
      code: "foo",
      mother: true,
      father: true,
      primary: true,
    });
    setResultXml(f.getXml());
    expect("Person/languages/language").toHaveCount(1);
    expect("Person/languages/language[1]").toHaveAttributeValue("tag", "foo");
    expect("Person/languages/language[1]").toHaveAttributeValue(
      "mother",
      "true"
    );
    expect("Person/languages/language[1]").toHaveAttributeValue(
      "father",
      "true"
    );
    expect("Person/languages/language[1]").toHaveAttributeValue(
      "primary",
      "true"
    );
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
  const r = new CustomFieldRegistry();
  return new PersonMetadataFile(personDirectory, r);
}
function GetPersonFileWithContents(content: string): PersonMetadataFile {
  fs.writeFileSync(
    Path.join(personDirectory, personId + ".person"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Person>${content}</Person>`
  );
  return new PersonMetadataFile(personDirectory, new CustomFieldRegistry());
}
