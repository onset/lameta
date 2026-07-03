import { describe, it, expect } from "vitest";
import * as Path from "path";
import {
  isAllowedCompanionPath,
  resolveCompanionPath,
  getAllowedCompanionSubdirs,
  getTopLevelCompanionNames
} from "./companions";

const F = "ETR009_Source.mp3"; // selected file, non-wav so StandardAudio matters
const S = "ETR009_Source_StandardAudio.wav";

describe("getTopLevelCompanionNames", () => {
  it("returns F's family, S, and S's family", () => {
    expect(getTopLevelCompanionNames(F)).toEqual([
      "ETR009_Source.mp3.annotations.eaf",
      "ETR009_Source.mp3.annotations.pfsx",
      "ETR009_Source.mp3.annotations.psfx",
      "ETR009_Source.mp3.oralAnnotations.wav",
      "ETR009_Source_StandardAudio.wav",
      "ETR009_Source_StandardAudio.wav.annotations.eaf",
      "ETR009_Source_StandardAudio.wav.annotations.pfsx",
      "ETR009_Source_StandardAudio.wav.annotations.psfx",
      "ETR009_Source_StandardAudio.wav.oralAnnotations.wav"
    ]);
  });
  it("handles a file with no extension", () => {
    expect(getTopLevelCompanionNames("README")).toContain(
      "README_StandardAudio.wav"
    );
  });
});

describe("getAllowedCompanionSubdirs", () => {
  it("returns F_Annotations and S_Annotations", () => {
    expect(getAllowedCompanionSubdirs(F)).toEqual([
      `${F}_Annotations`,
      `${S}_Annotations`
    ]);
  });
});

describe("isAllowedCompanionPath", () => {
  // --- each allowed top-level pattern ---
  it.each([
    `${F}.annotations.eaf`,
    `${F}.annotations.pfsx`, // ELAN's real prefs extension
    `${F}.annotations.psfx`, // SayMore's transposed kEafPreferencesFileExtension
    `${F}.oralAnnotations.wav`,
    S,
    `${S}.annotations.eaf`,
    `${S}.annotations.pfsx`,
    `${S}.annotations.psfx`,
    `${S}.oralAnnotations.wav`
  ])("accepts top-level companion %s", (p) => {
    expect(isAllowedCompanionPath(F, p)).toBe(true);
  });

  it("rejects the old appended prefs form F.annotations.eaf.psfx", () => {
    expect(isAllowedCompanionPath(F, `${F}.annotations.eaf.psfx`)).toBe(false);
    expect(isAllowedCompanionPath(F, `${S}.annotations.eaf.psfx`)).toBe(false);
  });

  it("accepts .wav files one level inside F_Annotations and S_Annotations", () => {
    expect(isAllowedCompanionPath(F, `${F}_Annotations/1.2_to_3.4_Careful.wav`)).toBe(
      true
    );
    expect(isAllowedCompanionPath(F, `${S}_Annotations/seg_Translation.wav`)).toBe(
      true
    );
  });

  it("accepts comma-decimal segment names (comma-locale machines) inside _Annotations", () => {
    // e.g. "1,5_to_2,5_Careful.wav" — still <name>.wav, commas must not be rejected
    expect(
      isAllowedCompanionPath(F, `${F}_Annotations/1,5_to_2,5_Careful.wav`)
    ).toBe(true);
  });

  it("accepts backslash separators as equivalent to forward slashes", () => {
    expect(isAllowedCompanionPath(F, `${F}_Annotations\\seg.wav`)).toBe(true);
  });

  it("accepts case-insensitively", () => {
    expect(isAllowedCompanionPath(F, "etr009_source.MP3.ANNOTATIONS.EAF")).toBe(
      true
    );
    expect(
      isAllowedCompanionPath(F, `${F.toUpperCase()}_ANNOTATIONS/SEG.WAV`)
    ).toBe(true);
  });

  // --- rejections ---
  it("rejects non-wav files inside an _Annotations dir", () => {
    expect(isAllowedCompanionPath(F, `${F}_Annotations/notes.txt`)).toBe(false);
    expect(isAllowedCompanionPath(F, `${F}_Annotations/seg.wav.bak`)).toBe(false);
  });

  it("rejects a bare '.wav' filename inside an _Annotations dir", () => {
    expect(isAllowedCompanionPath(F, `${F}_Annotations/.wav`)).toBe(false);
  });

  it("rejects nesting deeper than one level", () => {
    expect(isAllowedCompanionPath(F, `${F}_Annotations/x/y.wav`)).toBe(false);
  });

  it("rejects .. traversal anywhere", () => {
    expect(isAllowedCompanionPath(F, `../${F}.annotations.eaf`)).toBe(false);
    expect(isAllowedCompanionPath(F, `${F}_Annotations/../evil.wav`)).toBe(false);
    expect(isAllowedCompanionPath(F, "..")).toBe(false);
  });

  it("rejects absolute paths", () => {
    expect(isAllowedCompanionPath(F, `/etc/${F}.annotations.eaf`)).toBe(false);
    expect(isAllowedCompanionPath(F, `C:\\evil\\${F}.annotations.eaf`)).toBe(
      false
    );
  });

  it("rejects empty and non-matching paths", () => {
    expect(isAllowedCompanionPath(F, "")).toBe(false);
    expect(isAllowedCompanionPath(F, F)).toBe(false); // the file itself
    expect(isAllowedCompanionPath(F, "random.eaf")).toBe(false);
    expect(isAllowedCompanionPath(F, `${F}_Annotations`)).toBe(false); // the dir itself
  });

  it("rejects companions derived from a DIFFERENT file name", () => {
    expect(isAllowedCompanionPath(F, "Other.mp3.annotations.eaf")).toBe(false);
    expect(isAllowedCompanionPath(F, "Other.mp3_Annotations/seg.wav")).toBe(
      false
    );
    expect(
      isAllowedCompanionPath(F, "Other_StandardAudio.wav.annotations.eaf")
    ).toBe(false);
  });
});

describe("resolveCompanionPath", () => {
  const dir = Path.join("/proj", "Sessions", "S1");

  it("returns the absolute path under the file's directory", () => {
    expect(resolveCompanionPath(dir, F, `${F}.annotations.eaf`)).toBe(
      Path.join(dir, `${F}.annotations.eaf`)
    );
    expect(resolveCompanionPath(dir, F, `${F}_Annotations/seg.wav`)).toBe(
      Path.join(dir, `${F}_Annotations`, "seg.wav")
    );
  });

  it("normalizes backslash separators", () => {
    expect(resolveCompanionPath(dir, F, `${F}_Annotations\\seg.wav`)).toBe(
      Path.join(dir, `${F}_Annotations`, "seg.wav")
    );
  });

  it("throws a clear message on a disallowed path", () => {
    expect(() => resolveCompanionPath(dir, F, "../evil.eaf")).toThrow(
      /not an allowed companion path/
    );
    expect(() => resolveCompanionPath(dir, F, "whatever.txt")).toThrow(
      /not an allowed companion path/
    );
  });
});
