import LanguageFinder from "./LanguageFinder";
const languageFinder = new LanguageFinder();

describe("Session Write", () => {
  beforeAll(async () => {});

  it("should list exact match first", () => {
    expect(languageFinder.find("English")[0].iso639_3).toBe("eng");
    expect(languageFinder.find("english")[0].iso639_2).toBe("en");
    //   expect(languageFinder.find("Eng")[0].iso639_2).toBe("en");
  });
  it("should find prefix match", () => {
    expect(languageFinder.find("Engl")[0].iso639_3).toBe("eng");
  });
});
