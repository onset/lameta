import { Dictionary } from "typescript-collections";
import { Field, TextField, DateField } from "./Field";
import * as assert from "assert";

export class FieldSet extends Dictionary<string, Field> {
  public getTextStringOrEmpty(key: string): string {
    const s = this.getValue(key) as TextField;
    return s ? s.english : "";
  }
  public getTextField(key: string): TextField {
    return this.getValue(key) as TextField;
  }
  public getDateField(key: string): DateField {
    return this.getValue(key) as DateField;
  }
  public addDateProperty(key: string, date: Date) {
    this.checkType(key, date);
    this.setValue(key, new DateField(key, date));
  }

  public manditoryTextProperty(key: string, value: string) {
    if (!this.containsKey(key)) {
      this.setValue(key, new TextField(key, value));
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
    this.setValue(key, new TextField(key, value));
  }

  private checkType(key: string, value: any) {
    if (this.containsKey(key)) {
      const a = typeof this.getValue(key);
      const b = typeof value;
      assert(a === b, `Cannot change type of ${key} from ${a} to ${b}`);
    }
  }
}
