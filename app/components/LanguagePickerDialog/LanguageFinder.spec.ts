import LanguageFinder from "./LanguageFinder";
var languageFinder: LanguageFinder;

describe("Session Write", () => {
  languageFinder = new LanguageFinder([
    {
      name: "Language Not Listed",
      code: { three: "qaa" },
      macro: false,
      countries: [],
      altNames: ["Unlisted Language"],
      country: null
    },
    {
      name: "Ankpretend",
      code: { three: "aae", two: "ax" }, //doesn't actually have a 639-2 code
      altNames: ["Albanian, Arbëreshë", "Calabrian Albanian"],
      country: "Italy"
    },
    {
      name: "Ankave",
      code: { three: "aak", two: "ak" }, //doesn't actually have a 639-2 code
      macro: false,
      countries: ["Papua New Guinea"],
      altNames: ["Ankai", "Bu’u"],
      country: "Papua New Guinea"
    }
  ]);
  beforeAll(async () => {});

  it("should list exact match first", () => {
    expect(languageFinder.find("Ankave")[0].iso639_3).toBe("aak");
    expect(languageFinder.find("ankave")[0].iso639_2).toBe("ak");
    expect(languageFinder.find("ax")[0].iso639_2).toBe("ax");
    expect(languageFinder.find("aae")[0].iso639_3).toBe("aae");
  });
  it("should find prefix match", () => {
    expect(languageFinder.find("an")[0].iso639_3).toBe("aae");
    expect(languageFinder.find("an")[1].iso639_3).toBe("aak");
  });
  it("should handle no match", () => {
    expect(languageFinder.find("").length).toBe(0);
    expect(languageFinder.find("blah").length).toBe(0);
  });
});
