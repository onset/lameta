import TrieSearch from "trie-search";

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
  public someNameMatches(name: string): boolean {
    return this.allNames().some(
      n =>
        name.localeCompare(n, undefined, {
          sensitivity: "base"
        }) === 0
    );
  }
  public allNames(): string[] {
    return [this.name]; // don't have altnames yet
  }
}

export default class LanguageFinder {
  //private langs = new Array<Language>();
  private langToCodeLookup: TrieSearch;
  //private codeToLangLookup: TrieSearch;

  constructor(indexForTesting?) {
    // currently this uses a trie, which is overkill for this number of items,
    // but I'm using it because I do need prefix matching and this library does that.

    // Enhance this TrieSearch doesn't provide a way to include our alternative language name arrays
    // Enhance allow for matching even if close (e.g. levenshtein distance)
    // Configure the trie to match what is in the index json
    this.langToCodeLookup = new TrieSearch([
      "name",
      ["code", "two"],
      ["code", "three"]
    ]);

    this.langToCodeLookup.addAll(
      indexForTesting ? indexForTesting : require("./SilLanguageDataIndex.json")
    );
    // //this.langToCodeLookup.Array
    // const x = require("./SilLanguageDataIndex.json");

    // //    this.codeToLangLookup = new TrieSearch(["code", "three"]);
    // this.codeToLangLookup = new TrieSearch([
    //   "name", // Searches `object.name`
    //   ["code", "three"] // `Search object.details.age`
    // ]);
    // //this.codeToLangLookup.add(x[2]);
    // this.codeToLangLookup.addAll(x);
    // console.log(">>>> " + this.codeToLangLookup.get("aaa"));
    // console.log(">>>> " + JSON.stringify(this.codeToLangLookup.get("aab")));
  }
  private matchesPrefix(language, prefix: string): boolean {
    return (
      language.name.toLowerCase() === prefix.toLowerCase() ||
      language.name.toLowerCase().startsWith(prefix.toLowerCase()) ||
      language.iso639_3.toLowerCase() === prefix.toLowerCase() ||
      (language.iso639_2 &&
        language.iso639_2.toLowerCase() === prefix.toLowerCase())
    );
  }
  public findCodeFromName(prefix: string): Language[] {
    // gives us hits on name & codes that start with the prefix
    const matches = this.langToCodeLookup.get(prefix);
    return matches
      .map(m => new Language(m))
      .sort((a: Language, b: Language) => {
        //we want exact matches to sort before just prefix matches
        if (this.matchesPrefix(a, prefix)) {
          return -1;
        }
        if (this.matchesPrefix(b, prefix)) {
          return 1;
        }
        // nothing matches exactly, so sort based on base character (disregarding diacritics)
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
  }
  public findMatchesForSelect(prefix: string): any[] {
    // gives us hits on name & codes that start with the prefix
    const matches = this.langToCodeLookup.get(prefix);
    return matches
      .map(m => new Language(m))
      .sort((a: Language, b: Language) => {
        // if the user types "en", we want to suggest "english" above "en" of vietnam
        if (prefix === "en" && a.iso639_2 === "en") {
          return -1;
        }
        if (prefix === "en" && b.iso639_2 === "en") {
          return 1;
        }
        //we want exact matches to sort before just prefix matches
        if (this.matchesPrefix(a, prefix)) {
          return -1;
        }
        if (this.matchesPrefix(b, prefix)) {
          return 1;
        }
        // nothing matches exactly, so sort based on base character (disregarding diacritics)
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      })
      .map(l => ({ value: l.iso639_3, label: l.name }));
  }

  public findOneLanguageNameFromCode_Or_ReturnCode(code: string) {
    const trimmedCode = code.trim();
    // this would also match on full names, which we don't like (e.g., "en" is a language of Vietnam)
    const matches = this.langToCodeLookup.get(trimmedCode);
    const x = matches.filter(m => {
      return m.code.two === trimmedCode || m.code.three === trimmedCode;
    });
    if (x.length === 1) {
      return x[0].name;
    }
    return trimmedCode;
  }
}
