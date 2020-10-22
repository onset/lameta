import * as mobx from "mobx";

export interface IPersonLanguage {
  code: string; // iso639-3 language code. lameta doesn't know about bcp47 tags
  primary?: boolean;
  mother?: boolean;
  father?: boolean;
}
