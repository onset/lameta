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
  // a name copied from a Mac is often in NFD, where an accent is a separate character
  let n = name.normalize("NFC");
  switch (forceRules || GetOtherConfigurationSettings().fileNameRules) {
    case "ASCII": {
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

  // remove leading and trailing underscores
  n = n.replace(/^_+/, "").replace(/_+$/, "");

  // regardless of limitations by the archive, make sure it is safe for filesystems
  return sanitizeFilename(withoutWindowsDeviceName(n));
}

// Windows cannot make a file named like a device, such as "COM1" or "aux.txt", and
// sanitize-filename would remove the whole name, so add an underscore: "aux_.txt"
function withoutWindowsDeviceName(name: string): string {
  return name.replace(/^(con|prn|aux|nul|com\d|lpt\d)(?=\.|$)/i, "$1_");
}
