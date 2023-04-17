import fs from "fs";
import { ILangIndexEntry } from "./LanguageFinder";
import { vi } from "vitest";

// langindex.json is created by `yarn make-langindex`. We will need to run that whenever we take in an updated langtags.json from
describe("Check langindex.json", () => {
  let index: ILangIndexEntry[] = [];
  beforeAll(() => {
    const json = fs.readFileSync("./src/languageFinder/langindex.json", "utf8");
    index = JSON.parse(json);
  });
  it("has expected stuff", () => {
    expect(index.find((i) => i.iso639_3 === "qaa")?.englishName).toBe(
      "Unlisted Language"
    );

    expect(
      index.find(
        (i) =>
          i.iso639_3 === "mza-Latn-MX" &&
          i.englishName === "Mixtec, Santa María Zacatepec"
      )
    );
    // langtags has 2 tags for "zza"
    expect(
      index.find(
        (i) => i.iso639_3 === "zza" && i.englishName === "Zazaki, Southern"
      )
    ).toBeTruthy();
    // should collect up names from the different variations
  });

  it("converts the first tag correctly", () => {
    expect(
      index.find(
        (i) =>
          i.iso639_3 === "abt" &&
          i.englishName === "Ambulas" &&
          i.altNames.includes("Abelam")
      )
    ).toBeTruthy();
  });

  it("adds together the names of various tags of this language, abt", () => {
    expect(
      index.find(
        (i) =>
          i.iso639_3 === "abt" &&
          // should gather names from two following different tags: "abt-Latn-PG-x-maprik" and  "abt-Latn-PG-x-woserak"
          i.altNames.includes("Ambulas - Maprik") &&
          i.altNames.includes("Ambulas - Wosera Kamu")
      )
    ).toBeTruthy();
  });

  it("adds together the names of various tags of this language, spa", () => {
    const l = index.find((i) => i.iso639_3 === "spa");
    expect(l.altNames).toContain("Español");
    expect(l.altNames).toContain("Espagnol");
  });
  it("chooses the right english name for Spanish", () => {
    const l = index.find((i) => i.iso639_3 === "spa");
    expect(l.englishName).toBe("Spanish");
  });

  it("chooses the right english name for French", () => {
    const l = index.find((i) => i.iso639_3 === "fra");
    expect(l.englishName).toBe("French");
  });
  it("removes duplicate names", () => {
    expect(
      index
        .find((i) => i.iso639_3 === "abt")
        .altNames.filter((n) => n === "Abulas").length
    ).toBe(1);
  });
});
