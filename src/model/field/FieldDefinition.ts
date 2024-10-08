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
  public rocrate: {
    key: string;
    template: any;
    handler?: "languages";
    array?: boolean;
  };
  // this is for the fields in session that appear under "More Fields".
  public isAdditional?: boolean = false;
  //awkward... this is not use for people, where we don't use the autoform
  public showOnAutoForm: boolean = true;
  // SayMore Windows, at least through version 3.3, has inconsistent capitalization
  public xmlTag?: string = "";
  public personallyIdentifiableInformation?: boolean;
  // this constructor lets us take something read in from json and
  // get a definition with any default values set above
  public constructor(rawObject) {
    Object.assign(this, rawObject);
    this.isAdditional =
      rawObject.additional === true || rawObject.additional === "true";
    /// if englishLabel wasn't specified, derive it from the key
    if (!this.englishLabel) {
      this.englishLabel = this.key;
    }
  }
}
