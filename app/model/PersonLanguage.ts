import * as mobx from "mobx";

export class PersonLanguage {
  //review this @mobx.observable
  @mobx.observable
  public tag: string; // bcp47 language tag

  @mobx.observable
  public primary: boolean;
  @mobx.observable
  public mother: boolean;
  @mobx.observable
  public father: boolean;

  public constructor(tag: string) {
    this.tag = tag;
  }
}
