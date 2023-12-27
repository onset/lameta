import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  catalogs: [
    {
      path: "<rootDir>/locale/{locale}/messages",
      include: ["<rootDir>/src/"],
      exclude: ["**/*.spec.*", "**/*.e2e.*"]
    }
  ],
  format: "po",
  locales: ["en", "es", "id", "ps", "pt-BR", "ru", "fr", "fa", "zh-cn"],
  sourceLocale: "en-code",
  pseudoLocale: "ps"
};
export default config;
