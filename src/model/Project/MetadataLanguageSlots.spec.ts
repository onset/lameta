import { beforeAll, describe, expect, it } from "vitest";
import { Project } from "./Project";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

// Set up language finder so BCP47 normalization works
beforeAll(() => {
  setupLanguageFinderForTests();
});

describe("parseWorkingLanguagesToSlots", () => {
  it("should return English fallback when empty string", () => {
    const slots = Project.parseWorkingLanguagesToSlots("");
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("en"); // BCP47 prefers 2-letter codes
    expect(slots[0].name).toBe("English");
    expect(slots[0].color).toBe(Project.SLOT_COLORS[0]);
  });

  it("should return English fallback when whitespace only", () => {
    const slots = Project.parseWorkingLanguagesToSlots("   ");
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("en"); // BCP47 prefers 2-letter codes
  });

  it("should parse single language and normalize to BCP47 format", () => {
    const slots = Project.parseWorkingLanguagesToSlots("spa:Spanish");
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("es"); // BCP47 normalizes spa -> es
    expect(slots[0].name).toBe("Spanish");
    expect(slots[0].label).toBe("es");
    expect(slots[0].color).toBe(Project.SLOT_COLORS[0]);
  });

  it("should parse multiple languages and normalize to BCP47 format", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "eng:English;spa:Spanish;fra:French"
    );
    expect(slots).toHaveLength(3);
    expect(slots[0].tag).toBe("en"); // eng -> en
    expect(slots[0].name).toBe("English");
    expect(slots[0].color).toBe(Project.SLOT_COLORS[0]);
    expect(slots[1].tag).toBe("es"); // spa -> es
    expect(slots[1].name).toBe("Spanish");
    expect(slots[1].color).toBe(Project.SLOT_COLORS[1]);
    expect(slots[2].tag).toBe("fr"); // fra -> fr
    expect(slots[2].name).toBe("French");
    expect(slots[2].color).toBe(Project.SLOT_COLORS[2]);
  });

  it("should cycle colors when more languages than palette size", () => {
    // Create a string with more languages than SLOT_COLORS (5 colors)
    // Using codes that may or may not have 2-letter equivalents
    const languages = [
      "eng:English", // 1st - color[0]
      "spa:Spanish", // 2nd - color[1]
      "fra:French", // 3rd - color[2]
      "deu:German", // 4th - color[3]
      "ita:Italian", // 5th - color[4]
      "por:Portuguese", // 6th - should cycle to color[0]
      "rus:Russian" // 7th - should cycle to color[1]
    ].join(";");

    const slots = Project.parseWorkingLanguagesToSlots(languages);
    expect(slots).toHaveLength(7);
    // 6th language should have first color (cycling)
    expect(slots[5].color).toBe(Project.SLOT_COLORS[0]);
    // 7th language should have second color
    expect(slots[6].color).toBe(Project.SLOT_COLORS[1]);
  });

  it("should use language finder to get proper name for known codes", () => {
    // "abc" is a known ISO 639-3 code for "Ayta, Ambala"
    const slots = Project.parseWorkingLanguagesToSlots("abc");
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("abc"); // no 2-letter equivalent, stays as-is
    expect(slots[0].name).toBe("Ayta, Ambala"); // looked up from language finder
    expect(slots[0].label).toBe("ab");
  });

  it("should fallback to uppercase code for unknown codes", () => {
    // "xyz" is not a known ISO 639-3 code
    const slots = Project.parseWorkingLanguagesToSlots("xyz");
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("xyz");
    expect(slots[0].name).toBe("xyz"); // returned as-is since not found
    expect(slots[0].label).toBe("xy");
  });

  it("should normalize language codes to lowercase", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "ENG:English;SPA:Spanish"
    );
    expect(slots[0].tag).toBe("en"); // normalized to BCP47
    expect(slots[1].tag).toBe("es"); // normalized to BCP47
  });

  it("should trim whitespace from codes and names", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "  eng : English  ;  spa : Spanish  "
    );
    expect(slots[0].tag).toBe("en"); // normalized to BCP47
    expect(slots[0].name).toBe("English");
    expect(slots[1].tag).toBe("es"); // normalized to BCP47
    expect(slots[1].name).toBe("Spanish");
  });

  it("should skip empty entries", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "eng:English;;spa:Spanish;"
    );
    expect(slots).toHaveLength(2);
    expect(slots[0].tag).toBe("en");
    expect(slots[1].tag).toBe("es");
  });

  it("should handle codes that are already 2 characters", () => {
    // Already 2-letter codes should stay as-is
    const slots = Project.parseWorkingLanguagesToSlots("en:English");
    expect(slots[0].tag).toBe("en");
    expect(slots[0].label).toBe("en");
  });

  it("should deduplicate when both 2-letter and 3-letter codes are provided", () => {
    // If someone provides both en and eng, should only get one slot
    const slots = Project.parseWorkingLanguagesToSlots(
      "en:English;eng:English Again"
    );
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("en");
    expect(slots[0].name).toBe("English"); // first one wins
  });

  it("should handle special characters in language names", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "deu:Deutsch (German);zho:中文"
    );
    expect(slots[0].name).toBe("Deutsch (German)");
    expect(slots[1].name).toBe("中文");
  });
});
