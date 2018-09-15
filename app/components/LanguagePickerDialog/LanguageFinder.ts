import TrieSearch from "trie-search";

const languageIndex = require("./SilLanguageDataIndex.json");

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
  private trie: TrieSearch;
  constructor() {
    this.trie = new TrieSearch("name", ["code", "two"], ["code", "three"]);
    this.trie.addAll(languageIndex);
  }
  public find(prefix: string): Language[] {
    const matches = this.trie.get(prefix);
    return matches
      .map(m => new Language(m))
      .sort((a: Language, b: Language) => {
        if (
          // a.name.localeCompare(prefix, undefined, { sensitivity: "base" }) ===
          //   0 ||
          a.name.toLowerCase() === prefix.toLowerCase() ||
          a.name.toLowerCase().startsWith(prefix.toLowerCase()) ||
          a.iso639_3.toLowerCase() === prefix.toLowerCase() ||
          (a.iso639_2 && a.iso639_2.toLowerCase() === prefix.toLowerCase())
        ) {
          return -1;
        }
        if (
          // b.name.localeCompare(prefix, undefined, { sensitivity: "base" }) ===
          //   0 ||
          b.name.toLowerCase() === prefix.toLowerCase() ||
          b.name.toLowerCase().startsWith(prefix.toLowerCase()) ||
          b.iso639_3.toLowerCase() === prefix.toLowerCase() ||
          (b.iso639_2 && b.iso639_2.toLowerCase() === prefix.toLowerCase())
        ) {
          return 1;
        }

        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
  }
}
