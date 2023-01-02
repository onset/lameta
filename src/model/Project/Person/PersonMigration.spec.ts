import { Person } from "./Person";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { FieldSet } from "../../field/FieldSet";
import { Field, FieldType } from "../../field/Field";
import { IPersonLanguage } from "../../PersonLanguage";
import {
  migrateOnePersonLanguageFromNameToCode,
  migrateLegacyIndividualPersonLanguageFieldsToCurrentListOfLanguages
} from "./PersonMigration";
vi.mock("@electron/remote", () => ({ exec: vi.fn() })); //See commit msg for info

const languageFinder = new LanguageFinder(() => ({
  iso639_3: "",
  englishName: ""
}));

// this migration happened before we switched to the new PersonLanguages structure
describe("migrateOnePersonLanguageFromNameToCode", () => {
  it("should convert Tok Pisin to tpi", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("Tok Pisin");
    migrateOnePersonLanguageFromNameToCode(field);
    expect(field.text).toBe("tpi");
  });
  it("should leave tpi as tpi", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("tpi");
    migrateOnePersonLanguageFromNameToCode(field);
    expect(field.text).toBe("tpi");
  });
  it("should leave qax as qax", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("qax");
    migrateOnePersonLanguageFromNameToCode(field);
    expect(field.text).toBe("qax");
  });
  it("should leave an unrecognized language alone, else we'll loose it", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("foobar lives");
    migrateOnePersonLanguageFromNameToCode(field);
    expect(field.text).toBe("foobar lives");
  });
  it("should leave empty string as empty string", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("");
    migrateOnePersonLanguageFromNameToCode(field);
    expect(field.text).toBe("");
  });
  it("should take undefined and just leave that alone", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    migrateOnePersonLanguageFromNameToCode(undefined);
  });
});

describe("migrateLegacyLanguageFieldsToNewList", () => {
  it("should create one language that was listed as primary, father, mother, other", () => {
    const languages: IPersonLanguage[] = [];
    const fields = new FieldSet();
    fields.addTextProperty("primaryLanguage", "tpi");
    fields.addTextProperty("mothersLanguage", "tpi");
    fields.addTextProperty("fathersLanguage", "tpi");
    fields.addTextProperty("otherLanguage", "tpi");

    migrateLegacyIndividualPersonLanguageFieldsToCurrentListOfLanguages(
      fields,
      languages
    );
    expect(languages.length).toBe(1);
    expect(languages[0]).toStrictEqual({
      code: "tpi",
      primary: true,
      mother: true,
      father: true
    });
  });
  it("should create multiple languages if there is no overlap between primary, father, mother, other", () => {
    const languages: IPersonLanguage[] = [];
    const fields = new FieldSet();
    fields.addTextProperty("primaryLanguage", "tpi");
    fields.addTextProperty("mothersLanguage", "en");
    fields.addTextProperty("fathersLanguage", "fr");
    fields.addTextProperty("otherLanguage0", "de");
    fields.addTextProperty("otherLanguage1", "etr");

    migrateLegacyIndividualPersonLanguageFieldsToCurrentListOfLanguages(
      fields,
      languages
    );
    expect(languages.length).toBe(5);
    expect(languages[0]).toStrictEqual({
      code: "tpi",
      primary: true,
      mother: false,
      father: false
    });
    expect(languages[1]).toStrictEqual({
      code: "en",
      primary: false,
      mother: true,
      father: false
    });
    expect(languages[2]).toStrictEqual({
      code: "fr",
      primary: false,
      mother: false,
      father: true
    });
    expect(languages[3]).toStrictEqual({
      code: "de",
      primary: false,
      mother: false,
      father: false
    });
    expect(languages[4]).toStrictEqual({
      code: "etr",
      primary: false,
      mother: false,
      father: false
    });
  });
});
it("should not import legacy fields if there is already a modern languages list", () => {
  const languages: IPersonLanguage[] = [{ code: "foo" }];
  // these will be ignored
  const fields = new FieldSet();
  fields.addTextProperty("primaryLanguage", "tpi");
  fields.addTextProperty("mothersLanguage", "en");
  fields.addTextProperty("fathersLanguage", "fr");
  fields.addTextProperty("otherLanguage0", "de");
  fields.addTextProperty("otherLanguage1", "etr");

  migrateLegacyIndividualPersonLanguageFieldsToCurrentListOfLanguages(
    fields,
    languages
  );
  expect(languages.length).toBe(1);
  expect(languages[0].code).toBe("foo");
});

it("should store the primary language detail text in the description", () => {
  const languages: IPersonLanguage[] = [];
  // these will be ignored
  const fields = new FieldSet();
  fields.addTextProperty("primaryLanguage", "etr");
  fields.addTextProperty("primaryLanguageLearnedIn", "Huya");
  fields.addTextProperty("description", "Lorem Ipsum.");

  migrateLegacyIndividualPersonLanguageFieldsToCurrentListOfLanguages(
    fields,
    languages
  );
  expect(languages.length).toBe(1);
  expect(fields.getTextStringOrEmpty("description")).toContain("Lorem Ipsum");
  expect(fields.getTextStringOrEmpty("description")).toContain("Huya");
});
