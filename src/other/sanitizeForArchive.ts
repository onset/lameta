import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";

const sanitizeFilename = require("sanitize-filename");
const ASCIIFolder = require("fold-to-ascii");

let _archiveLimitsToPortableChars: () => boolean = () => false;
export function initializeSanitizeForArchive(fn: () => boolean) {
  _archiveLimitsToPortableChars = fn;
}
export function sanitizeForArchive(name: string, forceRules?: "ASCII"): string {
  let n = name;
  switch (forceRules || GetOtherConfigurationSettings().fileNameRules) {
    case "ASCII": {
      // first, get to ascii only
      n = ASCIIFolder.foldReplacing(n, "X"); // does things like "Afi Ƒe Nɔƒe" -> "Afi Fe Nofe"
      n = n.trim().replace(/\s/g, "_");
      // If the ASCII conversion has left us with an invalid character, replace them with an underscore
      const validChars =
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_.-";
      const regex = new RegExp("[^" + validChars + "]", "g");
      n = n.replace(regex, "_");
      break;
    }
    case "unicode":
      // nothing more to do?
      break;
    default:
      throw new Error(
        "Unknown fileNameRules: " +
          GetOtherConfigurationSettings().fileNameRules
      );
  }

  // regardless of limitations by the archive, make sure it is safe for filesystems
  n = sanitizeFilename(n);
  //console.log(`sanitizeForArchive(${name}) --> ${n}`);

  // remove leading underscores
  n = n.replace(/^_+/, "");
  // remove trailing underscores
  return n.replace(/_+$/, "");
}
