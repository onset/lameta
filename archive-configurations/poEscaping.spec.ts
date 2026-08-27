import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// extractFromJSON.ts writes these catalogs from the json5 configuration files. A PO string
// ends at the first unescaped quote, so a field description holding a quote used to truncate
// the entry and leave stray tokens after it. See escapeForPo in extractFromJSON.ts.
const generatedCatalogs = ["fields.po", "vocabularies.po"];

// A well-formed PO string: an opening quote, then any run of characters in which every quote
// and every backslash is escaped, then the closing quote.
const wellFormedPoString = /^(msgid|msgctxt|msgstr) "(?:[^"\\]|\\.)*"$/;

describe("the generated PO catalogs", () => {
  generatedCatalogs.forEach((catalog) => {
    it(`${catalog} escapes every quote`, () => {
      const text = fs.readFileSync(
        path.join("locale", "en", catalog),
        "utf-8"
      );
      const badLines = text
        .split(/\r?\n/)
        .map((line, index) => ({ line: line.trim(), number: index + 1 }))
        .filter(
          (l) =>
            /^(msgid|msgctxt|msgstr) "/.test(l.line) &&
            !wellFormedPoString.test(l.line)
        );
      expect(badLines).toEqual([]);
    });
  });
});
