import { describe, it, expect } from "vitest";
import {
  allocateNextPrivateUseTag,
  getPrimarySubtag,
  isPrivateUseTag,
  resolvePrivateUseCodes,
  slugifyForPrivateUseSubtag
} from "./privateUseLanguages";

describe("getPrimarySubtag", () => {
  it("takes the part before the first hyphen", () => {
    expect(getPrimarySubtag("qaa-x-Foo")).toBe("qaa");
    expect(getPrimarySubtag("en-US")).toBe("en");
    expect(getPrimarySubtag("zh-Hans-CN")).toBe("zh");
  });
  it("lowercases and trims", () => {
    expect(getPrimarySubtag("  QAB-x-Tolo ")).toBe("qab");
  });
  it("passes through a bare code", () => {
    expect(getPrimarySubtag("eng")).toBe("eng");
  });
});

describe("isPrivateUseTag", () => {
  it("accepts the ends of the qaa..qtz range", () => {
    expect(isPrivateUseTag("qaa")).toBe(true);
    expect(isPrivateUseTag("qtz")).toBe(true);
    expect(isPrivateUseTag("qkm")).toBe(true);
  });
  it("accepts a tag whose primary subtag is in the range", () => {
    expect(isPrivateUseTag("qab-x-tolo")).toBe(true);
  });
  // A plain string comparison would wrongly accept this, because "qaa-x-foo" < "qtz".
  it("rejects a full tag when the whole string is tested as one subtag", () => {
    expect(isPrivateUseTag("qaax")).toBe(false);
  });
  it("rejects codes just outside the range", () => {
    expect(isPrivateUseTag("qua")).toBe(false); // "u" is past "t"
    expect(isPrivateUseTag("qzz")).toBe(false);
  });
  it("rejects real ISO 639-3 codes", () => {
    expect(isPrivateUseTag("laq")).toBe(false);
    expect(isPrivateUseTag("eng")).toBe(false);
    expect(isPrivateUseTag("que")).toBe(false);
  });
  it("rejects empty and short input", () => {
    expect(isPrivateUseTag("")).toBe(false);
    expect(isPrivateUseTag("qa")).toBe(false);
  });
});

describe("slugifyForPrivateUseSubtag", () => {
  it("drops accents", () => {
    expect(slugifyForPrivateUseSubtag("Kürbinian")).toBe("kurbinia");
  });
  it("truncates to the 8 characters BCP 47 allows in a subtag", () => {
    expect(slugifyForPrivateUseSubtag("abcdefghijkl")).toBe("abcdefgh");
  });
  it("removes spaces and the field's own separators", () => {
    expect(slugifyForPrivateUseSubtag("My Lang")).toBe("mylang");
    expect(slugifyForPrivateUseSubtag("a:b;c")).toBe("abc");
  });
  it("keeps digits", () => {
    expect(slugifyForPrivateUseSubtag("Lang2")).toBe("lang2");
  });
  it("falls back when nothing survives, because a subtag cannot be empty", () => {
    expect(slugifyForPrivateUseSubtag("!!!")).toBe("lang");
    expect(slugifyForPrivateUseSubtag("")).toBe("lang");
  });
});

describe("allocateNextPrivateUseTag", () => {
  it("gives the first language qaa", () => {
    expect(allocateNextPrivateUseTag("Tolo", [])).toBe("qaa-x-tolo");
  });
  it("gives the second language qab", () => {
    expect(allocateNextPrivateUseTag("Tolo", ["eng", "qaa-x-kurbinia"])).toBe(
      "qab-x-tolo"
    );
  });
  it("skips over a gap rather than reusing a taken code", () => {
    expect(
      allocateNextPrivateUseTag("Third", ["qaa-x-one", "qac-x-three"])
    ).toBe("qab-x-third");
  });
  it("ignores codes outside the range when deciding what is taken", () => {
    expect(allocateNextPrivateUseTag("Tolo", ["laq", "que", "eng"])).toBe(
      "qaa-x-tolo"
    );
  });
  it("returns undefined once all 520 codes are taken", () => {
    const all: string[] = [];
    for (let second = 0; second < 20; second++) {
      for (let third = 0; third < 26; third++) {
        all.push(
          "q" +
            String.fromCharCode(97 + second) +
            String.fromCharCode(97 + third)
        );
      }
    }
    expect(all.length).toBe(520);
    expect(allocateNextPrivateUseTag("Tolo", all)).toBeUndefined();
    // one freed code is enough
    expect(allocateNextPrivateUseTag("Tolo", all.slice(1))).toBe("qaa-x-tolo");
  });
});

describe("resolvePrivateUseCodes", () => {
  it("leaves distinct tags on their own codes", () => {
    const m = resolvePrivateUseCodes(["qaa-x-kurbinia", "qab-x-tolo"]);
    expect(m.get("qaa-x-kurbinia")).toBe("qaa");
    expect(m.get("qab-x-tolo")).toBe("qab");
  });
  it("sorts a colliding group and hands out the next free codes", () => {
    // what a project written by lameta 3.0.x looks like
    const m = resolvePrivateUseCodes(["qaa-x-zebra", "qaa-x-tolo"]);
    expect(m.get("qaa-x-tolo")).toBe("qaa"); // alphabetically first keeps the code
    expect(m.get("qaa-x-zebra")).toBe("qab");
  });
  it("does not steal a code another group already holds", () => {
    const m = resolvePrivateUseCodes([
      "qaa-x-zebra",
      "qaa-x-tolo",
      "qab-x-alpha"
    ]);
    expect(m.get("qaa-x-tolo")).toBe("qaa");
    expect(m.get("qab-x-alpha")).toBe("qab");
    expect(m.get("qaa-x-zebra")).toBe("qac");
  });
  it("ignores tags outside the range", () => {
    const m = resolvePrivateUseCodes(["eng", "laq", "qaa-x-tolo"]);
    expect(m.has("eng")).toBe(false);
    expect(m.has("laq")).toBe(false);
    expect(m.get("qaa-x-tolo")).toBe("qaa");
  });
  it("maps a bare code to itself", () => {
    const m = resolvePrivateUseCodes(["qaa", "qab"]);
    expect(m.get("qaa")).toBe("qaa");
    expect(m.get("qab")).toBe("qab");
  });
  it("treats the same tag in two cases as one language", () => {
    // lameta 3.0.x built the tag from the name the user typed, so one file holds
    // "qaa-x-Tolo" and another holds "qaa-x-tolo". They are one language.
    const map = resolvePrivateUseCodes(["qaa-x-Tolo", "qaa-x-tolo"]);
    expect(map.size).toBe(1);
    expect(map.get("qaa-x-tolo")).toBe("qaa");
  });

  it("keys the map in lower case", () => {
    const map = resolvePrivateUseCodes(["qaa-x-Zebra", "qaa-x-Tolo"]);
    expect(map.get("qaa-x-tolo")).toBe("qaa");
    expect(map.get("qaa-x-zebra")).toBe("qab");
  });

  it("treats a repeated tag as one language", () => {
    const m = resolvePrivateUseCodes(["qaa-x-tolo", "qaa-x-tolo"]);
    expect(m.size).toBe(1);
    expect(m.get("qaa-x-tolo")).toBe("qaa");
  });
  it("gives every tag a different code", () => {
    const tags = ["qaa-x-one", "qaa-x-two", "qaa-x-three", "qaa-x-four"];
    const m = resolvePrivateUseCodes(tags);
    const codes = tags.map((t) => m.get(t));
    expect(new Set(codes).size).toBe(4);
  });
});
