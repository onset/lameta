import TrieSearch from "trie-search";
const langtags = require("./langtags.json");
const ethnologue = require("./ethnologueDerived.json");
import * as fs from "fs";

// this makes the index, then tests it.
describe("LanguageIndex maker", () => {
  beforeAll(() => {
    const codeToEnglishName = new TrieSearch(["iso639_3"]);
    codeToEnglishName.addAll(langtags);
    let c = 0;
    const newIndex = ethnologue.map(l => {
      const match = codeToEnglishName.get(l.code.three);
      let extra: string;
      if (match && match[0]) {
        // in almost 2k languages this prevents us loosing a way of naming
        if (l.name !== match[0].name && l.name !== match[0].localName) {
          if (l.altNames && !l.altNames.includes(l.name)) {
            c++;
            extra = l.name;
          }
        }

        //langtags currently has just "Indonesian"; Ethnologue & wikipedia disagree.
        const localName =
          l.code.three === "ind" ? "Bahasa Indonesia" : match[0].localname;

        return {
          iso639_1: l.code.two, // major languages will also have a two letter code
          iso639_3: l.code.three,
          englishName: match[0].name,
          localName,
          altNames: extra ? [...l.altNames, extra] : l.altNames
        };
      } else {
        return {
          note: "no langtags.json match, so englishName is a guess",
          iso639_1: l.code.two, // major languages will also have a two letter code
          iso639_3: l.code.three,
          englishName: l.name, // might not be english, but it's the best we can do
          altNames: l.altNames
        };
      }
    });
    fs.writeFileSync(
      "./app/languageFinder/langindex.json",
      JSON.stringify(newIndex, null, 4),
      {}
    );
    console.log("there were " + c + " extras.");
  });

  // uncomment and rn this in order to regenerate langindex.json:

  it("Create our production index", () => {});
});
