import { Dictionary } from "typescript-collections";
import assert from "assert";
const camelcase = require("camelcase");
import {
  Field,
  FieldType,
  FieldDefinition,
  HasConsentField,
  DisplayNameField
} from "./Field";
import { Contribution } from "../file/File";
import { Person } from "../Project/Person/Person";

export class FieldSet extends Dictionary<string, Field> {
  public setText(key: string, value: string) {
    const f = this.getValueOrThrow(key);
    assert.ok(f, `setText(${key}) assumes the value is already there.`);
    f.setValueFromString(value);
  }

  // the dictionary implementation has a signature that includes undefined, which makes
  // it *really* annoying to use, as TS will force you to check the return value every time
  public getValueOrThrow(key: string): Field {
    const f = super.getValue(key);
    if (f === undefined) {
      throw Error("This FieldSet has no value with key: " + key);
    } else {
      return f;
    }
  }

  // SayMore Classic has a mix of ways to name tags, and it... didn't sit well with me,
  // so all keys in this SayMore are camelCase, internally.
  // Then we map to and from the xml so we still use the same tags for I/O, but maybe
  // someday well migrate to a format that is consistent.
  public getKeyFromXmlTag(tag: string): string {
    // In fields.json, all tags in SayMore Classic which are not camelCase have a "tagInSayMoreClassic".

    const match = this.values().find(
      field => field.definition && field.definition.tagInSayMoreClassic === tag
    );
    if (match) {
      return match.key;
    }
    return camelcase(tag);
  }

  public getFieldDefinition(key: string): FieldDefinition {
    const f = this.getValueOrThrow(key) as Field;
    return f.definition;
  }
  public getTextStringOrEmpty(key: string): string {
    try {
      const s = this.getValueOrThrow(key) as Field;
      return s.text;
    } catch {
      return "";
    }
  }
  public getTextField(key: string): Field {
    return this.getValueOrThrow(key) as Field;
  }
  public getDateField(key: string): Field {
    return this.getValueOrThrow(key) as Field;
  }
  public addDateProperty(key: string, date: Date) {
    this.checkType(key, date);
    this.setValue(key, new Field(key, FieldType.Date, date.toISOString()));
  }
  public addHasConsentProperty(person: Person) {
    this.setValue("hasConsent", new HasConsentField(person));
  }
  public addDisplayNameProperty(person: Person) {
    this.setValue("displayName", new DisplayNameField(person));
  }

  public addTextProperty(key: string, value: string) {
    this.setValue(key, new Field(key, FieldType.Text, value));
  }

  public addCustomProperty(f: Field) {
    this.setValue(f.key, f);
  }
  public addContributionArrayProperty(key: string, value: Contribution[]): any {
    const f = new Field(key, FieldType.Contributions, "unused");
    f.contributorsArray = value;
    this.setValue(key, f);
  }
  private checkType(key: string, value: any) {
    if (this.containsKey(key)) {
      const a = typeof this.getValueOrThrow(key);
      const b = typeof value;
      assert.ok(a === b, `Cannot change type of ${key} from ${a} to ${b}`);
    }
  }
  // users are allow to rename a custom field.
  public changeKeyOfCustomField(field: Field, newKey: string) {
    assert(
      this.containsKey(field.key),
      "Could not find existing field with the old key in the properties dictionary"
    );
    this.remove(field.key);
    field.key = newKey;
    this.setValue(field.key, field);
  }
}
