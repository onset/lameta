import { describe, it, expect } from "vite-plus/test";
import { uniqueExportNames } from "./exportNames";

describe("uniqueExportNames", () => {
  it("numbers names that sanitize to the same name, and leaves an unchanged name alone", () => {
    expect(uniqueExportNames(["Tape 1", "Tape_1"])).toEqual(["Tape_1_2", "Tape_1"]);
    expect(uniqueExportNames(["Tape_1", "Tape 1"])).toEqual(["Tape_1", "Tape_1_2"]);
  });
  it("numbers before the extension", () => {
    expect(uniqueExportNames(["a b.wav", "a_b.wav"])).toEqual(["a_b_2.wav", "a_b.wav"]);
  });
  it("treats names that differ only in case as the same, as Windows does", () => {
    expect(uniqueExportNames(["Café", "CAFE"])).toEqual(["Cafe_2", "CAFE"]);
  });
  it("does not use a taken name", () => {
    expect(uniqueExportNames(["otherdocuments", "OtherDocuments"], ["OtherDocuments"])).toEqual([
      "otherdocuments_2",
      "OtherDocuments_3",
    ]);
  });
  it("leaves names that do not clash as sanitizing makes them", () => {
    expect(uniqueExportNames(["COM1", "x y"])).toEqual(["COM1_", "x_y"]);
  });
});
