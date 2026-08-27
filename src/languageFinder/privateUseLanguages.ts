// BCP 47 and ISO 639-3 reserve the range qaa..qtz for local use. lameta uses it for languages
// that the ISO 639-3 index does not list, giving each one its own code so that an archive can
// tell them apart. The full tag we store looks like "qab-x-tolo", and the name the user typed
// is kept after a colon, e.g. "qab-x-tolo:Tolo".

const kPrivateUsePattern = /^q[a-t][a-z]$/;
const kMaxSubtagLength = 8; // BCP 47 allows 1-8 alphanumerics per subtag

/** The part of a language tag before the first hyphen, e.g. "qaa-x-Foo" --> "qaa" */
export function getPrimarySubtag(tag: string): string {
  return (tag || "").trim().toLowerCase().split("-")[0];
}

/**
 * True if the tag's primary subtag is in the qaa..qtz range that ISO 639-3 reserves for
 * local use. Note that a plain string comparison would wrongly accept "qaa-x-foo", because
 * "qaa-x-foo" < "qtz".
 */
export function isPrivateUseTag(tag: string): boolean {
  return kPrivateUsePattern.test(getPrimarySubtag(tag));
}

/**
 * Turn a language name into something legal in the "-x-" part of a tag: lowercase ASCII
 * alphanumerics, at most 8 of them. E.g. "Kürbinian" --> "kurbinia". Nothing reads this part;
 * it is there so that a human reading the file can tell the tags apart. The full name is
 * stored after the colon.
 */
export function slugifyForPrivateUseSubtag(name: string): string {
  const slug = (name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // drop combining accents, so "ü" becomes "u"
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, kMaxSubtagLength);
  // A subtag must have at least one character. "私" and "!!!" both slugify to nothing.
  return slug.length > 0 ? slug : "lang";
}

/** Every code in the qaa..qtz range, in order. 520 of them. */
function* privateUseCodesInOrder(): Generator<string> {
  for (let second = "a".charCodeAt(0); second <= "t".charCodeAt(0); second++) {
    for (let third = "a".charCodeAt(0); third <= "z".charCodeAt(0); third++) {
      yield "q" + String.fromCharCode(second) + String.fromCharCode(third);
    }
  }
}

/**
 * Build a tag for a new language, using the first code in qaa..qtz that no tag in tagsInUse
 * has already claimed. Returns undefined when all 520 are taken, so that the caller can say
 * so rather than handing out a duplicate.
 */
export function allocateNextPrivateUseTag(
  name: string,
  tagsInUse: string[]
): string | undefined {
  const taken = new Set(tagsInUse.map((t) => getPrimarySubtag(t)));
  for (const code of privateUseCodesInOrder()) {
    if (!taken.has(code)) {
      return `${code}-x-${slugifyForPrivateUseSubtag(name)}`;
    }
  }
  return undefined;
}

/**
 * Decide which 3-letter code each private-use tag should export as.
 *
 * A tag whose primary subtag is unique in the project keeps it, so a language created by this
 * version always exports as the code in its own tag. Only tags that share a primary subtag
 * need help, which happens in projects written by lameta 3.0.x, where every invented language
 * was minted as "qaa-x-...". Those are sorted alphabetically and given the next free codes.
 *
 *   qaa-x-tolo, qaa-x-zebra   -->   qaa-x-tolo: qaa, qaa-x-zebra: qab
 *
 * Tags outside the qaa..qtz range are ignored; they are not ours to renumber.
 *
 * Both the keys and the comparisons are lowercase. lameta 3.0.x minted "qaa-x-MyLanguage"
 * from the name the user typed, so the same language appears in one file with a capital
 * letter and in another without one.
 */
export function resolvePrivateUseCodes(tags: string[]): Map<string, string> {
  const result = new Map<string, string>();

  const groups = new Map<string, string[]>();
  for (const rawTag of tags) {
    const tag = (rawTag || "").trim().toLowerCase();
    if (!isPrivateUseTag(tag)) continue;
    const code = getPrimarySubtag(tag);
    if (!groups.has(code)) groups.set(code, []);
    const members = groups.get(code)!;
    if (!members.includes(tag)) members.push(tag);
  }

  // Every group's own code is reserved, so renumbering one group never steals from another.
  const claimed = new Set(groups.keys());

  for (const [code, members] of groups) {
    if (members.length === 1) {
      result.set(members[0], code);
      continue;
    }
    const sorted = [...members].sort((a, b) => a.localeCompare(b));
    // The alphabetically first member keeps the shared code; the rest get new ones.
    result.set(sorted[0], code);
    const next = privateUseCodesInOrder();
    for (const tag of sorted.slice(1)) {
      let assigned: string | undefined;
      for (let item = next.next(); !item.done; item = next.next()) {
        if (!claimed.has(item.value)) {
          assigned = item.value;
          break;
        }
      }
      if (assigned === undefined) {
        // All 520 codes are in use. Leave the tag on its original code rather than dropping it.
        result.set(tag, code);
        continue;
      }
      claimed.add(assigned);
      result.set(tag, assigned);
    }
  }

  return result;
}
