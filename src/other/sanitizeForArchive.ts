import {
  GetOtherConfigurationSettings,
  OtherConfigurationSettings,
} from "../model/Project/OtherConfigurationSettings";

const sanitizeFilename = require("sanitize-filename");
const ASCIIFolder = require("fold-to-ascii");

let _archiveLimitsToPortableChars: () => boolean = () => false;
export function initializeSanitizeForArchive(fn: () => boolean) {
  _archiveLimitsToPortableChars = fn;
}
export function sanitizeForArchive(
  name: string,
  forceRules?: OtherConfigurationSettings["fileNameRules"],
): string {
  let n = name;
  switch (forceRules || GetOtherConfigurationSettings().fileNameRules) {
    case "ASCII": {
      // a name copied from a Mac is often in NFD, where an accent is a separate character
      // that would become an X
      n = n.normalize("NFC");
      // first, get to ascii only
      n = ASCIIFolder.foldReplacing(n, "X"); // does things like "Afi Ƒe Nɔƒe" -> "Afi Fe Nofe"
      n = n.trim().replace(/\s/g, "_");
      // If the ASCII conversion has left us with an invalid character, replace them with an underscore
      const validChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_.-";
      const regex = new RegExp("[^" + validChars + "]", "g");
      n = n.replace(regex, "_");
      break;
    }
    case "unicode":
      // nothing more to do?
      break;
    default:
      throw new Error("Unknown fileNameRules: " + GetOtherConfigurationSettings().fileNameRules);
  }

  // regardless of limitations by the archive, make sure it is safe for filesystems. Each
  // step can expose something that an earlier one handles, as when removing a trailing
  // dot leaves "CON", so repeat until nothing changes.
  for (;;) {
    const next = withoutWindowsDeviceName(
      sanitizeFilename(withoutWindowsDeviceName(n.replace(kIllegalCharacters, "")))
        .replace(/^_+/, "")
        .replace(/[_. ]+$/, ""),
    );
    if (next === n) return n;
    n = next;
  }
}

// What sanitize-filename removes before it checks for a device name
const kIllegalCharacters = /[/?<>\\:*|"\x00-\x1f\x80-\x9f]/g;

// The name of a file or folder in an IMDI or OPEX export. Unlike sanitizeForArchive, it
// never leaves the name empty or only an extension, as "???.wav" would be.
export function sanitizeForExport(name: string): string {
  const n = sanitizeForArchive(name, "ASCII");
  if (n !== "" && (!n.startsWith(".") || name.startsWith("."))) return n;
  return `x${hashOf(name)}${n}`;
}

// a short hash, so that two names with nothing usable in them still differ
function hashOf(text: string): string {
  let hash = 0x811c9dc5;
  for (const c of text) {
    hash = Math.imul(hash ^ c.codePointAt(0)!, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// Windows cannot make a file named like a device, such as "COM1" or "aux.txt", and
// sanitize-filename would remove the whole name, so add an underscore: "aux_.txt"
function withoutWindowsDeviceName(name: string): string {
  return name.replace(/^(con|prn|aux|nul|com\d|lpt\d)(?=\.|$)/i, "$1_");
}
