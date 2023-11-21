import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    alias: {
      "package.json": path.resolve(__dirname, "./package.json")
    }
  },
  test: {
    globals: true,
    environment: "happy-dom",
    //deps: { interopDefault: true }, // needed this when I was attempting environment:"node" see https://github.com/vitest-dev/vitest/issues/2544
    include: ["./**/*.spec.ts"],
    setupFiles: ["./src/vitest.mock.ts"],
    /**
     * The default timeout of 5000ms is sometimes not enough for playwright.
     */
    testTimeout: 30_000,
    hookTimeout: 30_000
  },
  plugins: [
    react({
      babel: {
        // makes lingui macros work. There is a some performance penalty, but I
        //don't know how much. See https://github.com/skovhus/vite-lingui
        plugins: ["macros"]
        // I don't know why, but css props work without this or the 'macros' thing above
        //   plugins: ["@emotion/babel-plugin"],
      }
    })
  ]
});
