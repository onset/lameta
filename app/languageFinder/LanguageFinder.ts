import TrieSearch from "trie-search";

export class Language {
  public englishName: string;
  public localName: string;
  public altNames: string[];
  // tslint:disable-next-line:variable-name
  public iso639_3: string;
  // tslint:disable-next-line:variable-name
  public iso639_1: string | undefined;

  constructor(jsonFromIndex: any) {
    this.englishName = jsonFromIndex.englishName;
    this.localName = jsonFromIndex.localName;
    this.altNames = jsonFromIndex.altNames || [];
    this.iso639_3 = jsonFromIndex.iso639_3;
    //note, most languages do not have this code, which is the 2 letter code for major languages
    this.iso639_1 = jsonFromIndex.iso639_1;
  }
  public someNameMatches(name: string): boolean {
    const foundAtLeastOne = this.allNames().some(n => {
      const match =
        name.localeCompare(n, undefined, {
          sensitivity: "base"
        }) === 0;
      return match;
    });
    return foundAtLeastOne;
  }
  public allNames(): string[] {
    return [this.englishName, this.localName, ...this.altNames];
  }
}
interface IIndexEntry {
  iso639_1?: string;
  iso639_3: string;
  englishName: string;
  localName?: string;
  altNames?: string[];
}

export class LanguageFinder {
  private index: TrieSearch;
  private defaultContentLanguage: IIndexEntry;

  constructor(defaultContentLanguage: IIndexEntry) {
    this.defaultContentLanguage = defaultContentLanguage;

    // currently this uses a trie, which is overkill for this number of items,
    // but I'm using it because I do need prefix matching and this library does that.

    // Enhance this TrieSearch doesn't provide a way to include our alternative language name arrays
    // Enhance allow for matching even if close (e.g. levenshtein distance)
    // Configure the trie to match what is in the index json
    this.index = new TrieSearch([
      "englishName",
      "localName",
      //"altNames", TrieSearch can't handle array values, so we'll add them by hand below
      "iso639_1",
      "iso639_3"
    ]);

    // add the primary name and two codes
    const index = require("./langindex.json");
    this.index.addAll(index);

    // now add the alternative names
    index.forEach(indexEntry => {
      if (indexEntry.altNames && indexEntry.altNames.length > 0) {
        indexEntry.altNames.forEach(alternativeName => {
          this.index.map(alternativeName, indexEntry);
        });
      }
      if (indexEntry.localName && indexEntry.localName.length > 0) {
        this.index.map(indexEntry.localName, indexEntry);
      }
    });
    // if the custom language is a custom one, that is, without a real iso639_3 code,
    // we want to be able to find it. Enhance: only add this if it is in the qaa-qtz range?
    this.index.map(defaultContentLanguage.iso639_3, defaultContentLanguage);
    if (defaultContentLanguage.englishName) {
      this.index.map(
        defaultContentLanguage.englishName,
        defaultContentLanguage
      );
    }
  }
  private matchesPrefix(
    language,
    prefix: string,
    includeAlternativeNames: boolean
  ): boolean {
    // NB: this accent dropping is probably useless here because the TrieSearch won't return as
    // candidates anything that didn't match, and it doesn't know about matching without accents.
    const englishName = language.englishName.toLocaleLowerCase("en-US"); // english because that will drop accents
    // 'any' because typescript doesn't know about the locale parameter yet
    const pfx = (prefix as any).toLocaleLowerCase("en-US");
    return (
      englishName === pfx ||
      englishName.startsWith(pfx) ||
      language.iso639_3 === pfx ||
      (language.iso639_2 && language.iso639_2 === pfx) ||
      (includeAlternativeNames &&
        language.altNames.some(n =>
          n.toLocaleLowerCase("en-US").startsWith(pfx)
        ))
    );
  }

  public findOne639_3CodeFromName(
    name: string,
    codeIfNoMatches: string = "und"
  ): string {
    // gives us hits on name & codes that start with the prefix
    const matches = this.index.get(name).map(m => new Language(m));
    const x = matches.filter((l: Language) => {
      return l.someNameMatches(name);
    }); // tolerant of case and diacritics
    return x.length === 0 ? codeIfNoMatches : x[0].iso639_3;
  }
  public makeMatchesAndLabelsForSelect(
    prefix: string
  ): Array<{ languageInfo: Language; nameMatchingWhatTheyTyped: string }> {
    const pfx = prefix.toLocaleLowerCase();
    const sortedListOfMatches = this.findMatchesForSelect(prefix);
    // see https://tools.ietf.org/html/bcp47 note these are language tags, not subtags, so are qaa-qtz, not qaaa-qabx, which are script subtags
    if (pfx >= "qaa" && pfx <= "qtz") {
      const l = new Language({
        iso639_3: prefix,
        englishName:
          // if they have given us the name for this custom language in the Project settings, use it
          this.defaultContentLanguage.iso639_3 === prefix
            ? this.defaultContentLanguage.englishName
            : `${prefix} [Unlisted]`
      });
      sortedListOfMatches.push(l);
    }
    return sortedListOfMatches.map(l => ({
      languageInfo: l,
      nameMatchingWhatTheyTyped: l.englishName
    }));
  }

  public findMatchesForSelect(prefix: string): Language[] {
    // gives us hits on name & codes that start with the prefix
    // Enhance: in order to do search without stripDiacritics,
    // we would probably have to strip them off before adding to TrieSearch.
    const matches = this.index.get(prefix);
    const pfx = prefix.toLocaleLowerCase();

    const langs: Language[] = matches.map(m => new Language(m));
    const kMaxMatchesToSpendTimeOne = 100;
    const spendTimeThinking = langs.length <= kMaxMatchesToSpendTimeOne;
    // For languages that will be typed in often, it is awkward to see, for example
    // "en of Vietnam" suggested ahead of "English" when the user types in "en".
    const commonLanguages = [
      { match: "en", code3: "eng" },
      { match: "eng", code3: "eng" },
      { match: "es", code3: "spa" },
      { match: "ind", code3: "ind" },
      { match: "fre", code3: "fra" },
      { match: "deu", code3: "de" }
    ];
    const sorted = langs.sort((a: Language, b: Language) => {
      // if the user types "en", we want to suggest "english" above "en" of vietnam
      if (
        commonLanguages.some(p => p.match === pfx && a.iso639_3 === p.code3)
      ) {
        return -1;
      }
      if (
        commonLanguages.some(p => p.match === pfx && b.iso639_3 === p.code3)
      ) {
        return 1;
      }
      if (commonLanguages.some(p => a.iso639_3 === p.code3)) {
        return -1;
      }
      if (commonLanguages.some(p => b.iso639_3 === p.code3)) {
        return 1;
      }
      // next, give priority to iso 639-3 codes
      if (pfx === a.iso639_3) {
        return -1;
      }
      if (pfx === b.iso639_3) {
        return 1;
      }

      // These sorts take a long time, and it makes it hard to type. So we only do it
      // when there are a small number of languages to order.
      if (spendTimeThinking) {
        //we want exact matches to sort before just prefix matches
        if (a.someNameMatches(pfx)) {
          return -1;
        }
        if (b.someNameMatches(pfx)) {
          return 1;
        }
      }

      if (this.matchesPrefix(a, pfx, false)) {
        return -1;
      }
      if (this.matchesPrefix(b, pfx, false)) {
        return 1;
      }
      // nothing matches exactly, so just sort
      return a.englishName.localeCompare(b.englishName);
    });

    return sorted;
  }

  public findOneLanguageNameFromCode_Or_ReturnCode(code: string): string {
    const trimmedCode = code.trim();
    // this would also match on full names, which we don't like (e.g., "en" is a language of Vietnam)
    const matches = this.index.get(trimmedCode);
    const x = matches.filter(m => {
      return m.iso639_3 === trimmedCode;
    });
    // TODO unfortunately lang tags gives multiple hits for a given code if (x.length === 1) {
    if (x.length >= 1) {
      return x[0].englishName;
    }
    return trimmedCode;
  }
}
