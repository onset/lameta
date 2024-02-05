import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { TextHolder } from "./TextHolder";

describe("TextHolder multilingual", () => {
  it("should set and get text", () => {
    const t = new TextHolder();
    t.setTextAxis("en", "house");
    expect(t.getSerialized()).toBe("house");
    expect(t.getTextAxis("en")).toBe("house");
    expect(t.getSerialized()).toBe("house");
    t.setTextAxis("es", "casa");
    expect(t.getSerialized()).toBe("[[en]]house[[es]]casa");
    expect(t.getTextAxis("es")).toBe("casa");
    expect(t.getTextAxis("en")).toBe("house");
    t.setTextAxis("es", " ");
    expect(t.getTextAxis("es")).toBe("");
    expect(t.getSerialized()).toBe("house");
  });

  it("throws if language is empty", () => {
    const textHolder = new TextHolder();
    expect(() => textHolder.setTextAxis("", "house")).toThrowError();
  });
});

describe("TextHolder.getFirstNonEmptyText", () => {
  it("should return empty string if no text is set for any language", () => {
    const t = new TextHolder();
    expect(t.getFirstNonEmptyText(["en"])).toBe("");
  });
  // note, the behavior we would want for this is not 100% clear. Maybe 90% clear.
  // we could say well show them something even if it isn't in the list
  it("should return empty if no text is set for the requested languages", () => {
    const t = new TextHolder();
    t.setTextAxis("es", "casa");
    expect(t.getFirstNonEmptyText(["en", "fr"])).toBe("");
  });
  it("should return the first match", () => {
    const t = new TextHolder();
    t.setTextAxis("es", "casa");
    t.setTextAxis("en", "house");
    expect(t.getFirstNonEmptyText(["en", "es"])).toBe("house");
    expect(t.getFirstNonEmptyText(["es", "en"])).toBe("casa");
  });
});

// describe("TextHolder.parseSerialized", () => {
//   it("should parse a serialized string", () => {
//     const t = TextHolder.parseSerialized("[[en]]house[[es]]casa");
//     expect(t.getTextAxis("en")).toBe("house");
//     expect(t.getTextAxis("es")).toBe("casa");
//   });
//   it("should parse a serialized string with no language tags", () => {
//     const t = TextHolder.parseSerialized("house");
//     expect(t.getTextAxis("en")).toBe("house");
//     expect(t.getTextAxis("es")).toBe("");
//     expect(t.monoLingualText).toBe("house");
//   });
// });

describe("TextHolder.monoLingualText", () => {
  it("returns empty string when no value is set", () => {
    const textHolder = new TextHolder();
    expect(textHolder.monoLingualText).toBe("");
  });
  it("returns the value that was set", () => {
    const textHolder = new TextHolder();
    textHolder.monoLingualText = "foo";
    expect(textHolder.monoLingualText).toBe("foo");
  });
  it("can be changed", () => {
    const textHolder = new TextHolder();
    textHolder.monoLingualText = "foo";
    expect(textHolder.monoLingualText).toBe("foo");
    textHolder.monoLingualText = "bar";
    expect(textHolder.monoLingualText).toBe("bar");
  });
  it("can be changed back to empty string", () => {
    const textHolder = new TextHolder();
    textHolder.monoLingualText = "foo";
    expect(textHolder.monoLingualText).toBe("foo");
    textHolder.monoLingualText = "";
    expect(textHolder.monoLingualText).toBe("");
  });
});
