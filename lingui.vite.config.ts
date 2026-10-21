import { defineConfig, type CatalogFormatter } from "@lingui/conf";
import { formatter } from "@lingui/format-po";
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

const format: CatalogFormatter = {
  catalogExtension: ".po",
  templateExtension: ".pot",
  parse: (content, ctx) =>
    isJsonCatalog(ctx.filename) ? jsonFormat.parse(content, ctx) : codeFormat.parse(content, ctx),
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
