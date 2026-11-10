import { describe, expect, it } from "vite-plus/test";
import fs from "fs";
import * as Path from "path";
import * as gettextParser from "gettext-parser";

// A build or sync step that rewrites the catalogs can empty their translations without any
// other test noticing (a CI build once shipped every field label in English this way). These
// minimums are far below what the catalogs hold, so they fail only when translations are lost
// wholesale, not when translators change a few.
const minimumTranslated = { messages: 30, fields: 50 };
const locales = ["es", "fa", "fr", "id", "pt-BR", "ru", "zh-CN"];

function countTranslated(locale: string, catalog: string): number {
  const file = Path.join(__dirname, "../../locale", locale, `${catalog}.po`);
  const translations = gettextParser.po.parse(fs.readFileSync(file)).translations;
  let count = 0;
  for (const context of Object.keys(translations)) {
    for (const msgid of Object.keys(translations[context])) {
      if (msgid && (translations[context][msgid].msgstr ?? []).join("").trim()) count++;
    }
  }
  return count;
}

describe("translation catalogs", () => {
  for (const locale of locales) {
    for (const [catalog, minimum] of Object.entries(minimumTranslated)) {
      it(`locale/${locale}/${catalog}.po keeps its translations`, () => {
        expect(countTranslated(locale, catalog)).toBeGreaterThanOrEqual(minimum);
      });
    }
  }
});
