import { defineConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";
import { createSwcExtractor } from "@lingui/native-tools";

// `lingui extract` reads this file, so it lists only the catalog that comes from code.
// fields.po and vocabularies.po are written by archive-configurations/extractFromJSON.ts;
// if they were listed here, `lingui extract` would find none of their messages in src/ and
// empty them in every language. lingui.vite.config.ts adds them for the app build.
export default defineConfig({
  locales: ["en", "es", "id", "ps", "pt-BR", "ru", "fr", "fa", "zh-CN"],
  // Not one of `locales`, so extraction leaves the msgstr of locale/en/*.po empty.
  sourceLocale: "en-code",
  pseudoLocale: "ps",
  catalogs: [
    {
      path: "<rootDir>/locale/{locale}/messages",
      include: ["<rootDir>/src/"],
      exclude: ["**/*.spec.*", "**/*.e2e.*", "**/*.d.ts"],
    },
  ],
  // The same native (SWC) macro implementation that @lingui/vite-plugin compiles the code with,
  // so the extracted message ids always match the ones in the bundle.
  extractors: [createSwcExtractor()],
  // By source text in code-unit order, the order the catalogs had before Lingui 6, so that
  // extraction does not reorder every catalog that comes back from Crowdin.
  orderBy: (a, b) => {
    const textA = a.entry.message ?? a.messageId;
    const textB = b.entry.message ?? b.messageId;
    return textA < textB ? -1 : textA > textB ? 1 : 0;
  },
  format: formatter({
    lineNumbers: false,
    origins: false,
    printPlaceholdersInComments: false,
  }),
});
