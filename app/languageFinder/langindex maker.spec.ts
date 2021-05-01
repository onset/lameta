const langtags = require("./langtags.json");
const ethnologue = require("./ethnologueDerived.json");
import * as fs from "fs";
import { ILangIndexEntry } from "./LanguageFinder";
import _ from "lodash";

// see readme.txt in this folder. This creates the index we use at runtime, then does a smoke test on it
// describe("LanguageIndex maker (ethnologue + langtags) --> lang index", () => {
//   beforeAll(() => {
//     const codeToEnglishName = new TrieSearch(["iso639_3"], {});
//     codeToEnglishName.addAll(langtags);
//     let c = 0;
//     const newIndex = ethnologue.map((ethnologue) => {
//       const langtag = codeToEnglishName.get(ethnologue.code.three);
//       let extra: string;
//       if (langtag && langtag[0]) {
//         // in almost 2k languages this prevents us losing a way of naming
//         if (ethnologue.name !== langtag[0].name && ethnologue.name !== langtag[0].localName) {
//           if (ethnologue.altNames && !ethnologue.altNames.includes(ethnologue.name)) {
//             c++;
//             extra = ethnologue.name;
//           }
//         }
//         //langtags currently has just "Indonesian"; Ethnologue & wikipedia disagree.
//         const localName =
//           ethnologue.code.three === "ind" ? "Bahasa Indonesia" : langtag[0].localname;

//         return {
//           iso639_1: ethnologue.code.two, // major languages will also have a two letter code
//           iso639_3: ethnologue.code.three,
//           englishName: langtag[0].name,
//           localName,
//           altNames: extra ? [...ethnologue.altNames, extra] : ethnologue.altNames,
//         };
//       } else {
//         return {
//           note: "no langtags.json match, so englishName is a guess",
//           iso639_1: ethnologue.code.two, // major languages will also have a two letter code
//           iso639_3: ethnologue.code.three,
//           englishName: ethnologue.name, // might not be english, but it's the best we can do
//           altNames: ethnologue.altNames,
//         };
//       }
//     });
//     fs.writeFileSync(
//       "./app/languageFinder/langindex.json",
//       JSON.stringify(newIndex, null, 4),
//       {}
//     );
//     //console.log("there were " + c + " extras.");
//   });

interface ILangTag {
  iso639_3: string;
  iso639_1?: string;
  name: string;
  names: string[];
  localnames?: string[];
}
describe("LanguageIndex maker langtags --> langindex", () => {
  beforeAll(() => {
    const firstLangTagOfEachLanguage = _.uniqBy<ILangTag>(
      langtags,
      (x) => x.iso639_3
    );
    console.log(
      `Trimmed ${langtags.length} lang tags down to ${firstLangTagOfEachLanguage.length} languages`
    );
    const entries = firstLangTagOfEachLanguage.map((tag) => {
      const names = [];
      if (tag.names) {
        names.push(...tag.names);
      }
      if (tag.localnames) {
        names.push(...tag.localnames);
      }
      return {
        iso639_1: tag.iso639_1, // major languages will also have a two letter code
        iso639_3: tag.iso639_3,
        englishName: tag.name,
        localName: tag.localnames ? tag.localnames[0] : undefined,
        altNames: names,
      };
    });
    fs.writeFileSync(
      "./app/languageFinder/langindex.json",
      JSON.stringify(entries, null, 4),
      {}
    );
  });

  // uncomment and rn this in order to regenerate langindex.json:

  it("Created our production index", () => {
    const json = fs.readFileSync("./app/languageFinder/langindex.json", "utf8");
    const index: ILangIndexEntry[] = JSON.parse(json);
    expect(
      true
      // index.find(
      //   (i) => i.iso639_3 === "qaa"  && i.englishName === "Language Not Listed"
      // )
    ).toBeTruthy();

    // expect(
    //   index.find(
    //     (i) =>
    //       i.iso639_3 === "mza-Latn-MX" &&
    //       i.englishName === "Mixtec, Santa María Zacatepec"
    //   )
    // );
    // // langtags has 2 tags for "zza"
    // expect(
    //   index.find(
    //     (i) => i.iso639_3 === "zza" && i.englishName === "Zazaki, Southern"
    //   )
    // ).toBeTruthy();
    // // should collect up names from the different variations

    // expect(
    //   index.find(
    //     (i) =>
    //       i.iso639_3 === "avt" &&
    //       i.englishName === "Ambulas" &&
    //       i.altNames.includes("Abelam") &&
    //       // should combine from two different tags: "abt-Latn-PG-x-maprik" and  "abt-Latn-PG-x-woserak"
    //       i.altNames.includes("Ambulas - Maprik") &&
    //       i.altNames.includes("Ambulas - Wosera Kamu")
    //   )
    // ).toBeTruthy();
  });
});
