import { observable } from "mobx";
import TextHolder from "./TextHolder";
import { Contribution } from "../file/File";
import { Person } from "../Project/Person/Person";
import moment from "moment";
import { translateFieldLabel, currentUILanguage } from "../../localization";
import { FieldDefinition } from "./FieldDefinition";
import { Folder } from "../Folder";

//import * as assert from "assert";

export interface IChoice {
  id: string;
  label: string;
  definition: string;
  examples: string[];
}

export enum FieldType {
  Text,
  Date,
  Image,
  // Contributions,
  Language,
  MultiLanguage,
  Function,
  Boolean,
}
export enum FieldVisibility {
  Always,
  IfNotEmpty,
}

// REVIEW: Why doesn't a field just store it's definition? Why all this copying? (for now, added definition)

export class Field {
  //TODO: remove things that just repeat field definition
  public key: string;
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

  // these definitions normally come from fields.json5, which in turn can come from a google spreadsheet with json export
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
      case "multiLanguage":
        type = FieldType.MultiLanguage;
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
    form: string = "",
    visibility: FieldVisibility = FieldVisibility.Always,
    persist: boolean = true,
    choices: string[] = [],
    cssClass?: string
    // imdiRange?: string,
    // imdiIsClosedVocabulary?: boolean
  ) {
    this.key = key;
    this.form = form;
    this.type = type;
    this.visibility = visibility;
    this.persist = persist;
    this.cssClass = cssClass ? cssClass : key;
    this.text = englishValue;
    this.choices = choices.filter((c) => {
      return c.indexOf("//") !== 0; // we don't yet have webpack allowing comments in json, so we strip out elements that start with //
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
  // returns the label translated or if unavailable, English
  public get labelInUILanguage(): string {
    return translateFieldLabel(this.definition);
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
    if (this.key === "name") {
      //console.log(`setValueFromString(${s})`);
    }
    // if this field has choices, set it to
    if (this.choices && this.choices.length > 0) {
      const find = s.toLocaleLowerCase().trim();
      const match = this.choices.find((c) => {
        //console.log(`${c}`);
        return c.toLowerCase().trim() === find;
      });
      if (match) {
        this.text = match;
      } else {
        //TODO Log a problem where users can see it
        console.log(
          `Warning: the field ${this.definition.englishLabel} is a choice list but the value "${s}" is not one of the choices in this version. There are ${this.choices.length} choices.`
        );
        //console.log(this.choices.join(","));
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
  // public asDateDisplayString(): string {
  //   const m = moment(this.text);
  //   if (m.isValid()) {
  //     moment.locale(navigator.language);
  //     const localeData = moment.localeData();
  //     const dateFormat = localeData.longDateFormat("ll");
  //     return m.format(dateFormat);
  //   }
  //   return this.text;
  // }
  // public asDateTimeDisplayString(): string {
  //   const m = moment(this.text);
  //   if (m.isValid()) {
  //     moment.locale(navigator.language);
  //     const localeData = moment.localeData();
  //     const dateFormat = localeData.longDateFormat("YYYY-MM-DD");
  //     return m.format(dateFormat);
  //   }
  //   return this.text;
  // }
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
    if (this.text.trim().length === 0) {
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
    console.assert(this.text !== null && this.text !== undefined);
    switch (this.type) {
      case FieldType.Text:
        return { type: "string", value: Field.escapeSpecialChars(this.text) };
      case FieldType.Date:
        return { type: "date", value: this.asISODateString() };
      case FieldType.Language:
        return { type: "language", value: this.text };
      case FieldType.MultiLanguage:
        return { type: "multiLanguage", value: this.text };
      default:
        throw new Error("stringify() Unexpected type " + this.type);
    }
  }

  //https://stackoverflow.com/questions/4253367/how-to-escape-a-json-string-containing-newline-characters-using-javascript
  protected static escapeSpecialChars(s: string): string {
    console.assert(s !== null && s !== undefined);
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
      "Consent",
      undefined,
      undefined,
      false
    );
    this.person = person;
    this.definition = new FieldDefinition({
      key: "hasConsent",
      englishLabel: "Consent",
      persist: false,
    });
  }
  public hasConsent(): boolean {
    return !!this.person.files.find((f) => f.isLabeledAsConsent());
  }
}
export class PersonDisplayNameField extends Field {
  private person: Person;
  constructor(person: Person) {
    super(
      "displayName",
      FieldType.Function,
      "Person",
      undefined,
      undefined,
      false
    );
    this.person = person;
    this.definition = new FieldDefinition({
      key: "displayName",
      englishLabel: "Person",
      persist: false,
    });
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
// used to temporarily select folders for some action, e.g. exporting
// export class CheckedField extends Field {
//   private folder: Folder;
//   private checked: boolean = false;
//   constructor(folder: Folder) {
//     super("checked", FieldType.Boolean, "Checked", undefined, undefined, false);
//     this.folder = folder;
//     this.definition = new FieldDefinition({
//       key: "checked",
//       englishLabel: "Checked",
//       persist: false
//     });
//   }
//   public toggle() {
//     this.checked = !this.checked;
//   }
// }
