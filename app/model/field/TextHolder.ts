import { observable, runInAction } from "mobx";

/*** This class is really just a string. But it's here because we have found that virtually every long-lived language-related app
 * eventually
 * 1) needs to know the language of each string
 * 2) needs a way to have values that are {language, value} tuples
 *
 * If we wait until the application is mature enough to need these things before planning for them, it's expensive.
 * If we implement them fully before we really need them, it of course this complicates things before we know for sure we need it.
 *
 * So my attempt here is to at least create the obvious spot for multi-lingual strings, while keeping the present simple.
 * For now TextHolder is only going to store stuff in "en" (english) for now, and calling code doesn't have to think about language (yet).
 *
 */
export default class TextHolder {
  public map = observable.map();
  public get textInDefaultLanguage() {
    const x = this.map.get("en") as string;
    return x ? x : "";
  }
  public set textInDefaultLanguage(value: string) {
    runInAction(() => this.map.set("en", value));
  }
}
