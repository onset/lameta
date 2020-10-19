const sanitizeFilename = require("sanitize-filename");
const ASCIIFolder = require("fold-to-ascii");

export function sanitizeForArchive(
  name: string,
  allowOnlyImdiChars: boolean
): string {
  let n = name;
  if (allowOnlyImdiChars) {
    // first, get to ascii only
    n = ASCIIFolder.foldReplacing(n, "X");
    n = n.trim().replace(/\s/g, "_");
    // next, limit to a-z,A-Z,0-9, _ , -.
    // I added a period.
    const validChars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_.-";
    const regex = new RegExp("[^" + validChars + "]", "g");
    // ELAR would like to replace others with underline: https://trello.com/c/pPUR9Jj8/106-export-creates-files-with-prohibited-characters-only-permitted-characters-should-be-allowed
    n = n.replace(regex, "_");
  }
  // finally, make sure it is safe for filesystems
  n = sanitizeFilename(n);
  //console.log(`sanitizeForArchive(${name}) --> ${n}`);
  return n;
}
