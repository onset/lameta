import {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  expect as plainExpect,
} from "vite-plus/test";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { applyCapitalization } from "../model/field/capitalization";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { setResultXml, xexpect as expect } from "../other/xmlUnitTestUtils";
import temp from "temp";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { Field } from "../model/field/Field";

let project: Project;
let session: Session;

beforeAll(() => {
  temp.track();
  project = Project.fromDirectory(temp.mkdirSync("lameta imdi capitalise test"));
  session = project.addSession();
});

afterAll(() => {
  temp.cleanupSync();
});

beforeEach(() => {
  project.properties.setText("metadataLanguages", "en:English");
});

const fieldWithDefinition = (key: string, englishLabel: string, rest: object = {}): Field => {
  if (!session.properties.getHasValue(key)) {
    session.properties.addTextProperty(key, "");
  }
  const field = session.properties.getValueOrThrow(key);
  field.definition = new FieldDefinition({
    key,
    englishLabel,
    persist: true,
    capitalization: "sentence",
    ...rest,
  });
  return field;
};

const generate = () =>
  setResultXml(
    ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project, true /*omit namespace*/),
  );

describe("applyCapitalization", () => {
  const capitalising = new FieldDefinition({ key: "title", capitalization: "sentence" });

  it("upper-cases a lower-case first letter", () => {
    plainExpect(applyCapitalization(capitalising, "the hunt")).toBe("The hunt");
    plainExpect(applyCapitalization(capitalising, "  élan")).toBe("  Élan");
  });

  it("leaves text alone that does not start with a lower-case letter", () => {
    plainExpect(applyCapitalization(capitalising, "The hunt")).toBe("The hunt");
    plainExpect(applyCapitalization(capitalising, '"quoted"')).toBe('"quoted"');
    plainExpect(applyCapitalization(capitalising, "")).toBe("");
  });

  it("puts a term in ELAR's case", () => {
    const term = new FieldDefinition({ key: "topic", capitalization: "ELARTerm" });
    plainExpect(applyCapitalization(term, "life in Berthoud")).toBe("Life in berthoud");
    // all capitals, up to two characters, and characters other than a-z stay as typed
    plainExpect(applyCapitalization(term, "songs by FAO UNESCO")).toBe("Songs by FAO UNESCO");
    plainExpect(applyCapitalization(term, "Myths Of The Ngäbe")).toBe("Myths Of the Ngäbe");
    plainExpect(applyCapitalization(term, "Kuna-Yala Songs 2024")).toBe("Kuna-Yala songs 2024");
  });

  it("puts text in title, upper and lower case", () => {
    const inCase = (capitalization: string) =>
      applyCapitalization(new FieldDefinition({ key: "title", capitalization }), "the hunt");
    plainExpect(inCase("title")).toBe("The Hunt");
    plainExpect(inCase("upper")).toBe("THE HUNT");
    plainExpect(
      applyCapitalization(new FieldDefinition({ key: "x", capitalization: "lower" }), "ABC"),
    ).toBe("abc");
  });

  it("leaves text alone when the definition does not ask for it", () => {
    plainExpect(applyCapitalization(new FieldDefinition({ key: "title" }), "the hunt")).toBe(
      "the hunt",
    );
    plainExpect(applyCapitalization(undefined, "the hunt")).toBe("the hunt");
  });
});

describe("IMDI export of fields that are capitalised on export", () => {
  it("capitalises the session title", () => {
    fieldWithDefinition("title", "Title").text = "the hunt";
    generate();
    expect("//Session/Title").toHaveText("The hunt");
  });

  it("capitalises the session description", () => {
    fieldWithDefinition("description", "Description").text = "a hunt near Berthoud";
    generate();
    expect("//Session/Description").toHaveText("A hunt near Berthoud");
  });

  it("puts each topic in ELAR's case", () => {
    fieldWithDefinition("topic", "Topic", {
      multilingual: true,
      capitalization: "ELARTerm",
    }).text = "fishing, life in Berthoud";
    generate();
    expect(`//Keys/Key[@Name="Topic"][1]`).toHaveText("Fishing");
    expect(`//Keys/Key[@Name="Topic"][2]`).toHaveText("Life in berthoud");
  });

  it("puts the genre in ELAR's case, keeping an acronym", () => {
    fieldWithDefinition("genre", "Genre", { capitalization: "ELARTerm" }).text = "songs about NASA";
    generate();
    expect("//Content/Genre").toHaveText("Songs about NASA");
  });

  it("capitalises each keyword in each language", () => {
    project.properties.setText("metadataLanguages", "en:English;es:Spanish");
    const keyword = fieldWithDefinition("keyword", "Keywords", {
      multilingual: true,
      capitalization: "ELARTerm",
    });
    keyword.text = "";
    keyword.setTextAxis("en", "fat, heron");
    keyword.setTextAxis("es", "grasa, garza");
    generate();
    expect(`//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-3:eng"][@index="1"]`).toHaveText("Fat");
    expect(`//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-3:spa"][@index="1"]`).toHaveText(
      "Grasa",
    );
    expect(`//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-3:eng"][@index="2"]`).toHaveText(
      "Heron",
    );
    expect(`//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-3:spa"][@index="2"]`).toHaveText(
      "Garza",
    );
  });
});
