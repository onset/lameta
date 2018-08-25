import { observable } from "mobx";
import TextHolder from "./TextHolder";
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

export class FieldDefinition {
  public key: string;
  public englishLabel?: string;
  public default?: string;
  public persist: boolean;
  public type: string;
  public form?: string; // what form this shows on, if not the main one
  //visibility?: string;
  public cssClass?: string;
  public choices?: string[];
  public complexChoices?: IChoice[];
  public order?: number = 0;
  public imdiRange?: string;
  public imdiIsClosedVocabulary?: boolean;
  public isCustom: boolean = false;
  // this is for the fields in session that appear under "More Fields"
  public additional?: boolean = false;
  //awkward... this is not use for people, where we don't use the autoform
  public showOnAutoForm: boolean = true;
  // SayMore Windows, at least through version 3.3, has inconsistent capitalization
  public tagInSayMoreClassic?: string = "";

  // this constructor lets us take something read in from json and
  // get a definition with any default values set above
  public constructor(rawObject) {
    Object.assign(this, rawObject);
  }
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
  //TODO: remove things that just repeat field definition
  public key: string;
  public englishLabel: string;
  public readonly type: FieldType;
  public readonly form: string; // where to show it
  public readonly visibility: FieldVisibility;
  public persist: boolean;
  public readonly cssClass: string;
  @observable
  public textHolder = new TextHolder();
  public choices: string[];
  public definition: FieldDefinition;
  public contributorsArray: Contribution[]; //review

  // these definitions normally come from fields.json, which in turn can come from a google spreadsheet with json export
  public static fromFieldDefinition(definition: FieldDefinition): Field {
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
      definition.default,
      definition.englishLabel,
      definition.form,
      FieldVisibility.Always, //todo
      definition.persist,
      choices,
      definition.cssClass
    );
    // if (definition.showOnAutoForm === undefined) {
    //   definition.showOnAutoForm = true;
    // }
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
    cssClass?: string
    // imdiRange?: string,
    // imdiIsClosedVocabulary?: boolean
  ) {
    this.key = key;
    this.englishLabel = englishLabel;
    this.form = form;
    this.type = type;
    this.visibility = visibility;
    this.persist = persist;
    this.cssClass = cssClass ? cssClass : key;
    this.text = englishValue;
    this.choices = choices.filter(c => {
      return c.indexOf("//") !== 0; // we dont yet have webpack allowing comments in json, so we strip out elements that start with //
    });

    // Review: maybe it's lame to have some fields have a format definition, and some don't.
    // this.definition = {
    //   key,
    //   englishLabel,
    //   //default?: string;
    //   persist,
    //   type: type.toString(),
    //   form,
    //   cssClass,
    //   choices,
    //   complexChoices: [],
    //   order: 1000,
    //   //order: number;
    //   //imdiRange?: string;
    //   //imdiIsClosedVocabulary?: boolean;
    //   isCustom: false
    // };
    //assert.ok(
    // this.key.toLowerCase().indexOf("date") === -1 ||
    //   this.type === FieldType.Date,
    // "SHOULDN'T " + key + " BE A DATE?"
    //);
    if (
      this.key.toLowerCase().indexOf("date") > -1 &&
      this.type !== FieldType.Date
    ) {
      console.error(key + " should be a date?");
    }
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

  // public asDate(): Date {
  //   const x = new Date("2015-03-25Z");
  //   const y = x.getUTCDate();
  //   const z = this.text.indexOf("Z") > -1 ? this.text : this.text + "Z";
  //   return new Date(this.text);
  // }

  public asISODateString(): string {
    // our rule is that we always keep strings in "YYYY-MM-DD" format, and it's always UTC
    return this.text;
  }
  public asLocaleDateString(): string {
    // if (moment(this.text).isValid()) {
    //   return this.asDate().toLocaleDateString();
    // }
    // return "";

    // maybe someday. But at the moment, javascript's date stuff is so eager to get into timezones
    // that it's introducing buts. So for now let' keep it simple by just sticking to storing dates only as
    // "YYYY-MM-DD" format string, and always UTC
    return this.text;
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
    return !!this.person.files.find(f => f.isLabeledAsConsent());
  }
}
