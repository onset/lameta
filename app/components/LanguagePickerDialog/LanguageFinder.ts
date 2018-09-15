import Trie from "./trie";

class Language {
  public name: string;
  // tslint:disable-next-line:variable-name
  public iso639_3: string;
  // tslint:disable-next-line:variable-name
  public iso639_2: string | undefined;
  constructor(jsonFromIndex: any) {
    this.name = jsonFromIndex.name;
    this.iso639_3 = jsonFromIndex.code.three;
    //most languages do not have a 2 letter code
    this.iso639_2 = jsonFromIndex.code.two;
  }
}

export default class LanguageFinder {
  private langs = new Array<Language>();
  private Trie;
  constructor() {
    this.langs.push(
      new Language({ name: "English", code: { three: "eng", two: "en" } })
    );
    this.langs.push(new Language({ name: "Sause", code: { three: "sao" } }));
  }
  public find(prefix: string): Language[] {
    return this.langs
      .filter(l => {
        return (
          l.iso639_3 === prefix || l.iso639_2 === prefix || l.name === prefix
        );
      })
      .map(l => l);
  }
}
