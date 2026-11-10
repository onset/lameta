import { describe, expect, it, vi } from "vite-plus/test";
import fs from "fs";
import * as Path from "path";
import * as gettextParser from "gettext-parser";

vi.mock("./UserSettings", () => ({
  default: { UILanguage: "en" },
}));
vi.mock("../model/Project/AuthorityLists/AuthorityLists", () => ({
  loadOLACRoles: () => [],
}));

import { setUILanguage, translateFieldLabel } from "./localization";
import type { FieldDefinition } from "../model/field/FieldDefinition";

const locales = ["es", "fa", "fr", "id", "pt-BR", "ru", "zh-CN"];

// Every English text in fields.po that has a translation, different from the English, under
// some msgctxt, with that translation.
function translatedLabels(locale: string): Map<string, string> {
  const file = Path.join(__dirname, "../../locale", locale, "fields.po");
  const translations = gettextParser.po.parse(fs.readFileSync(file)).translations;
  const labels = new Map<string, string>();
  for (const context of Object.keys(translations)) {
    for (const [msgid, entry] of Object.entries(translations[context])) {
      const msgstr = (entry.msgstr ?? []).join("");
      if (msgid && msgstr.trim() && msgstr !== msgid && !labels.has(msgid)) {
        labels.set(msgid, msgstr);
      }
    }
  }
  return labels;
}

describe("field labels", () => {
  // fields.po holds some English texts several times, once per msgctxt, and lameta looks them up
  // by English text alone; a translated entry must not be hidden by an untranslated one.
  for (const locale of locales) {
    it(`in ${locale}, every English text that fields.po translates somewhere is translated`, () => {
      setUILanguage(locale);
      const untranslated = [...translatedLabels(locale).keys()].filter(
        (englishLabel) => translateFieldLabel({ englishLabel } as FieldDefinition) === englishLabel,
      );
      expect(untranslated).toEqual([]);
    });
  }
});
