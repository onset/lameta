// Pure logic for scoping plugin access to a selected file's "companion" files.
//
// A plugin holding the "companionFiles" permission may read/write files that live beside the
// selected file and share its name-stem. The rule is deliberately generic — lameta core knows
// NOTHING about any particular plugin's naming conventions (SayMore's `.annotations.eaf`,
// `_Annotations/`, `_StandardAudio`, Praat's `.TextGrid`, subtitle `.srt`, …). A new plugin that
// needs a companion never requires a lameta source change.
//
// Let A = the selected file's name truncated at its FIRST ".". A relPath (relative to the
// selected file's own directory — for .link files that is where the real media lives) is an
// allowed companion iff:
//   1. it is relative — no absolute paths, no "..", no empty segments; "\" ≡ "/";
//      comparison is case-insensitive (Windows/mac filesystems);
//   2. it has at most 2 segments (one directory level deep);
//   3. its FIRST segment either equals the selected file's whole name, or starts with A
//      immediately followed by "." or "_";
//   4. in the 2-segment case the second segment is any non-empty file name.
//
// This is a stability boundary, not a security sandbox (see docs/plugin-authoring.md): it keeps a
// well-intentioned plugin scoped to its own file's family without hardcoding legacy trivia. It
// intentionally accepts some looseness — a dotted stem like "session.1.wav" anchors at "session"
// so "session.2.wav"'s family also matches, and the selected file itself is reachable — neither of
// which matters for the kind of plugin we defend against.
//
// No filesystem IO here; the bridge does the actual reading/writing/listing. Keeping this pure
// makes the accept/reject matrix trivially unit-testable.

import * as Path from "path";

/** The anchor A: the selected file's name up to (not including) its first ".".
 * The whole name when it has no dot. */
export function companionAnchor(fileName: string): string {
  const i = fileName.indexOf(".");
  return i === -1 ? fileName : fileName.slice(0, i);
}

/** True if a single path segment is an allowed companion first-segment for the selected file:
 * it equals the selected file's whole name, or it starts with the anchor A immediately followed
 * by "." or "_". Case-insensitive. */
export function isAllowedCompanionFirstSegment(
  fileName: string,
  segment: string
): boolean {
  const s = segment.toLowerCase();
  const name = fileName.toLowerCase();
  if (s === name) return true;
  const a = companionAnchor(fileName).toLowerCase();
  if (a.length === 0) return false;
  if (!s.startsWith(a)) return false;
  const next = s.charAt(a.length);
  return next === "." || next === "_";
}

/**
 * True if `relPath` (relative to the selected file's directory) names an allowed companion of
 * `fileName` under the generic prefix rule. Case-insensitive; "\" and "/" are equivalent.
 */
export function isAllowedCompanionPath(
  fileName: string,
  relPath: string
): boolean {
  if (typeof relPath !== "string" || relPath.length === 0) return false;
  const normalized = relPath.replace(/\\/g, "/");
  // Reject absolute paths in either flavor (leading slash or a drive letter).
  if (normalized.startsWith("/") || /^[a-z]:/i.test(normalized)) return false;

  const segments = normalized.split("/");
  // At most one directory level.
  if (segments.length < 1 || segments.length > 2) return false;
  // Reject empty segments (trailing slash, "//") and any traversal.
  if (segments.some((s) => s === "" || s === "." || s === "..")) return false;

  // The first segment must anchor on the selected file's name-stem. The second segment (if
  // present) may be any non-empty file name — already guaranteed non-empty above.
  return isAllowedCompanionFirstSegment(fileName, segments[0]);
}

/**
 * Validate `relPath` against the rule and return the absolute path under `fileDir`.
 * Throws with a clear message if the path is not an allowed companion of `fileName`.
 */
export function resolveCompanionPath(
  fileDir: string,
  fileName: string,
  relPath: string
): string {
  if (!isAllowedCompanionPath(fileName, relPath)) {
    throw new Error(
      `"${relPath}" is not an allowed companion path for "${fileName}"`
    );
  }
  const fullPath = Path.join(fileDir, relPath.replace(/\\/g, "/"));

  // Defense in depth: ensure we stay inside the file's directory.
  const rel = Path.relative(fileDir, fullPath);
  if (rel.startsWith("..") || Path.isAbsolute(rel)) {
    throw new Error(
      `Refusing companion path outside the file's directory: "${relPath}"`
    );
  }
  return fullPath;
}
