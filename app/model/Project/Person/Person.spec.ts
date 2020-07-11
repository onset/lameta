import { Person } from "./Person";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { FieldSet } from "../../field/FieldSet";
import { Field, FieldType } from "../../field/Field";

const languageFinder = new LanguageFinder(() => undefined);

describe("migration", () => {
  it("should convert Tok Pisin to tpi", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("Tok Pisin");
    Person.migrateOnePersonLanguage(field, languageFinder);
    expect(field.text).toBe("tpi");
  });
  it("should leave tpi as tpi", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("tpi");
    Person.migrateOnePersonLanguage(field, languageFinder);
    expect(field.text).toBe("tpi");
  });
  it("should leave qax as qax", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("qax");
    Person.migrateOnePersonLanguage(field, languageFinder);
    expect(field.text).toBe("qax");
  });
  it("should leave an unrecognized language alone, else we'll loose it", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("foobar lives");
    Person.migrateOnePersonLanguage(field, languageFinder);
    expect(field.text).toBe("foobar lives");
  });
  it("should leave empty string as empty string", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    field.setValueFromString("");
    Person.migrateOnePersonLanguage(field, languageFinder);
    expect(field.text).toBe("");
  });
  it("should take undefined and just leave that alone", () => {
    const field = new Field("doesn't matter what this is", FieldType.Text);
    Person.migrateOnePersonLanguage(undefined, languageFinder);
  });
});
