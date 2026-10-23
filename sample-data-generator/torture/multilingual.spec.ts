import { describe, it, expect, beforeAll } from "vite-plus/test";
import * as fs from "fs";
import * as path from "path";
import * as temp from "temp";
import { writeBulk } from "./bulk";
import { Context, writePeople, writeProject, writeSessions } from "./cases";
import { ContentMaker } from "./content";
import {
  kMetadataLanguages,
  kParallelLists,
  multilingualText,
  partlyTranslated,
} from "./multilingual";
import { ProjectWriter } from "./writer";

temp.track();

const kArabicScript = /[؀-ۿ]/;

function unescapeXml(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

// the text of the first <tag> in an XML file, or undefined
function fieldText(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? unescapeXml(match[1]) : undefined;
}

// the languages of a field, the way TextHolder reads it: plain text is English
function languagesOf(text: string): string[] {
  if (!text.startsWith("[[")) return text === "" ? [] : ["en"];
  return [...text.matchAll(/\[\[([^\[\]]+)\]\]/g)].map((m) => m[1]);
}

function axis(text: string, tag: string): string {
  return new RegExp(`\\[\\[${tag}\\]\\]((?:(?!\\[\\[).)*)`, "s").exec(text)?.[1] ?? "";
}

describe("multilingualText", () => {
  it("writes the languages that have text, in metadata-language order", () => {
    expect(multilingualText({ ar: "ج", en: "a", es: "b" })).toBe("[[en]]a[[es]]b[[ar]]ج");
    expect(multilingualText({ en: "a", es: "", ar: "ج" })).toBe("[[en]]a[[ar]]ج");
    expect(multilingualText({ es: "b" })).toBe("[[es]]b");
  });
  it("writes English alone as plain text, as lameta does", () => {
    expect(multilingualText({ en: "a" })).toBe("a");
  });
});

describe("the translated lists", () => {
  it("line up with their English lists, so that one hash picks the same item in each", () => {
    for (const [english, translated] of kParallelLists) {
      expect(translated.es.length).toBe(english.length);
      expect(translated.ar.length).toBe(english.length);
      for (const text of translated.ar) expect(text).toMatch(kArabicScript);
      for (const text of [...translated.es, ...translated.ar])
        expect(text).not.toMatch(/\[\[|\]\]/);
    }
  });
});

describe("partlyTranslated", () => {
  const all = { en: "a", es: "b", ar: "ج" };
  const patterns = new Map<string, number>();
  for (let i = 0; i < 2000; i++) {
    const key = Object.keys(partlyTranslated(all, `id${i}`)).join("+");
    patterns.set(key, (patterns.get(key) ?? 0) + 1);
  }
  it("leaves most fields in all three languages", () => {
    const share = (patterns.get("en+es+ar") ?? 0) / 2000;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.8);
  });
  it("leaves some fields in only English, only Spanish, English and Arabic, or without Arabic", () => {
    for (const p of ["en", "es", "en+ar", "en+es"])
      expect(patterns.get(p) ?? 0).toBeGreaterThan(40);
  });
});

describe("the generated project", () => {
  let root: string;
  const read = (rel: string) => fs.readFileSync(path.join(root, ...rel.split("/")), "utf8");
  const filesIn = (dir: string, ext: string) =>
    fs
      .readdirSync(path.join(root, dir))
      .map((f) => `${dir}/${f}/${f}${ext}`)
      .filter((rel) => fs.existsSync(path.join(root, ...rel.split("/"))));

  beforeAll(() => {
    root = path.join(temp.mkdirSync("torture-ml"), "Interviews with Abstract Artists");
    const w = new ProjectWriter(root);
    const ctx: Context = { w, content: new ContentMaker(undefined), archiveConfiguration: "ELAR" };
    writeProject(ctx, "Interviews with Abstract Artists");
    writePeople(ctx);
    writeSessions(ctx);
    writeBulk(ctx, 200, 60);
  }, 120000);

  it("declares English, Spanish and Arabic as its metadata languages", () => {
    const sprj = read("Interviews with Abstract Artists.sprj");
    expect(fieldText(sprj, "MetadataLanguages")).toBe(kMetadataLanguages);
  });

  it("has its title and description in all three languages", () => {
    const sprj = read("Interviews with Abstract Artists.sprj");
    for (const tag of ["Title", "ProjectDescription"]) {
      const text = fieldText(sprj, tag)!;
      expect(languagesOf(text)).toEqual(["en", "es", "ar"]);
      expect(axis(text, "ar")).toMatch(kArabicScript);
    }
  });

  function expectMostlyTrilingual(texts: string[]) {
    const languages = texts.map(languagesOf);
    for (const l of languages) for (const tag of l) expect(["en", "es", "ar"]).toContain(tag);
    const all = languages.filter((l) => l.join("+") === "en+es+ar").length;
    expect(all / texts.length).toBeGreaterThan(0.4);
    expect(all).toBeLessThan(texts.length);
    for (const text of texts)
      if (text.includes("[[ar]]")) expect(axis(text, "ar")).toMatch(kArabicScript);
  }

  it("gives the bulk sessions' multilingual fields text in English, Spanish and Arabic", () => {
    const sessions = filesIn("Sessions", ".session")
      .filter((rel) => rel.startsWith("Sessions/INT_"))
      .map(read);
    expect(sessions.length).toBe(200);
    for (const tag of ["title", "description", "keyword", "topic"])
      expectMostlyTrilingual(sessions.map((s) => fieldText(s, tag)!));
    expectMostlyTrilingual(
      sessions.map((s) => fieldText(s, "accessDescription")).filter((t) => t !== undefined),
    );
  });

  it("gives the people's descriptions text in English, Spanish and Arabic", () => {
    const people = filesIn("People", ".person").map(read);
    const descriptions = people
      .map((p) => fieldText(p, "description"))
      .filter((d): d is string => d !== undefined && /^(\[\[(en|es|ar)\]\]|[^\[])/.test(d));
    expect(descriptions.length).toBeGreaterThan(60);
    expectMostlyTrilingual(descriptions);
  });

  it("gives the hand-made sessions that take the themed title a title in all three", () => {
    const titles = filesIn("Sessions", ".session")
      .filter((rel) => !rel.startsWith("Sessions/INT_"))
      .map((rel) => fieldText(read(rel), "title"))
      .filter((t): t is string => t !== undefined);
    expect(titles.filter((t) => languagesOf(t).join("+") === "en+es+ar").length).toBeGreaterThan(
      20,
    );
  });

  it("keeps the malformed multilingual cases as they were", () => {
    expect(fieldText(read("Sessions/ML_unclosed_tag/ML_unclosed_tag.session"), "description")).toBe(
      "[[en]Fish",
    );
  });
});
