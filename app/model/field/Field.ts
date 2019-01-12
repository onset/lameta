import { observable } from "mobx";
import TextHolder from "./TextHolder";
import { Contribution } from "../file/File";
import { Person } from "../Project/Person/Person";
import moment from "moment";
import { translateFieldLabel, currentUILanguage } from "../../localization";
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
  public type: string = "Text";
  public form?: string; // what form this shows on, if not the main one
  //visibility?: string;
  public cssClass?: string;
  public choices?: string[];
  public complexChoices?: IChoice[];
  public multipleLines?: boolean;
  public order?: number = 0;
  public imdiRange?: string;
  public imdiIsClosedVocabulary?: boolean;
  public isCustom: boolean = false;
  // this is for the fields in session that appear under "More Fields".
  public isAdditional?: boolean = false;
  //awkward... this is not use for people, where we don't use the autoform
  public showOnAutoForm: boolean = true;
  // SayMore Windows, at least through version 3.3, has inconsistent capitalization
  public tagInSayMoreClassic?: string = "";

  // this constructor lets us take something read in from json and
  // get a definition with any default values set above
  public constructor(rawObject) {
    Object.assign(this, rawObject);
    this.isAdditional =
      rawObject.additional === true || rawObject.additional === "true";
  }
}

export enum FieldType {
  Text,
  Date,
  Image,
  // Contributions,
  Language,
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
    let type = FieldType.Text;
    switch (definition.type.toLowerCase()) {
      case "date":
        type = FieldType.Date;
        break;
      case "image":
        type = FieldType.Image;
        break;
      // case "contributions":
      //   type = FieldType.Contributions;
      //   break;
      case "language":
        type = FieldType.Language;
        break;
      case "function":
        type = FieldType.Function;
        break;
      case "text":
      default:
        type = FieldType.Text;
    }
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
      console.log("***" + key + " should be a date? ");
    }
  }

  public get text(): string {
    return this.textHolder.textInDefaultLanguage;
  }
  public set text(value: string) {
    this.textHolder.textInDefaultLanguage = value;
  }
  public toString(): string {
    return this.text;
  }
  public setValueFromString(s: string): any {
    // if this field has choices, set it to
    if (this.choices && this.choices.length > 0) {
      const match = this.choices.find(
        c => c.toLowerCase() === s.toLocaleLowerCase()
      );
      if (match) {
        this.text = match;
      } else {
        //TODO Log a problem where users can see it
        console.log(
          `Warning: the field ${
            this.englishLabel
          } is a choice list but the value, ${s}, is not one of the choices in this version.`
        );
        this.text = s;
      }
    } else {
      this.text = s;
    }
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
  public asDateDisplayString(): string {
    const m = moment(this.text);
    if (m.isValid()) {
      return m.format("ll"); // Aug 11 2017
    }
    return this.text;
  }
  public asDateTimeDisplayString(): string {
    const m = moment(this.text);
    if (m.isValid()) {
      return m.format("lll"); // Aug 11 2017
    }
    return this.text;
  }
  public asDate(): Date | undefined {
    const m = moment(this.text);
    if (m.isValid()) {
      return m.toDate();
    } else {
      return undefined;
    }
  }

  /*  This is currently used for IMDI export.
     Its docs say: Please enter the age in the following format: YY or YY;MM or YY;MM.DD.
      If the exact age is not known, it is nevertheless useful to enter an approximate age. This will allow you later to 
      conduct searches on all actors who are in the age range between, e.g., 20 and 30 years of age.
  */

  public ageOn(referenceDate: Date): string {
    if (this.text.trim.length === 0) {
      return "";
    }
    const referenceMoment = moment(referenceDate);
    const birthMoment = moment(this.text);
    if (referenceMoment.isValid() && birthMoment.isValid()) {
      const duration = moment.duration(referenceMoment.diff(birthMoment)); // referenceMoment.from(birthMoment);
      // this would be good if we had actual birthdates: const r = `${x.years()};${x.months()}.${x.days()}`;
      // but we currently only have year, so this will give us the year (rounding down)
      return duration.years().toString();
    } else {
      return "";
    }
  }

  public typeAndValueEscapedForXml(): { type: string; value: string } {
    switch (this.type) {
      case FieldType.Text:
        return { type: "string", value: Field.escapeSpecialChars(this.text) };
      case FieldType.Date:
        return { type: "date", value: this.asISODateString() };
      case FieldType.Language:
        return { type: "language", value: this.text };

      default:
        throw new Error("stringify() Unexpected type " + this.type);
    }
  }

  // returns the label translated or if unavailable, English
  public get labelInUILanguage(): string {
    return translateFieldLabel(this);
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
export class DisplayNameField extends Field {
  private person: Person;
  constructor(person: Person) {
    super(
      "displayName",
      FieldType.Function,
      undefined,
      "Person",
      undefined,
      undefined,
      false
    );
    this.person = person;
  }
  public get text(): string {
    return this.person.displayName;
  }
  public set text(value: string) {
    // has no effect
  }
  public displayName(): string {
    return this.person.displayName;
  }
}
