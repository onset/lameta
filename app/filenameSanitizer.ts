const sanitizeFilename = require("sanitize-filename");
const ASCIIFolder = require("fold-to-ascii");
import userSettingsSingleton from "./UserSettings";

export function sanitize(name: string): string {
  let n = name;
  if (userSettingsSingleton.IMDIMode) {
    // first, get to ascii only
    n = ASCIIFolder.foldReplacing(n, "X");
    n = n.trim().replace(" ", "_");
    // next, limit to a-z,A-Z,0-9, _ , -.
    // I added a period.
    const validChars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_.-";
    const regex = new RegExp("[^" + validChars + "]", "g");
    n = n.replace(regex, "");
  }
  // finally, make sure it is safe for filesystems
  n = sanitizeFilename(n);
  return n;
}
