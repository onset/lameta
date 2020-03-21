import { IChoice } from "./Field";
import { titleCase } from "title-case";

export class FieldDefinition {
  public key: string;
  public englishLabel: string = "";
  public tooltip?: string;
  public specialInfo?: string;
  public default?: string;
  public persist: boolean;
  public type: string = "Text";
  public form?: string; // what form this shows on, if not the main one
  //visibility?: string;
  public cssClass?: string;
  public choices?: string[];
  public complexChoices?: IChoice[];
  public multipleLines?: boolean;
  public tabIndex?: number = 99;
  public markAsNotImdi?: boolean;
  public imdiRange?: string;
  public imdiIsClosedVocabulary?: boolean;
  public isCustom: boolean = false;
  // this is for the fields in session that appear under "More Fields".
  public isAdditional?: boolean = false;
  //awkward... this is not use for people, where we don't use the autoform
  public showOnAutoForm: boolean = true;
  // SayMore Windows, at least through version 3.3, has inconsistent capitalization
  public tagInSayMoreClassic?: string = "";
  public personallyIdentifiableInformation?: boolean;
  // this constructor lets us take something read in from json and
  // get a definition with any default values set above
  public constructor(rawObject) {
    Object.assign(this, rawObject);
    this.isAdditional =
      rawObject.additional === true || rawObject.additional === "true";
    /// if englishLabel wasn't specified, derive it from the key
    if (!!!this.englishLabel) {
      this.englishLabel = titleCase(this.key);
    }
  }
}
