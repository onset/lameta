import { describe, it, beforeAll, beforeEach } from "vitest";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Person } from "../model/Project/Person/Person";
import {
  setResultXml,
  xexpect as expect,
  count
} from "../other/xmlUnitTestUtils";
import * as mobx from "mobx";
import { EncounteredVocabularyRegistry } from "../model/Project/EncounteredVocabularyRegistry";
import { LanguageFinder } from "../languageFinder/LanguageFinder";

mobx.configure({
  enforceActions: "never"
});
let project: Project;
let person: Person;
let generator: ImdiGenerator;
const pretendSessionDate = new Date("2010-06-06");

const languageFinder = new LanguageFinder(() => ({
  iso639_3: "",
  englishName: ""
}));

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  person = Person.fromDirectory(
    "sample data/Edolo sample/People/Awi_Heole",
    new EncounteredVocabularyRegistry(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (oldName, newName) => true,
    languageFinder
  );
  // const subsetLanguageFinder = new LanguageFinder({
  //   englishName: "Edolo",
  //   iso639_3: "etr",
  // });

  generator = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
  setResultXml(
    generator.actor(person, "pretend-role", pretendSessionDate) as string
    // ImdiGenerator.generateActor(
    //   person,
    //   project,
    //   true /*omit namespace*/,
    //   subsetLanguageFinder
    // )
  );
});
beforeEach(() => {});

describe("actor imdi export", () => {
  it("should contain Actor", () => {
    expect("Actor/Name").toMatch("Awi Heole");
    expect(count("Actor/Languages/Language")).toBe(3);
  });

  it("should label languages correctly", () => {
    expect("Actor/Languages/Language[1]/Id").toHaveText("ISO639-3:etr");
    expect("Actor/Languages/Language[2]/Id").toHaveText("ISO639-3:tpi");
    expect("Actor/Languages/Language[3]/Id").toHaveText("ISO639-3:hui");

    expect(
      "Actor/Languages/Language[Name[text()='Edolo']]/PrimaryLanguage[text()='true']"
    ).toHaveCount(1);

    /* "Mother Tongue" doesn't actually mean "mother's language". SM doesn't have a way to express MT at the moment.
    expect(
      "Actor/Languages/Language[Name[text()='Edolo']]/MotherTongue[text()='true']"
    ).toHaveCount(1);
    expect(
        "Actor/Languages/Language[Name[text()='Huli']]/MotherTongue[text()='false']"
    ).toHaveCount(1);*/
    expect(
      "Actor/Languages/Language[Name[text()='Huli']]/PrimaryLanguage[text()='false']"
    ).toHaveCount(1);
  });

  it("should output new languages list", () => {
    person.languages.splice(0, 10);
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    person.languages.push({ code: "spa", father: true, primary: true });
    person.languages.push({ code: "qaa", mother: true, primary: false });
    const xml = gen.actor(person, "pretend-role", pretendSessionDate) as string;
    setResultXml(xml);
    expect("Actor/Languages/Language[1]/Id").toHaveText("ISO639-3:spa");
    expect("Actor/Languages/Language[1]/Name").toHaveText("Spanish");
    expect("Actor/Languages/Language[1]/Description").toHaveText(
      "Also spoken by father."
    );

    expect(
      "Actor/Languages/Language[Name[text()='Spanish']]/PrimaryLanguage[text()='true']"
    ).toHaveCount(1);

    expect("Actor/Languages/Language[2]/Id").toHaveText("ISO639-3:qaa");
    expect("Actor/Languages/Language[2]/Name").toHaveText("Unlisted Language");
    expect("Actor/Languages/Language[2]/Description").toHaveText(
      "Also spoken by mother."
    );
    expect(
      "Actor/Languages/Language[2]/PrimaryLanguage[text()='false']"
    ).toHaveCount(1);
  });

  it("unlisted language handling", () => {
    project.setSubjectLanguages("qaa:Foo Bar");
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    person.languages.splice(0, 10);
    person.languages.push({ code: "qaa", mother: true, primary: true });
    let xml = gen.actor(person, "pretend-role", pretendSessionDate) as string;
    setResultXml(xml);
    expect("Actor/Languages/Language[1]/Id").toHaveText("ISO639-3:qaa");
    expect("Actor/Languages/Language[1]/Name").toHaveText("Foo Bar");

    project.setSubjectLanguages("qoo:Blah blah");
    person.languages.splice(0, 10);
    person.languages.push({ code: "qoo", mother: true, primary: true });
    const gen2 = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    xml = gen2.actor(person, "pretend-role", pretendSessionDate) as string;
    setResultXml(xml);
    expect("Actor/Languages/Language[1]/Id").toHaveText("ISO639-3:qoo");
    expect("Actor/Languages/Language[1]/Name").toHaveText("Blah blah");
  });

  it("should reduce a person's custom language tag to its 3-letter code", () => {
    // An archive's ingest rejects "ISO639-3:qab-x-tolo". IMDI must get the code alone,
    // with the name the user typed in the Name element.
    project.setSubjectLanguages("qab-x-tolo:Tolo");
    person.languages.splice(0, 10);
    person.languages.push({ code: "qab-x-tolo", mother: true, primary: true });
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    const xml = gen.actor(person, "pretend-role", pretendSessionDate) as string;
    setResultXml(xml);
    expect("Actor/Languages/Language[1]/Id").toHaveText("ISO639-3:qab");
    expect("Actor/Languages/Language[1]/Name").toHaveText("Tolo");
    expect(xml.indexOf("-x-")).toBe(-1);
  });

  it("should match a person's tag to the project's whatever the case", () => {
    // A .person file written by 3.0.x holds the tag with the capital letter the user typed.
    project.setSubjectLanguages("qab-x-tolo:Tolo");
    person.languages.splice(0, 10);
    person.languages.push({ code: "qab-x-Tolo", mother: true, primary: true });
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    const xml = gen.actor(person, "pretend-role", pretendSessionDate) as string;
    setResultXml(xml);
    expect("Actor/Languages/Language[1]/Id").toHaveText("ISO639-3:qab");
    expect("Actor/Languages/Language[1]/Name").toHaveText("Tolo");
    expect(xml.indexOf("-x-")).toBe(-1);
  });

  it("should never write a tag as a language name", () => {
    // The project does not know this language, so nothing can give its real name. The name
    // after "-x-" is the only thing left, and a tag must not reach the file as a name.
    project.setSubjectLanguages("eng:English");
    person.languages.splice(0, 10);
    person.languages.push({ code: "qac-x-Wobbly", mother: true, primary: true });
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    const xml = gen.actor(person, "pretend-role", pretendSessionDate) as string;
    setResultXml(xml);
    expect("Actor/Languages/Language[1]/Id").toHaveText("ISO639-3:qac");
    expect("Actor/Languages/Language[1]/Name").toHaveText("Wobbly");
    expect(xml.indexOf("-x-")).toBe(-1);
  });

  it("should not throw when a language element has no tag", () => {
    // A hand-edited .person file can hold <language primary="true"/>.
    project.setSubjectLanguages("eng:English");
    person.languages.splice(0, 10);
    person.languages.push({
      code: undefined as unknown as string,
      mother: false,
      primary: true
    });
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    expect(() =>
      gen.actor(person, "pretend-role", pretendSessionDate)
    ).not.toThrow();
  });

  /* we now remove that field, so we cannot test it this way
  it("should not output migrated language fields", () => {
    person.languages.splice(0, 10);

    person.properties.setText("primaryLanguage", "xyz");
    const gen = new ImdiGenerator(person, project);
    const xml = gen.actor(person, "pretend-role", pretendSessionDate) as string;
    setResultXml(xml);
    expect('Actor/Keys/Key[@Name="Primary Language"]').toHaveCount(0);
  });
  */

  it("should calculate age in years given a birth year compared to pretendSessionDate", () => {
    expect("Actor/BirthDate").toMatch("1972");
    expect("Actor/Age").toMatch("38");
  });
  it("should handle birth year being empty the way ELAR wants it", () => {
    person.properties.setText("birthYear", "");
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    const xml = gen.actor(person, "pretend-role", pretendSessionDate) as string;
    setResultXml(xml);
    expect("Actor/BirthDate").toMatch("Unspecified");
    expect("Actor/Age").toMatch("Unspecified");
  });
  it("should convert approximate birth years like ~1964 to range format", () => {
    // Values like "~1964" (approximate dates) are converted to YYYY-1/YYYY+1 range format
    person.properties.setText("birthYear", "~1964");
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    const xml = gen.actor(person, "pretend-role", pretendSessionDate) as string;
    setResultXml(xml);
    expect("Actor/BirthDate").toMatch("1963/1965");
  });

  // this one is weird..., just testing a report from a user:
  // "Lameta writes contributor role in lowercase in IMDI although it seems like uppercase from the GUI."
  it("should output role in same case as it is stored", () => {
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    const xml = gen.actor(person, "MixedCase", pretendSessionDate) as string;
    setResultXml(xml);
    expect("Actor/Role").toMatch("MixedCase");
  });
});
