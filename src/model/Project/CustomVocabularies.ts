import { t } from "@lingui/macro";
import { Dictionary } from "typescript-collections";

// a class that has a list of custom vocabularies. Each has a name, and a list of terms. For each vocab, it keeps a function that is used
// when the terms are retrieved, to give them a common case (e.g. lowercase, captial case, etc).
// It has a method setup(vocab, casefn) that takes a function that normalizes
// the casing of terms in that vocab. It has a method named "encountered(vocab, term)" which adds
// a term if it is not already in the list. It has a method named "getTerms" which returns the list of terms, after applying the casefn.

export class CustomVocabularies {
  private vocabularies: Dictionary<string, string[]>;
  private caseFunctions: Dictionary<string, (s: string) => string>;

  public constructor() {
    this.vocabularies = new Dictionary<string, string[]>();
    this.caseFunctions = new Dictionary<string, (s: string) => string>();
  }

  public setup(vocab: string, casefn: (s: string) => string) {
    this.caseFunctions.setValue(vocab, casefn);
    this.vocabularies.setValue(vocab, []);
  }

  public encountered(vocab: string, term: string) {
    let terms = this.vocabularies.getValue(vocab);
    if (!terms) {
      this.vocabularies.setValue(vocab, []);
      terms = this.vocabularies.getValue(vocab)!;
    }
    if (terms.indexOf(term) === -1) {
      terms.push(term);
    }
  }

  public getTerms(vocab: string): string[] {
    const terms = this.vocabularies.getValue(vocab);
    if (!terms) {
      throw new Error(`No vocabulary named ${vocab}`);
    }
    const casefn = this.caseFunctions.getValue(vocab);
    if (!casefn) {
      return terms;
    }
    return terms.map(casefn);
  }
}
