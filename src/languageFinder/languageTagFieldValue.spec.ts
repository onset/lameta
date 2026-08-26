import { describe, it, expect } from "vitest";
import {
  parseLanguageCodeAndName,
  splitLanguageFieldValue,
  serializeLanguageFieldValue
} from "./languageTagFieldValue";

describe("parseLanguageCodeAndName", () => {
  it("reads the legacy 'code : Name' form", () => {
    expect(parseLanguageCodeAndName("pta : Guarani")).toEqual({
      code: "pta",
      name: "Guarani"
    });
  });

  it("splits on the first colon, so a name may contain one", () => {
    expect(parseLanguageCodeAndName("qab-x-tolo:Tolo: the north dialect")).toEqual(
      { code: "qab-x-tolo", name: "Tolo: the north dialect" }
    );
  });

  it("gives no name for a plain code", () => {
    expect(parseLanguageCodeAndName("fra")).toEqual({
      code: "fra",
      name: undefined
    });
  });
});

describe("splitLanguageFieldValue", () => {
  it("drops the empty entries of a field written by hand", () => {
    expect(splitLanguageFieldValue(";;eng;")).toEqual([
      { code: "eng", name: undefined }
    ]);
  });
});

describe("serializeLanguageFieldValue", () => {
  it("keeps the name of a language that ISO 639-3 does not list", () => {
    expect(
      serializeLanguageFieldValue([{ value: "qab-x-tolo", label: "Tolo" }])
    ).toBe("qab-x-tolo:Tolo");
  });

  it("keeps a name the file already carried, whatever the code", () => {
    // Dragging the pills into a new order used to turn "pta : Guarani" into "pta".
    expect(
      serializeLanguageFieldValue([
        { value: "pta", label: "Guarani", hadName: true }
      ])
    ).toBe("pta:Guarani");
  });

  it("writes no name for a language the index knows", () => {
    expect(
      serializeLanguageFieldValue([{ value: "eng", label: "English" }])
    ).toBe("eng");
  });

  it("keeps the order it is given, and joins with a semicolon", () => {
    expect(
      serializeLanguageFieldValue([
        { value: "qab-x-tolo", label: "Tolo" },
        { value: "eng", label: "English" }
      ])
    ).toBe("qab-x-tolo:Tolo;eng");
  });

  it("does not write the name twice", () => {
    expect(
      serializeLanguageFieldValue([
        { value: "qab-x-tolo:Tolo", label: "Tolo", hadName: true }
      ])
    ).toBe("qab-x-tolo:Tolo");
  });

  it("round-trips a field through parse and serialize", () => {
    const text = "qab-x-tolo:Tolo;pta:Guarani;eng";
    const parsed = splitLanguageFieldValue(text).map((e) => ({
      value: e.code,
      label: e.name ?? "",
      hadName: e.name !== undefined
    }));
    expect(serializeLanguageFieldValue(parsed)).toBe(text);
  });
});
