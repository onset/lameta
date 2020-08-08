import * as mobx from "mobx";

export class PersonLanguage {
  //review this @mobx.observable
  @mobx.observable
  public tag: string; // bcp47 language tag

  public constructor(tag: string) {
    this.tag = tag;
  }
}
