import { describe, it, expect, beforeAll } from "vite-plus/test";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import { Person } from "./Person";
import { EncounteredVocabularyRegistry } from "../EncounteredVocabularyRegistry";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";

temp.track();

describe("Person.ageOn", () => {
  let person: Person;
  const sessionDate = new Date("2010-06-06");

  beforeAll(() => {
    const dir = Path.join(temp.mkdirSync("person age"), "Awi_Heole");
    fs.copySync("sample data/Edolo sample/People/Awi_Heole", dir);
    person = Person.fromDirectory(
      dir,
      new EncounteredVocabularyRegistry(),
      () => true,
      new LanguageFinder(() => ({ iso639_3: "", englishName: "" })),
    );
  });

  it("gives the age in years on a date", () => {
    person.properties.setText("birthYear", "1972");
    expect(person.ageOn(sessionDate)).toBe("38");
  });
  it("gives no age on a date before the person was born", () => {
    person.properties.setText("birthYear", "2031");
    expect(person.ageOn(sessionDate)).toBe("");
  });
  it("gives 0 in the year the person was born", () => {
    person.properties.setText("birthYear", "2010");
    expect(person.ageOn(sessionDate)).toBe("0");
  });
});
