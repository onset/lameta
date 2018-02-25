import { Dictionary } from "typescript-collections";
import * as assert from "assert";
import { Field, FieldType, IFieldDefinition } from "./Field";

export class FieldSet extends Dictionary<string, Field> {
  public setText(key: string, value: string) {
    const f = this.getValue(key);
    assert(f, `setText(${key}) assumes the value is already there.`);
    f.setValueFromString(value);
  }
  public getFieldDefinition(key: string): IFieldDefinition {
    const f = this.getValue(key) as Field;
    return f.definition;
  }
  public getTextStringOrEmpty(key: string): string {
    const s = this.getValue(key) as Field;
    return s ? s.text : "";
  }
  public getTextField(key: string): Field {
    return this.getValue(key) as Field;
  }
  public getDateField(key: string): Field {
    return this.getValue(key) as Field;
  }
  public addDateProperty(key: string, date: Date) {
    this.checkType(key, date);
    this.setValue(key, new Field(key, FieldType.Date, date.toISOString()));
  }

  public manditoryTextProperty(key: string, value: string) {
    if (!this.containsKey(key)) {
      this.setValue(key, new Field(key, FieldType.Text, value));
    }
  }
  // public manditoryField(field: Field) {
  //   if (this.containsKey(field.key)) {
  //     const existing = this.getValue(field.key);
  //     // a fuller version of this could be made to migrate the old data into what we expect now
  //     field.setValueFromString(existing)
  //   }
  //   else {
  //     this.setValue(field.key, field);
  //   }
  // }
  public addTextProperty(key: string, value: string) {
    this.setValue(key, new Field(key, FieldType.Text, value));
  }

  private checkType(key: string, value: any) {
    if (this.containsKey(key)) {
      const a = typeof this.getValue(key);
      const b = typeof value;
      assert(a === b, `Cannot change type of ${key} from ${a} to ${b}`);
    }
  }
}
