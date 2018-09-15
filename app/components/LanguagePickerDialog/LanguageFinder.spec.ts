import LanguageFinder from "./LanguageFinder";
const languageFinder = new LanguageFinder();

describe("Session Write", () => {
  beforeAll(async () => {});

  it("should find exact match", () => {
    expect(languageFinder.find("English")[0].iso639_3).toBe("eng");
    expect(languageFinder.find("English")[0].iso639_2).toBe("en");
  });
});
