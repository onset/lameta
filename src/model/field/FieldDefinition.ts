import { IChoice } from "./Field";

export class FieldDefinition {
  public key: string;
  public englishLabel: string = "";
  public deprecated?: string;
  public xmlComment?: string;
  public omitSave?: string; // used for import-only fields
  public omitExport?: boolean;
  public importType?: "languageCodeOrName";
  public description?: string;
  public tipOnUsingThisField?: string;
  public separatorWithCommaInstructions?: string;
  public default?: string;
  public persist: boolean;
  public type: string = "Text";
  public form?: string; // what form this shows on, if not the main one
  public visibility?: "always" | "never" | "ifNotEmpty";
  public cssClass?: string;
  public choices?: string[];
  public controlProps?: object;
  //note: this is currently used only for genres, and is also an open list,
  //where as the user enters new choices we haven't seen before, we add them to
  //this list. The expanded lists is not persisted anywhere... we just
  //reconstitute when we load the files again.
  public complexChoices?: IChoice[];
  public multipleLines?: boolean;
  public multilingual: boolean = false;
  public tabIndex?: number = 99;
  public omitFromImdi?: boolean;
  public imdiRange?: string;
  public imdiIsClosedVocabulary?: boolean;
  public isCustom: boolean = false;
  public rocrate?: {
    key: string;
    template: any;
    handler?: "languages";
    array?: boolean;
  };
  public vocabularyFile?: string;
  // this is for the fields in session that appear under "More Fields".
  public isAdditional?: boolean = false;
  //awkward... this is not use for people, where we don't use the autoform
  public showOnAutoForm: boolean = true;
  // SayMore Windows, at least through version 3.3, has inconsistent capitalization
  public xmlTag?: string = "";
  public personallyIdentifiableInformation?: boolean;
  // the case that the IMDI export puts the value in, in each language, or for topic
  // and keyword, in each comma-separated item
  public capitalization?: Capitalization;

  // Rules that an archive configuration can set on a field. src/problems/fieldRules.ts
  // checks them and writes the messages, which use the field's label.
  // the field must not be empty
  public required?: boolean;
  // the key of a project field whose value also satisfies `required`, for a session
  // field that the export fills from the project when the session has none
  public projectFallback?: string;
  // the field must not be empty when another field of the same file has this value,
  // e.g. { field: "access", value: "S" }
  public requiredWhen?: { field: string; value: string };
  // a regular expression that the whole value must match
  public pattern?: string;
  // what `pattern` allows, in words, e.g. "letters a-z, numbers 0-9, dashes and underscores only"
  public patternDescription?: string;
  public maxLength?: number;
  // for comma-separated fields such as topic and keyword
  public minItems?: number;
  // a multilingual field must have an English value
  public englishRequired?: boolean;
  // a multilingual field must have a value in a language other than English
  public translationRequired?: boolean;
  // How serious it is when this field breaks one of the rules above: one severity for
  // all of them, or one per rule, e.g. { pattern: "warning" }. If not set,
  // "warning" for translationRequired and "error" for the others.
  public severity?: FieldRuleSeverity | Partial<Record<FieldRule, FieldRuleSeverity>>;
  // this constructor lets us take something read in from json and
  // get a definition with any default values set above
  public constructor(rawObject) {
    Object.assign(this, rawObject);
    this.isAdditional = rawObject.additional === true || rawObject.additional === "true";
    /// if englishLabel wasn't specified, derive it from the key
    if (!this.englishLabel) {
      this.englishLabel = this.key;
    }
  }
}

export type FieldRuleSeverity = "error" | "warning";

// sentence: upper-cases the first letter and leaves the rest as typed, so that proper
//   nouns keep their capitals
// ELARTerm: the rule of checkTopicKeywordGenreCapitalisation in ELAR's metadata
//   validator. Upper-cases the first letter and lower-cases each later word, except a
//   word that is all capitals, up to two characters long, or has a character other
//   than a-z.
// title: upper-cases the main words, as the title-case package does
// upper, lower: the whole text
export type Capitalization = "sentence" | "ELARTerm" | "title" | "upper" | "lower";
// the names of the rule properties of FieldDefinition
export type FieldRule =
  | "required"
  | "requiredWhen"
  | "pattern"
  | "maxLength"
  | "minItems"
  | "englishRequired"
  | "translationRequired";
