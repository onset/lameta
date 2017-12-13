import { observable } from "mobx";
import * as fs from "fs";
import * as Path from "path";
import { File } from "./File";
const titleCase = require("title-case");
import * as assert from "assert";

export enum FieldType {
  ShortText,
  Paragraph,
  Date,
  Image
}
export enum FieldVisibility {
  Extra,
  OnForm
}
export class Field {
  public readonly key: string;
  public readonly englishLabel: string; // just for debugging at this point
  public readonly type: FieldType;
  public readonly visibility: FieldVisibility;
  public readonly cssClass: string;
  @observable public text = new Map();

  public static parse(fieldDescription: any): Field {
    console.log("parse(" + fieldDescription.toString());
    return Field.create(
      fieldDescription.key,
      fieldDescription.englishLabel,
      fieldDescription.type,
      fieldDescription.visibility,
      fieldDescription.cssClass
    );
  }

  public static create(
    key: string,
    value: any,
    englishLabel: string = titleCase(key),
    type: FieldType = FieldType.ShortText,
    visibility: FieldVisibility = FieldVisibility.Extra,
    cssClass: string = ""
  ): Field {
    switch (type) {
      case FieldType.ShortText:
      case FieldType.Paragraph:
        return new TextField(
          key,
          value,
          englishLabel,
          type,
          visibility,
          cssClass
        );
      case FieldType.Date:
        return new DateField(
          key,
          value,
          englishLabel,
          type,
          visibility,
          cssClass
        );
      default:
        throw new RangeError("Uknown field type");
    }
  }

  public constructor(
    key: string,
    englishLabel: string = titleCase(key),
    type: FieldType = FieldType.ShortText,
    visibility: FieldVisibility = FieldVisibility.Extra,
    cssClass: string = ""
  ) {
    this.key = key;
    this.englishLabel = englishLabel;
    this.type = type;
    this.visibility = visibility;
    this.cssClass = cssClass;
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

export class DateField extends Field {
  public date: Date;
  constructor(
    key: string,
    date: Date,
    englishLabel: string = titleCase(key),
    type: FieldType = FieldType.ShortText,
    visibility: FieldVisibility = FieldVisibility.Extra,
    cssClass: string = ""
  ) {
    super(key, englishLabel, type, visibility, cssClass);
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
  constructor(
    key: string,
    englishValue: string = "",
    englishLabel: string = titleCase(key),
    type: FieldType = FieldType.ShortText,
    visibility: FieldVisibility = FieldVisibility.Extra,
    cssClass: string = ""
  ) {
    super(key, englishLabel, type, visibility, cssClass);
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
