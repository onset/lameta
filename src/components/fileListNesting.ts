// Pure logic for SayMore-style visual nesting of annotation companion files in the
// file list (see FileList.tsx). This does NOT change the underlying data model: the
// owning Folder's `files` array is untouched (exports still iterate it). We only
// compute a *display* order in which subordinate companion files appear indented,
// immediately after the file they belong to.
//
// Nesting rules, given a file named F that is present in the list (all matching is
// case-INsensitive, matching lameta's other companion logic in ../plugins/companions.ts):
//
//   F.annotations.eaf                     child of F
//   F.annotations.pfsx / F.annotations.psfx (ELAN/SayMore prefs)
//                                         child of F.annotations.eaf when it's present,
//                                         otherwise child of F
//   F.oralAnnotations.wav                 child of F.annotations.eaf when present,
//                                         otherwise child of F
//
// A subordinate whose parent row is absent stays top-level (orphans remain normal,
// depth 0). `_StandardAudio.wav` files are ordinary top-level rows that are never
// nested themselves, but they can act as the parent F of their own annotation family
// (this falls out of the rules for free). Depth in practice tops out at 2.

/** One display row: which original file it is, and how deep to indent it (0, 1, or 2). */
export interface NestedFileRow {
  /** Index into the original `fileNames` array passed in. */
  index: number;
  /** Indentation depth: 0 = top level, 1 = child, 2 = grandchild. */
  depth: number;
}

const kEafSuffix = ".annotations.eaf";
// ELAN writes ".pfsx"; SayMore's kEafPreferencesFileExtension is the transposed ".psfx".
const kPrefsSuffixes = [".annotations.pfsx", ".annotations.psfx"];
const kOralSuffix = ".oralannotations.wav";

/**
 * Given the file names in their current display order, return the rows regrouped so
 * that each subordinate companion file immediately follows the file it belongs to,
 * with a nesting depth. Top-level files keep their original relative order; children
 * of the same parent keep their original relative order beneath it.
 *
 * Pure and dependency-free so it can be unit-tested exhaustively.
 */
export function computeNestedFileOrder(fileNames: string[]): NestedFileRow[] {
  const n = fileNames.length;
  const lower = fileNames.map((name) => (name ?? "").toLowerCase());

  // First-occurrence index for each (lowercased) name, so we can resolve parents.
  const indexByName = new Map<string, number>();
  lower.forEach((name, i) => {
    if (!indexByName.has(name)) indexByName.set(name, i);
  });
  const findIndex = (name: string): number | undefined => indexByName.get(name);

  // Resolve each file's parent (or null for top-level). A parent name is always
  // strictly shorter than its child's, so the parent graph is acyclic.
  const parentOf: (number | null)[] = new Array(n).fill(null);
  lower.forEach((name, i) => {
    let parentIndex: number | undefined;

    if (name.endsWith(kEafSuffix)) {
      const base = name.slice(0, name.length - kEafSuffix.length);
      parentIndex = findIndex(base);
    } else {
      const prefsSuffix = kPrefsSuffixes.find((s) => name.endsWith(s));
      if (prefsSuffix) {
        const base = name.slice(0, name.length - prefsSuffix.length);
        // Prefer the eaf as parent; fall back to the media file F.
        parentIndex = findIndex(base + kEafSuffix);
        if (parentIndex === undefined) parentIndex = findIndex(base);
      } else if (name.endsWith(kOralSuffix)) {
        const base = name.slice(0, name.length - kOralSuffix.length);
        parentIndex = findIndex(base + kEafSuffix);
        if (parentIndex === undefined) parentIndex = findIndex(base);
      }
    }

    if (parentIndex !== undefined && parentIndex !== i) {
      parentOf[i] = parentIndex;
    }
  });

  // Children of each node, in original order (we iterate i ascending).
  const childrenOf: number[][] = fileNames.map(() => []);
  parentOf.forEach((p, i) => {
    if (p !== null) childrenOf[p].push(i);
  });

  // Depth via the parent chain (memoized).
  const depthCache: number[] = new Array(n).fill(-1);
  const depthOf = (i: number): number => {
    if (depthCache[i] >= 0) return depthCache[i];
    const p = parentOf[i];
    const d = p === null ? 0 : depthOf(p) + 1;
    depthCache[i] = d;
    return d;
  };

  // Depth-first flatten: each root followed by its descendants, all in original order.
  const result: NestedFileRow[] = [];
  const visit = (i: number) => {
    result.push({ index: i, depth: depthOf(i) });
    childrenOf[i].forEach(visit);
  };
  for (let i = 0; i < n; i++) {
    if (parentOf[i] === null) visit(i);
  }
  return result;
}
