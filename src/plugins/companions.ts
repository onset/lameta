// Pure logic for scoping plugin access to a file's SayMore-style companion files.
//
// A plugin holding the "companionFiles" permission may read/write a small, closed set of
// paths derived from the selected file's name F (with extension) inside the file's own
// directory (NOT the owning folder's directory — for .link files the media lives elsewhere
// and its companions belong beside the real media file):
//
//   F.annotations.eaf              ELAN annotation file, beside the media
//   F.annotations.pfsx             ELAN prefs file, the extension REPLACED on the eaf name
//   F.annotations.psfx             same prefs file under SayMore's transposed spelling
//   F.oralAnnotations.wav          generated multichannel oral-annotation file
//   F_Annotations/<name>.wav       per-segment recordings; exactly one level deep, .wav only
//   S = <basenameWithoutExt>_StandardAudio.wav   SayMore's PCM conversion of non-WAV media
//   ...and the same family derived from S: S, S.annotations.eaf, S.annotations.pfsx,
//   S.annotations.psfx, S.oralAnnotations.wav, S_Annotations/<name>.wav
//
// The prefs file has two real forms because ELAN and SayMore disagree on the extension:
// SayMore derives it with Path.ChangeExtension(annotatedFile, kEafPreferencesFileExtension),
// i.e. it REPLACES the .eaf extension (never appends), and its constant
// kEafPreferencesFileExtension is ".psfx" — a transposition of ELAN's real ".pfsx". ELAN
// itself writes ".pfsx" (the common case, created when a user opens the eaf), while SayMore
// renames/deletes the ".psfx" spelling. Both can occur in real session folders, so both are
// allowed; the old appended form "F.annotations.eaf.psfx" is not produced by either tool.
//
// Validation is case-INsensitive (these run on Windows/mac filesystems) and accepts "\" as
// a separator equivalent to "/". Everything else — absolute paths, "..", deeper nesting,
// non-wav files in an _Annotations dir, companions of a different file — is rejected.
//
// No filesystem IO here; the bridge does the actual reading/writing/listing. Keeping this
// pure makes the accept/reject matrix trivially unit-testable.

import * as Path from "path";

/** F's basename without its last extension, e.g. "ETR009.mp3" -> "ETR009". */
function basenameWithoutExtension(fileName: string): string {
  const ext = Path.extname(fileName);
  return ext ? fileName.slice(0, fileName.length - ext.length) : fileName;
}

/** The "_StandardAudio" sibling name S for a selected file F. */
function standardAudioName(fileName: string): string {
  return `${basenameWithoutExtension(fileName)}_StandardAudio.wav`;
}

/** The eaf/prefs/oralAnnotations family that hangs off one name.
 * The prefs file has two real spellings: ".pfsx" (what ELAN writes) and ".psfx"
 * (SayMore's kEafPreferencesFileExtension); both replace the eaf's extension. */
function familyOf(name: string): string[] {
  return [
    `${name}.annotations.eaf`,
    `${name}.annotations.pfsx`,
    `${name}.annotations.psfx`,
    `${name}.oralAnnotations.wav`
  ];
}

/** All allowed top-level (non-subdirectory) companion file names for the selected file:
 * F's family, the StandardAudio file S itself, and S's family. Used by list(). */
export function getTopLevelCompanionNames(fileName: string): string[] {
  const s = standardAudioName(fileName);
  return [...familyOf(fileName), s, ...familyOf(s)];
}

/** The subdirectories a plugin may list/write .wav segment files in:
 * ["F_Annotations", "S_Annotations"]. */
export function getAllowedCompanionSubdirs(fileName: string): string[] {
  return [
    `${fileName}_Annotations`,
    `${standardAudioName(fileName)}_Annotations`
  ];
}

/**
 * True if `relPath` (relative to the selected file's directory) names an allowed
 * companion of `fileName`. Case-insensitive; "\" and "/" are equivalent separators.
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
  // Reject empty segments (trailing slash, "//") and any traversal.
  if (segments.some((s) => s === "" || s === "." || s === "..")) return false;

  const lower = segments.map((s) => s.toLowerCase());

  if (segments.length === 1) {
    return getTopLevelCompanionNames(fileName)
      .map((n) => n.toLowerCase())
      .includes(lower[0]);
  }

  if (segments.length === 2) {
    const subdirOk = getAllowedCompanionSubdirs(fileName)
      .map((d) => d.toLowerCase())
      .includes(lower[0]);
    return subdirOk && lower[1].endsWith(".wav") && lower[1] !== ".wav";
  }

  return false; // deeper nesting is never allowed
}

/**
 * Validate `relPath` against the allowlist and return the absolute path under `fileDir`.
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
