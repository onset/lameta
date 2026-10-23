// What two references to a person (a contributor's name, a person's name or code) must share to
// refer to the same person. Names that arrive from macOS file systems are often decomposed (NFD),
// and hand-edited names often carry stray spaces.
export function personReferenceKey(reference: string): string {
  return reference.normalize("NFC").trim().toLowerCase();
}
