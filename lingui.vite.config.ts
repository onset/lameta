import { defineConfig, type CatalogFormatter } from "@lingui/conf";
import { formatter } from "@lingui/format-po";
import * as gettextParser from "gettext-parser";
import baseConfig from "./lingui.config";

// The Lingui Vite plugin reads this file. It adds the two catalogs that
// archive-configurations/extractFromJSON.ts writes, so the app can import them.
// `lingui extract` must not see them; see lingui.config.ts.

const codeFormat = baseConfig.format as CatalogFormatter;
// The app looks up field labels, tips and choices by their English text
// (`i18n._(fieldDef.englishLabel)`), so these catalogs are keyed by msgid,
// not by the hash of msgid and msgctxt that Lingui gives messages from code.
const jsonFormat = formatter({ explicitIdAsDefault: true });
const isJsonCatalog = (filename: string) => /[\\/](fields|vocabularies)\.po$/.test(filename);

// Keyed by msgid alone, entries that share an English text but differ in msgctxt (the same
// field in a session and in project documents, or in two archive configurations) become one
// message, and the format keeps whichever comes last in the file, even when it is untranslated.
// Such a message takes the first translation that any of them has.
// A message with no translation is left out: it would compile to its English text, and since
// localization.ts loads fields and vocabularies into one locale, it would replace a translation
// of the same English text from the other catalog. A lookup of a missing message gives the
// English anyway.
async function parseJsonCatalog(content: string, ctx: Parameters<CatalogFormatter["parse"]>[1]) {
  const catalog = await jsonFormat.parse(content, ctx);
  const translations = gettextParser.po.parse(content).translations;
  for (const context of Object.keys(translations)) {
    for (const [msgid, entry] of Object.entries(translations[context])) {
      const translation = (entry.msgstr ?? []).join("");
      const message = catalog[msgid];
      if (message && !message.translation && translation.trim()) message.translation = translation;
    }
  }
  for (const id of Object.keys(catalog)) {
    if (!catalog[id].translation?.trim()) delete catalog[id];
  }
  return catalog;
}

const format: CatalogFormatter = {
  catalogExtension: ".po",
  templateExtension: ".pot",
  parse: (content, ctx) =>
    isJsonCatalog(ctx.filename) ? parseJsonCatalog(content, ctx) : codeFormat.parse(content, ctx),
  serialize: (catalog, ctx) =>
    isJsonCatalog(ctx.filename)
      ? jsonFormat.serialize(catalog, ctx)
      : codeFormat.serialize(catalog, ctx),
};

export default defineConfig({
  ...baseConfig,
  format,
  catalogs: [
    ...(baseConfig.catalogs ?? []),
    { path: "<rootDir>/locale/{locale}/fields", include: [] },
    { path: "<rootDir>/locale/{locale}/vocabularies", include: [] },
  ],
});
