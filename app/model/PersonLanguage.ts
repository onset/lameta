import * as mobx from "mobx";

export interface IPersonLanguage {
  //review this @mobx.observable

  tag: string; // bcp47 language tag

  primary?: boolean;

  mother?: boolean;

  father?: boolean;

  // public constructor(
  //   tag: string,
  //   primary?: boolean,
  //   mother?: boolean,
  //   father?: boolean
  // ) {
  //   this.tag = tag;
  //   this.primary = !!primary;
  //   this.mother = !!mother;
  //   this.father = !!father;
  // }
}
