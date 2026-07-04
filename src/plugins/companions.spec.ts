import { describe, it, expect } from "vitest";
import * as Path from "path";
import {
  isAllowedCompanionPath,
  resolveCompanionPath,
  companionAnchor
} from "./companions";

// The generic prefix rule: A = selected file's name up to its first "."; a relPath is allowed
// iff it's relative, <=2 segments, and its first segment either equals the selected file's whole
// name or starts with A immediately followed by "." or "_". No plugin-specific naming knowledge.

const F = "ETR009_Source.mp3"; // selected file; anchor A = "ETR009_Source"
const S = "ETR009_Source_StandardAudio.wav"; // SayMore's PCM conversion (still within the stem)

describe("companionAnchor", () => {
  it("truncates at the first dot", () => {
    expect(companionAnchor("foo.wav")).toBe("foo");
    expect(companionAnchor(F)).toBe("ETR009_Source");
    // A dotted stem anchors at the first dot (accepted looseness).
    expect(companionAnchor("session.1.wav")).toBe("session");
  });
  it("returns the whole name when there is no dot", () => {
    expect(companionAnchor("README")).toBe("README");
  });
  it("an .eaf selection still anchors on the underlying media (first dot)", () => {
    // The whole point: selecting <media>.annotations.eaf re-anchors on <media> with no special case.
    expect(companionAnchor("longerSound.wav.annotations.eaf")).toBe("longerSound");
  });
});

describe("isAllowedCompanionPath", () => {
  // --- the real SayMore family is all reachable under the generic rule ---
  it.each([
    `${F}.annotations.eaf`,
    `${F}.annotations.pfsx`, // ELAN's real prefs extension (regression example)
    `${F}.annotations.psfx`, // SayMore's transposed spelling (regression example)
    `${F}.oralAnnotations.wav`,
    S, // "ETR009_Source_StandardAudio.wav" — starts with A + "_"
    `${S}.annotations.eaf`,
    `${S}.annotations.pfsx`,
    `${S}.annotations.psfx`,
    `${S}.oralAnnotations.wav`
  ])("accepts top-level companion %s", (p) => {
    expect(isAllowedCompanionPath(F, p)).toBe(true);
  });

  it("accepts files one level inside annotation dirs (F and S families)", () => {
    expect(
      isAllowedCompanionPath(F, `${F}_Annotations/1.2_to_3.4_Careful.wav`)
    ).toBe(true);
    expect(isAllowedCompanionPath(F, `${S}_Annotations/seg_Translation.wav`)).toBe(
      true
    );
  });

  it("accepts comma-decimal segment names inside annotation dirs (comma-locale machines)", () => {
    expect(
      isAllowedCompanionPath(F, `${F}_Annotations/1,5_to_2,5_Careful.wav`)
    ).toBe(true);
  });

  it("accepts NON-wav files inside annotation dirs (the .wav-only restriction is dropped)", () => {
    expect(isAllowedCompanionPath(F, `${F}_Annotations/notes.txt`)).toBe(true);
    expect(isAllowedCompanionPath(F, `${F}_Annotations/seg.TextGrid`)).toBe(true);
  });

  it("accepts the selected file itself (reachable through companions.*)", () => {
    expect(isAllowedCompanionPath(F, F)).toBe(true);
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

  // --- an .eaf selection re-anchors on the media with no special case ---
  it("scopes an .eaf selection to the underlying media", () => {
    const EAF = "longerSound.wav.annotations.eaf"; // A = "longerSound"
    expect(isAllowedCompanionPath(EAF, "longerSound.wav")).toBe(true); // media itself
    expect(isAllowedCompanionPath(EAF, "longerSound.wav.annotations.eaf")).toBe(
      true
    ); // the eaf
    expect(
      isAllowedCompanionPath(EAF, "longerSound.wav_Annotations/1.25_to_2.121_Careful.wav")
    ).toBe(true); // segment recordings
    expect(isAllowedCompanionPath(EAF, "longerSound_StandardAudio.wav")).toBe(
      true
    );
  });

  // --- rejections ---
  it("rejects a first segment that does not anchor on the stem (boundary char must be . or _)", () => {
    // "ETR009_SourceX..." shares a prefix but the next char is not "." or "_"
    expect(isAllowedCompanionPath(F, "ETR009_SourceX.annotations.eaf")).toBe(
      false
    );
    // classic foo/foobar case
    expect(isAllowedCompanionPath("foo.wav", "foobar.wav")).toBe(false);
  });

  it("rejects companions of a DIFFERENT file", () => {
    expect(isAllowedCompanionPath(F, "Other.mp3.annotations.eaf")).toBe(false);
    expect(isAllowedCompanionPath(F, "Other.mp3_Annotations/seg.wav")).toBe(false);
    expect(isAllowedCompanionPath(F, "random.eaf")).toBe(false);
  });

  it("rejects a bare-dot or empty second segment", () => {
    expect(isAllowedCompanionPath(F, `${F}_Annotations/`)).toBe(false); // trailing slash
    expect(isAllowedCompanionPath(F, `${F}_Annotations/.`)).toBe(false);
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
    expect(isAllowedCompanionPath(F, "evil.txt")).toBe(false);
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
