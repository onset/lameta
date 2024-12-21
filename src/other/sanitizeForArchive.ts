const sanitizeFilename = require("sanitize-filename");
const ASCIIFolder = require("fold-to-ascii");

let _archiveLimitsToPortableChars: () => boolean = () => false;
export function initializeSanitizeForArchive(fn: () => boolean) {
  _archiveLimitsToPortableChars = fn;
}

export function sanitizeForArchive(
  name: string,
  allowOnlyPortableChars?: boolean
): string {
  let n = name;
  const limitToPortablChars =
    allowOnlyPortableChars ?? _archiveLimitsToPortableChars();
  if (limitToPortablChars) {
    // first, get to ascii only
    n = ASCIIFolder.foldReplacing(n, "X"); // does things like "Afi Ƒe Nɔƒe" -> "Afi Fe Nofe"
    n = n.trim().replace(/\s/g, "_");
    // If the ASCII conversion has left us with an invalid character, replace them with an underscore
    const validChars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_.-";
    const regex = new RegExp("[^" + validChars + "]", "g");
    n = n.replace(regex, "_");
  }

  // regardless of limitations by the archive, make sure it is safe for filesystems
  n = sanitizeFilename(n);
  //console.log(`sanitizeForArchive(${name}) --> ${n}`);

  // remove leading underscores
  n = n.replace(/^_+/, "");
  // remove trailing underscores
  return n.replace(/_+$/, "");
}
