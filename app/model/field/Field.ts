import { observable } from "mobx";
import TextHolder from "./TextHolder";
import * as assert from "assert";
import { Moment } from "moment";
import { Contribution } from "../file/File";
import { Person } from "../Project/Person/Person";
const moment = require("moment");

const titleCase = require("title-case");
//import * as assert from "assert";

export interface IChoice {
  id: string;
  label: string;
  definition: string;
  examples: string[];
}

export interface IFieldDefinition {
  key: string;
  englishLabel?: string;
  defaultValue?: string;
  persist: boolean;
  type: string;
  form: string; // what form this shows on, if not the main one
  //visibility?: string;
  cssClass?: string;
  choices?: string[];
  complexChoices: IChoice[];
  order: number;
  imdiRange?: string;
  imdiIsClosedVocabulary?: boolean;
}

export enum FieldType {
  Text,
  Date,
  Image,
  Contributions,
  Function
}
export enum FieldVisibility {
  Always,
  IfNotEmpty
}

// REVIEW: Why doesn't a field just store it's definition? Why all this copying? (for now, added definition)

export class Field {
  public readonly key: string;
  public readonly englishLabel: string; // just for debugging at this point
  public readonly type: FieldType;
  public readonly form: string; // where to show it
  public readonly visibility: FieldVisibility;
  public readonly persist: boolean;
  public readonly cssClass: string;
  @observable public textHolder = new TextHolder();
  public choices: string[];
  public definition: IFieldDefinition;
  public contributorsArray: Contribution[]; //review

  // these definitions normally come from fields.json, which in turn can come form a google spreadsheet with json export
  public static fromFieldDefinition(definition: IFieldDefinition): Field {
    if (!definition.form || definition.form.length === 0) {
      definition.form = "primary";
    }

    const type = definition.type
      ? FieldType[definition.type as keyof typeof FieldType]
      : FieldType.Text;
    const choices = definition.choices ? definition.choices : [];

    // console.log(
    //   "fromFieldDefinition() " + definition.key + " is a " + definition.type
    // );
    const f = new Field(
      definition.key,
      type,
      definition.defaultValue,
      definition.englishLabel,
      definition.form,
      FieldVisibility.Always, //todo
      definition.persist,
      choices,
      definition.cssClass
    );
    f.definition = definition; // did this to retain complex choices without yet another new property...
    return f;
  }

  public constructor(
    key: string,
    type: FieldType = FieldType.Text,
    englishValue: string = "",
    englishLabel: string = titleCase(key),
    form: string = "",
    visibility: FieldVisibility = FieldVisibility.Always,
    persist: boolean = true,
    choices: string[] = [],
    cssClass: string = ""
    // imdiRange?: string,
    // imdiIsClosedVocabulary?: boolean
  ) {
    this.key = key;
    this.englishLabel = englishLabel;
    this.form = form;
    this.type = type;
    this.visibility = visibility;
    this.persist = persist;
    this.cssClass = cssClass;
    this.text = englishValue;
    this.choices = choices;

    assert.ok(
      this.key.toLowerCase().indexOf("date") === -1 ||
        this.type === FieldType.Date,
      "SHOULDN'T " + key + " BE A DATE?"
    );
  }

  get text(): string {
    return this.textHolder.textInDefaultLanguage;
  }
  set text(value: string) {
    this.textHolder.textInDefaultLanguage = value;
  }
  public toString(): string {
    return this.text;
  }
  public setValueFromString(s: string): any {
    this.text = s;
  }

  public asDate(): Date {
    return new Date(Date.parse(this.text));
  }

  public asISODateString(): string {
    if (moment(this.text).isValid()) {
      return this.asDate().toISOString();
    }
    return "";
  }
  public asLocaleDateString(): string {
    if (moment(this.text).isValid()) {
      return this.asDate().toLocaleDateString();
    }
    return "";
  }
  public typeAndValueForXml(): [string, string] {
    switch (this.type) {
      case FieldType.Text:
        return ["string", Field.escapeSpecialChars(this.text)];
      case FieldType.Date:
        return ["date", this.asISODateString()];
      default:
        throw new Error("stringify() Unexpected type " + this.type);
    }
  }

  //https://stackoverflow.com/questions/4253367/how-to-escape-a-json-string-containing-newline-characters-using-javascript
  protected static escapeSpecialChars(s: string): string {
    return s
      .replace(/\\n/g, "\\n")
      .replace(/\\'/g, "\\'")
      .replace(/\\"/g, '\\"')
      .replace(/\\&/g, "\\&")
      .replace(/\\r/g, "\\r")
      .replace(/\\t/g, "\\t")
      .replace(/\\b/g, "\\b")
      .replace(/\\f/g, "\\f");
  }
}
export class HasConsentField extends Field {
  private person: Person;
  constructor(person: Person) {
    super(
      "hasConsent",
      FieldType.Function,
      undefined,
      "Consent",
      undefined,
      undefined,
      false
    );
    this.person = person;
  }
  public hasConsent(): boolean {
    return !!this.person.files.find(
      f => f.describedFilePath.indexOf("Consent") > -1
    );
  }
}
