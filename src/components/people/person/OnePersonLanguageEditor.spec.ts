import { describe, it, expect } from "vite-plus/test";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { getUnrecognizedLanguageTooltip } from "./OnePersonLanguageEditor";

const languageFinder = new LanguageFinder(() => undefined);

describe("getUnrecognizedLanguageTooltip", () => {
  it("is empty for codes that lameta knows", () => {
    expect(getUnrecognizedLanguageTooltip("etr", languageFinder)).toBe("");
    expect(getUnrecognizedLanguageTooltip("fra", languageFinder)).toBe("");
    expect(getUnrecognizedLanguageTooltip("tpi", languageFinder)).toBe("");
  });

  it("is empty for an empty slot and for private-use codes", () => {
    expect(getUnrecognizedLanguageTooltip(undefined, languageFinder)).toBe("");
    expect(getUnrecognizedLanguageTooltip("  ", languageFinder)).toBe("");
    expect(getUnrecognizedLanguageTooltip("qaa", languageFinder)).toBe("");
  });

  it("names a value that is not a known language code", () => {
    expect(getUnrecognizedLanguageTooltip("Ancient Elvish", languageFinder)).toContain(
      "Ancient Elvish",
    );
  });
});
