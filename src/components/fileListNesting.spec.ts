import { describe, it, expect } from "vitest";
import { computeNestedFileOrder } from "./fileListNesting";

/** Helper: run and return "name@depth" strings so assertions read like the screenshot. */
function order(names: string[]): string[] {
  return computeNestedFileOrder(names).map((r) => `${names[r.index]}@${r.depth}`);
}

describe("computeNestedFileOrder", () => {
  it("nests the SayMore screenshot scenario two levels deep", () => {
    const names = [
      "i09_Source.mp3",
      "i09_Source_StandardAudio.wav",
      "i09_Source_StandardAudio.wav.annotations.eaf",
      "i09_Source_StandardAudio.wav.oralAnnotations.wav"
    ];
    expect(order(names)).toEqual([
      "i09_Source.mp3@0",
      "i09_Source_StandardAudio.wav@0",
      "i09_Source_StandardAudio.wav.annotations.eaf@1",
      "i09_Source_StandardAudio.wav.oralAnnotations.wav@2"
    ]);
  });

  it("keeps a _StandardAudio.wav co-equal (top level) with its media file", () => {
    const names = ["F.mp3", "F_StandardAudio.wav"];
    expect(computeNestedFileOrder(names).map((r) => r.depth)).toEqual([0, 0]);
  });

  it("makes F.annotations.eaf a child of F", () => {
    const names = ["F.wav", "F.wav.annotations.eaf"];
    expect(order(names)).toEqual(["F.wav@0", "F.wav.annotations.eaf@1"]);
  });

  it("moves a child to immediately follow its parent even when listed apart", () => {
    const names = [
      "F.wav",
      "unrelated.txt",
      "F.wav.annotations.eaf",
      "other.jpg"
    ];
    expect(order(names)).toEqual([
      "F.wav@0",
      "F.wav.annotations.eaf@1",
      "unrelated.txt@0",
      "other.jpg@0"
    ]);
  });

  it("leaves an orphaned eaf (no media file) top-level and normal", () => {
    const names = ["F.wav.annotations.eaf"];
    expect(order(names)).toEqual(["F.wav.annotations.eaf@0"]);
  });

  it("nests pfsx under the eaf when the eaf is present", () => {
    const names = [
      "F.wav",
      "F.wav.annotations.eaf",
      "F.wav.annotations.pfsx"
    ];
    expect(order(names)).toEqual([
      "F.wav@0",
      "F.wav.annotations.eaf@1",
      "F.wav.annotations.pfsx@2"
    ]);
  });

  it("nests pfsx directly under F when no eaf is present", () => {
    const names = ["F.wav", "F.wav.annotations.pfsx"];
    expect(order(names)).toEqual(["F.wav@0", "F.wav.annotations.pfsx@1"]);
  });

  it("accepts the transposed psfx prefs spelling", () => {
    const names = [
      "F.wav",
      "F.wav.annotations.eaf",
      "F.wav.annotations.psfx"
    ];
    expect(order(names)).toEqual([
      "F.wav@0",
      "F.wav.annotations.eaf@1",
      "F.wav.annotations.psfx@2"
    ]);
  });

  it("leaves an orphaned pfsx (no F and no eaf) top-level", () => {
    const names = ["F.wav.annotations.pfsx"];
    expect(order(names)).toEqual(["F.wav.annotations.pfsx@0"]);
  });

  it("nests oralAnnotations under the eaf when present", () => {
    const names = [
      "F.wav",
      "F.wav.annotations.eaf",
      "F.wav.oralAnnotations.wav"
    ];
    expect(order(names)).toEqual([
      "F.wav@0",
      "F.wav.annotations.eaf@1",
      "F.wav.oralAnnotations.wav@2"
    ]);
  });

  it("nests oralAnnotations directly under F when no eaf is present", () => {
    const names = ["F.wav", "F.wav.oralAnnotations.wav"];
    expect(order(names)).toEqual(["F.wav@0", "F.wav.oralAnnotations.wav@1"]);
  });

  it("leaves an orphaned oralAnnotations top-level", () => {
    const names = ["F.wav.oralAnnotations.wav"];
    expect(order(names)).toEqual(["F.wav.oralAnnotations.wav@0"]);
  });

  it("matches case-insensitively", () => {
    const names = [
      "MyFile.WAV",
      "myfile.wav.ANNOTATIONS.eaf",
      "MYFILE.wav.OralAnnotations.WAV"
    ];
    expect(computeNestedFileOrder(names).map((r) => r.depth)).toEqual([0, 1, 2]);
  });

  it("keeps unrelated files in their original order, untouched", () => {
    const names = ["b.txt", "a.jpg", "c.pdf"];
    expect(order(names)).toEqual(["b.txt@0", "a.jpg@0", "c.pdf@0"]);
  });

  it("keeps multiple sibling children in original order under one parent", () => {
    // No eaf present, so both the oral and prefs files attach directly to F as siblings.
    const names = [
      "F.wav",
      "F.wav.oralAnnotations.wav",
      "F.wav.annotations.pfsx"
    ];
    expect(order(names)).toEqual([
      "F.wav@0",
      "F.wav.oralAnnotations.wav@1",
      "F.wav.annotations.pfsx@1"
    ]);
  });

  it("resolves the eaf as parent regardless of its position in the list", () => {
    // The eaf is listed last, but the oral still attaches to it (depth 2), not to F.
    const names = [
      "F.wav",
      "F.wav.oralAnnotations.wav",
      "F.wav.annotations.eaf"
    ];
    expect(order(names)).toEqual([
      "F.wav@0",
      "F.wav.annotations.eaf@1",
      "F.wav.oralAnnotations.wav@2"
    ]);
  });

  it("handles two independent families", () => {
    const names = [
      "A.wav",
      "A.wav.annotations.eaf",
      "B.mp3",
      "B.mp3.annotations.eaf"
    ];
    expect(order(names)).toEqual([
      "A.wav@0",
      "A.wav.annotations.eaf@1",
      "B.mp3@0",
      "B.mp3.annotations.eaf@1"
    ]);
  });

  it("returns an empty array for no files", () => {
    expect(computeNestedFileOrder([])).toEqual([]);
  });
});
