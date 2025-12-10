import { describe, expect, it } from "vitest";
import { Project } from "./Project";

describe("parseWorkingLanguagesToSlots", () => {
  it("should return English fallback when empty string", () => {
    const slots = Project.parseWorkingLanguagesToSlots("");
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("eng");
    expect(slots[0].name).toBe("English");
    expect(slots[0].color).toBe(Project.SLOT_COLORS[0]);
  });

  it("should return English fallback when whitespace only", () => {
    const slots = Project.parseWorkingLanguagesToSlots("   ");
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("eng");
  });

  it("should parse single language with code:name format", () => {
    const slots = Project.parseWorkingLanguagesToSlots("spa:Spanish");
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("spa");
    expect(slots[0].name).toBe("Spanish");
    expect(slots[0].label).toBe("sp");
    expect(slots[0].color).toBe(Project.SLOT_COLORS[0]);
  });

  it("should parse multiple languages", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "eng:English;spa:Spanish;fra:French"
    );
    expect(slots).toHaveLength(3);
    expect(slots[0].tag).toBe("eng");
    expect(slots[0].name).toBe("English");
    expect(slots[0].color).toBe(Project.SLOT_COLORS[0]);
    expect(slots[1].tag).toBe("spa");
    expect(slots[1].name).toBe("Spanish");
    expect(slots[1].color).toBe(Project.SLOT_COLORS[1]);
    expect(slots[2].tag).toBe("fra");
    expect(slots[2].name).toBe("French");
    expect(slots[2].color).toBe(Project.SLOT_COLORS[2]);
  });

  it("should cycle colors when more languages than palette size", () => {
    // Create a string with more languages than SLOT_COLORS (8 colors)
    const languages = [
      "eng:English",
      "spa:Spanish",
      "fra:French",
      "deu:German",
      "ita:Italian",
      "por:Portuguese",
      "rus:Russian",
      "zho:Chinese",
      "jpn:Japanese", // 9th - should cycle to first color
      "kor:Korean" // 10th - should cycle to second color
    ].join(";");

    const slots = Project.parseWorkingLanguagesToSlots(languages);
    expect(slots).toHaveLength(10);
    // 9th language should have first color
    expect(slots[8].color).toBe(Project.SLOT_COLORS[0]);
    // 10th language should have second color
    expect(slots[9].color).toBe(Project.SLOT_COLORS[1]);
  });

  it("should handle language code without name (fallback to uppercase code)", () => {
    const slots = Project.parseWorkingLanguagesToSlots("abc");
    expect(slots).toHaveLength(1);
    expect(slots[0].tag).toBe("abc");
    expect(slots[0].name).toBe("ABC");
    expect(slots[0].label).toBe("ab");
  });

  it("should normalize language codes to lowercase", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "ENG:English;SPA:Spanish"
    );
    expect(slots[0].tag).toBe("eng");
    expect(slots[1].tag).toBe("spa");
  });

  it("should trim whitespace from codes and names", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "  eng : English  ;  spa : Spanish  "
    );
    expect(slots[0].tag).toBe("eng");
    expect(slots[0].name).toBe("English");
    expect(slots[1].tag).toBe("spa");
    expect(slots[1].name).toBe("Spanish");
  });

  it("should skip empty entries", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "eng:English;;spa:Spanish;"
    );
    expect(slots).toHaveLength(2);
    expect(slots[0].tag).toBe("eng");
    expect(slots[1].tag).toBe("spa");
  });

  it("should handle codes shorter than 3 characters", () => {
    // Some legacy codes might be 2 characters
    const slots = Project.parseWorkingLanguagesToSlots("en:English");
    expect(slots[0].tag).toBe("en");
    expect(slots[0].label).toBe("en"); // shorter than 3, use as-is
  });

  it("should handle special characters in language names", () => {
    const slots = Project.parseWorkingLanguagesToSlots(
      "deu:Deutsch (German);zho:中文"
    );
    expect(slots[0].name).toBe("Deutsch (German)");
    expect(slots[1].name).toBe("中文");
  });
});
