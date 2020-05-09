import { LanguageFinder } from "./LanguageFinder";
let languageFinder: LanguageFinder;

describe("LanguageFinder", () => {
  languageFinder = new LanguageFinder({
    englishName: "Edolo",
    iso639_3: "etr",
  });

  beforeAll(async () => {});
  it(".findOne639_3CodeFromName should find common names of major languages first", () => {
    expect(languageFinder.findOne639_3CodeFromName("English")).toBe("eng");
    expect(languageFinder.findOne639_3CodeFromName("french")).toBe("fra");
    expect(languageFinder.findOne639_3CodeFromName("Spanish")).toBe("spa");
    //expect(languageFinder.findOne639_3CodeFromName("espanol")).toBe("spa");
    expect(languageFinder.findOne639_3CodeFromName("español")).toBe("spa");
    expect(languageFinder.findOne639_3CodeFromName("indonesian")).toBe("ind");
    expect(languageFinder.findOne639_3CodeFromName("russian")).toBe("rus");
    expect(languageFinder.findOne639_3CodeFromName("bahasa indonesia")).toBe(
      "ind"
    );
    expect(languageFinder.findOne639_3CodeFromName("tok pisin")).toBe("tpi");
  });

  it("should handle no match", () => {
    expect(languageFinder.findOne639_3CodeFromName("", "sorry")).toBe("sorry");
    expect(languageFinder.findOne639_3CodeFromName("")).toBe("und");
    expect(languageFinder.findOne639_3CodeFromName("blah")).toBe("und");
  });
  it("findMatchesForSelect should match on 3 letter code", () => {
    expect(languageFinder.findMatchesForSelect("etr")[0].iso639_3).toBe("etr");
  });
  it("findMatchesForSelect should handle Indonesian well", () => {
    expect(languageFinder.findMatchesForSelect("indonesian")[0].iso639_3).toBe(
      "ind"
    );
  });
  it("findMatchesForSelect should handle a non-roman language name well", () => {
    expect(languageFinder.findMatchesForSelect("thai")[0].iso639_3).toBe("tha");
  });
  it("findMatchesForSelect should handle French well", () => {
    expect(languageFinder.findMatchesForSelect("french")[0].iso639_3).toBe(
      "fra"
    );
  });
  it("findMatchesForSelect should handle English well", () => {
    expect(languageFinder.findMatchesForSelect("en")[0].iso639_3).toBe("eng");
    expect(languageFinder.findMatchesForSelect("eng")[0].iso639_3).toBe("eng");
    expect(languageFinder.findMatchesForSelect("english")[0].iso639_3).toBe(
      "eng"
    );
  });
  it("findMatchesForSelect should handle Spanish well", () => {
    expect(languageFinder.findMatchesForSelect("es")[0].iso639_3).toBe("spa");
    expect(languageFinder.findMatchesForSelect("espa")[0].iso639_3).toBe("spa");
    expect(languageFinder.findMatchesForSelect("español")[0].iso639_3).toBe(
      "spa"
    );
    // can't do this yet, would need drop accents from the index somehow
    // expect(languageFinder.findMatchesForSelect("espanol")[0].value).toBe("spa");
    expect(languageFinder.findMatchesForSelect("spanish")[0].iso639_3).toBe(
      "spa"
    );
  });

  it("makeMatchesAndLabelsForSelect should handle English well", () => {
    expect(
      languageFinder.makeMatchesAndLabelsForSelect("en")[0].languageInfo
        .iso639_3
    ).toBe("eng");
  });
});
