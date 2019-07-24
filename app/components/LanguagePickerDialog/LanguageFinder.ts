import TrieSearch from "trie-search";

class Language {
  public name: string;
  public altNames: string[];
  // tslint:disable-next-line:variable-name
  public iso639_3: string;
  // tslint:disable-next-line:variable-name
  public iso639_2: string | undefined;
  constructor(jsonFromIndex: any) {
    this.name = jsonFromIndex.name;
    this.altNames = jsonFromIndex.altNames;
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
    return [this.name, ...this.altNames];
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
      //"altNames", TrieSearch can't handle array values
      ["code", "two"],
      ["code", "three"]
    ]);

    const index = indexForTesting
      ? indexForTesting
      : require("./SilLanguageDataIndex.json");
    this.langToCodeLookup.addAll(index);

    index.forEach(languageEntry => {
      if (languageEntry.altNames && languageEntry.altNames.length > 0) {
        languageEntry.altNames.forEach(alternativeName => {
          this.langToCodeLookup.map(alternativeName, languageEntry);
        });
        // REVIEW: is it really that much slower to include them all?
        // NOte, Deutsch is like, 3rd for German
        //this.langToCodeLookup.map(languageEntry.altNames[0], languageEntry);
      }
    });
  }
  private matchesPrefix(
    language,
    prefix: string,
    includeAlternativeNames: boolean
  ): boolean {
    const name = language.name.toLowerCase();
    const pfx = prefix.toLocaleLowerCase();
    return (
      name === pfx ||
      name.startsWith(pfx) ||
      language.iso639_3 === pfx ||
      (language.iso639_2 && language.iso639_2 === pfx) ||
      (includeAlternativeNames &&
        language.altNames.some(n => n.toLowerCase().startsWith(pfx)))
    );
  }
  public findCodeFromName(prefix: string): Language[] {
    // gives us hits on name & codes that start with the prefix
    const matches = this.langToCodeLookup.get(prefix);
    return matches
      .map(m => new Language(m))
      .sort((a: Language, b: Language) => {
        //we want exact matches to sort before just prefix matches
        if (this.matchesPrefix(a, prefix, true)) {
          return -1;
        }
        if (this.matchesPrefix(b, prefix, true)) {
          return 1;
        }
        // nothing matches exactly, so sort based on base character (disregarding diacritics)
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
  }
  public findMatchesForSelect(prefix: string): any[] {
    // gives us hits on name & codes that start with the prefix
    const matches = this.langToCodeLookup.get(prefix);
    const pfx = prefix.toLocaleLowerCase();

    const langs = matches.map(m => new Language(m));
    let sorted: Language[];
    const kMaxMatchesToSpendTimeOne = 1000;
    const spendTimeThinking = langs.length <= kMaxMatchesToSpendTimeOne;

    sorted = langs.sort((a: Language, b: Language) => {
      // if the user types "en", we want to suggest "english" above "en" of vietnam
      if (pfx === "en" && a.iso639_2 === "en") {
        return -1;
      }
      if (pfx === "en" && b.iso639_2 === "en") {
        return 1;
      }

      // These sorts take a long time, and it makes it hard to type. So we only do it
      // when there are a small number of languages to order.
      if (spendTimeThinking) {
        //we want exact matches to sort before just prefix matches
        // if (a.someNameMatches(pfx)) {
        //   return -1;
        // }
        // if (b.someNameMatches(pfx)) {
        //   return 1;
        // }

        if (this.matchesPrefix(a, pfx, false)) {
          return -1;
        }
        if (this.matchesPrefix(b, pfx, false)) {
          return 1;
        }
      }
      // nothing matches exactly, so sort based on base character (disregarding diacritics)
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    return sorted.map(l => {
      let nameMatchingWhatTheyTyped: string | undefined = "";
      let label = l.name;
      if (l.name.toLocaleLowerCase().startsWith(pfx) && l.altNames) {
        nameMatchingWhatTheyTyped = l.altNames.find(n =>
          n.toLowerCase().startsWith(pfx)
        );
        if (nameMatchingWhatTheyTyped) {
          label = nameMatchingWhatTheyTyped + " (" + l.name + ")";
        }
      }
      return {
        value: l.iso639_3,
        label
      };
    });
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
