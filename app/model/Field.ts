import { observable } from "mobx";
import * as fs from "fs";
import * as Path from "path";
import { File } from "./File";
const titleCase = require("title-case");

export class Field {
  public readonly englishLabel: string; // just for debugging at this point

  constructor(label: string) {
    this.englishLabel = titleCase(label);
  }

  public setValueFromString(v: string): any {
    throw new Error("Subclasses must implement setValueFromString");
  }
}

export class DateField extends Field {
  public date: Date;
  constructor(label: string, date: Date) {
    super(label);
    this.date = date;
  }
  public toString(): string {
    return this.date.toLocaleDateString();
  }
  public setDate(date: Date) {
    this.date = date;
  }
  public setValueFromString(s: string): any {
    this.date = new Date(s);
  }
}

export class TextField extends Field {
  @observable public text = new Map();

  constructor(label: string, englishValue: string) {
    super(label);
    this.text.set("en", englishValue);
  }
  get english(): string {
    return this.text.get("en");
  }
  set english(value: string) {
    console.log(this.englishLabel + ":setDefault(" + value + ")");
    this.text.set("en", value);
  }
  public toString(): string {
    return this.english;
  }
  public setValueFromString(s: string): any {
    this.english = s;
  }
}
