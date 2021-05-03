const ethnologue = require("./ethnologueDerived.json");
import _ from "lodash";
import * as fs from "fs-extra";
import { ILangIndexEntry } from "./LanguageFinder";

//--------------------------------------------------------------------------------------
// RUN THIS WITH
// yarn make-langindex
// whenever we take in a new langtags.json from https://github.com/silnrsi/langtags
// Then make sure that the langindex.spec.ts tests all pass
//--------------------------------------------------------------------------------------

// see readme.txt in this folder. This creates the index we use at runtime, then does a smoke test on it
// This interface should match the subset of the langtags.json that we are interested in.
interface ILangTag {
  tag: string;
  iso639_3: string;
  iso639_1?: string;
  name: string;
  names: string[];
  localnames?: string[];
}

const json: string = fs.readFileSync(
  "./app/languageFinder/langtags.json",
  "utf8"
);
const langtagsPlusMetaElements = JSON.parse(json);
console.log(
  `Starting with ${langtagsPlusMetaElements.length} elements from langtags.json`
);
// strip out the handful of bogus entries in there metadata for the file. These all have a `tag` that starts with `_`.
const langtags: ILangTag[] = langtagsPlusMetaElements.filter(
  (element) => element.tag.indexOf("_") < 0
);

console.log(
  `After stripping out metadata, have  ${langtags.length} elements from langtags.json`
);

const firstLangTagOfEachLanguage = _.uniqBy<ILangTag>(
  langtags,
  (x) => x.iso639_3
);
console.log(
  `Working with the first langtag for each language, which leaves us with ${firstLangTagOfEachLanguage.length} languages.`
);

let multipleTagsCount = 0;

const entries = firstLangTagOfEachLanguage.map((tag) => {
  const names: string[] = [];

  const allTagsWithThisIso3Code = langtags.filter(
    (t) => t.iso639_3 === tag.iso639_3
  );

  // We are consciously throwing away a lot of info here, e.g. that some names go with some variants, scripts, etc.
  // We're really just trying to get a lookup from name ---> {iso639 code, English Name}.
  allTagsWithThisIso3Code.forEach((t) => {
    if (t.names) {
      names.push(...t.names);
    }
    // notice, here we are losing the distinction between localnames and altnames. For lameta's purposes, which are limited to lookup, the distinction doesn't matter.
    if (t.localnames) {
      names.push(...t.localnames);
    }
  });
  if (allTagsWithThisIso3Code && allTagsWithThisIso3Code.length > 1) {
    multipleTagsCount++;
    //   console.log(`${tag.iso639_3} has ${allTagsWithThisIso3Code.length} tags`);
  }
  const item: ILangIndexEntry = {
    iso639_1: tag.iso639_1, // major languages will also have a two letter code
    iso639_3: tag.iso639_3,
    englishName: tag.name,
    altNames: _.uniq(names),
  };
  return item;
});

// Enhance:  since qaa-qtz are all "Unlisted Language", it would be better to not put them in the index, but have code just recognize them.
entries.push({ iso639_3: "qaa", englishName: "Unlisted Language" });

console.log(`${multipleTagsCount} languages had more than one tag.`);

fs.writeFileSync(
  "./app/languageFinder/langindex.json",
  JSON.stringify(entries, null, 4),
  {}
);
