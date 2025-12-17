import { LanguageFinder } from "./LanguageFinder";
let languageFinder: LanguageFinder;

const kUnlistedCode = "qaa";
function getDefaultLanguageOfTests() {
  return { englishName: "Foobar", iso639_3: kUnlistedCode };
}
describe("LanguageFinder", () => {
  languageFinder = new LanguageFinder(() => getDefaultLanguageOfTests());

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

  it("findOneLanguageNameFromCode_Or_ReturnCode should return Portuguese for 'por'", () => {
    expect(languageFinder.findOneLanguageNameFromCode_Or_ReturnCode("por")).toBe(
      "Portuguese"
    );
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

  it("findCodeFromCodeOrLanguageName('es') should give 'spa'", () => {
    expect(languageFinder.findOneLanguageNameFromCode_Or_ReturnCode("es")).toBe(
      "Spanish"
    );
    expect(languageFinder.findCodeFromCodeOrLanguageName("es")).toBe("spa");
  });

  it("findNameOfQaa", () => {
    const lf_qoo = new LanguageFinder(() => ({
      englishName: "Foo Bar",
      iso639_3: "qoo"
    }));
    expect(lf_qoo.findOneLanguageNameFromCode_Or_ReturnCode("qoo")).toBe(
      "Foo Bar"
    );

    const lf_qaa = new LanguageFinder(() => ({
      englishName: "Foo Bar",
      iso639_3: "qaa"
    }));
    expect(lf_qaa.findMatchesForSelect("qaa")[0].englishName).toBe("Foo Bar");
    expect(lf_qaa.findOne639_3CodeFromName("fOo Bar", "not this")).toBe("qaa");
    expect(lf_qaa.findOneLanguageNameFromCode_Or_ReturnCode("qaa")).toBe(
      "Foo Bar"
    );
  });
  5;

  it("makeMatchesAndLabelsForSelect should handle English well", () => {
    expect(
      languageFinder.makeMatchesAndLabelsForSelect("en")[0].languageInfo
        .iso639_3
    ).toBe("eng");
  });

  describe("normalizeToBcp47", () => {
    it("should convert 3-letter language codes to 2-letter", () => {
      expect(languageFinder.normalizeToBcp47("eng")).toBe("en");
      expect(languageFinder.normalizeToBcp47("spa")).toBe("es");
      expect(languageFinder.normalizeToBcp47("fra")).toBe("fr");
      expect(languageFinder.normalizeToBcp47("srp")).toBe("sr");
    });

    it("should preserve 2-letter codes", () => {
      expect(languageFinder.normalizeToBcp47("en")).toBe("en");
      expect(languageFinder.normalizeToBcp47("es")).toBe("es");
    });

    it("should handle full BCP47 tags with 3-letter language and region", () => {
      expect(languageFinder.normalizeToBcp47("eng-US")).toBe("en-US");
      expect(languageFinder.normalizeToBcp47("eng-us")).toBe("en-US");
      expect(languageFinder.normalizeToBcp47("spa-MX")).toBe("es-MX");
    });

    it("should normalize region subtags to UPPERCASE", () => {
      expect(languageFinder.normalizeToBcp47("en-us")).toBe("en-US");
      expect(languageFinder.normalizeToBcp47("en-gb")).toBe("en-GB");
      expect(languageFinder.normalizeToBcp47("pt-br")).toBe("pt-BR");
    });

    it("should normalize script subtags to TitleCase", () => {
      expect(languageFinder.normalizeToBcp47("zh-hans")).toBe("zh-Hans");
      expect(languageFinder.normalizeToBcp47("zh-HANT")).toBe("zh-Hant");
      expect(languageFinder.normalizeToBcp47("sr-latn")).toBe("sr-Latn");
      expect(languageFinder.normalizeToBcp47("sr-CYRL")).toBe("sr-Cyrl");
    });

    it("should handle script + region combinations", () => {
      expect(languageFinder.normalizeToBcp47("zh-hans-cn")).toBe("zh-Hans-CN");
      expect(languageFinder.normalizeToBcp47("zh-HANS-CN")).toBe("zh-Hans-CN");
      expect(languageFinder.normalizeToBcp47("zh-hant-tw")).toBe("zh-Hant-TW");
      expect(languageFinder.normalizeToBcp47("sr-latn-rs")).toBe("sr-Latn-RS");
    });

    it("should handle 3-letter language + script + region", () => {
      // srp -> sr (Serbian has a 2-letter equivalent)
      expect(languageFinder.normalizeToBcp47("srp-latn-rs")).toBe("sr-Latn-RS");
      expect(languageFinder.normalizeToBcp47("srp-cyrl-rs")).toBe("sr-Cyrl-RS");
    });

    it("should preserve 3-letter codes without 2-letter equivalents in full tags", () => {
      // tpi (Tok Pisin) has no 2-letter code
      expect(languageFinder.normalizeToBcp47("tpi-latn-pg")).toBe(
        "tpi-Latn-PG"
      );
    });

    it("should preserve UN M.49 numeric region codes", () => {
      expect(languageFinder.normalizeToBcp47("es-419")).toBe("es-419");
      expect(languageFinder.normalizeToBcp47("spa-419")).toBe("es-419");
    });

    it("should preserve variants and extensions in lowercase", () => {
      expect(languageFinder.normalizeToBcp47("en-US-valencia")).toBe(
        "en-US-valencia"
      );
      expect(languageFinder.normalizeToBcp47("ca-ES-valencia")).toBe(
        "ca-ES-valencia"
      );
    });

    it("should handle empty and whitespace-only input", () => {
      expect(languageFinder.normalizeToBcp47("")).toBe("");
      expect(languageFinder.normalizeToBcp47("  ")).toBe("");
    });

    it("should trim whitespace", () => {
      expect(languageFinder.normalizeToBcp47(" eng ")).toBe("en");
      expect(languageFinder.normalizeToBcp47(" en-US ")).toBe("en-US");
    });

    it("should handle codes without 2-letter equivalents", () => {
      // Tok Pisin (tpi) has no 2-letter code
      expect(languageFinder.normalizeToBcp47("tpi")).toBe("tpi");
      expect(languageFinder.normalizeToBcp47("tpi-PG")).toBe("tpi-PG");
    });
  });

  describe("getIso639_3Code", () => {
    it("should preserve 3-letter codes", () => {
      expect(languageFinder.getIso639_3Code("eng")).toBe("eng");
      expect(languageFinder.getIso639_3Code("spa")).toBe("spa");
      expect(languageFinder.getIso639_3Code("fra")).toBe("fra");
      expect(languageFinder.getIso639_3Code("etr")).toBe("etr");
      expect(languageFinder.getIso639_3Code("tpi")).toBe("tpi");
    });

    it("should convert 2-letter codes to 3-letter", () => {
      expect(languageFinder.getIso639_3Code("en")).toBe("eng");
      expect(languageFinder.getIso639_3Code("es")).toBe("spa");
      expect(languageFinder.getIso639_3Code("fr")).toBe("fra");
      expect(languageFinder.getIso639_3Code("pt")).toBe("por");
      expect(languageFinder.getIso639_3Code("de")).toBe("deu");
      expect(languageFinder.getIso639_3Code("id")).toBe("ind");
    });

    it("should handle case-insensitively", () => {
      expect(languageFinder.getIso639_3Code("EN")).toBe("eng");
      expect(languageFinder.getIso639_3Code("En")).toBe("eng");
      expect(languageFinder.getIso639_3Code("ENG")).toBe("eng");
    });

    it("should trim whitespace", () => {
      expect(languageFinder.getIso639_3Code(" en ")).toBe("eng");
      expect(languageFinder.getIso639_3Code(" eng ")).toBe("eng");
    });

    it("should handle empty input", () => {
      expect(languageFinder.getIso639_3Code("")).toBe("");
      expect(languageFinder.getIso639_3Code("  ")).toBe("");
    });
  });
});
