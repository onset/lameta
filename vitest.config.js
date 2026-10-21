import path from "node:path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { lingui } from "@lingui/vite-plugin";
import { defineConfig } from "vite-plus";
import dsv from "@rollup/plugin-dsv";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      path: "node:path",
      "package.json": path.resolve(rootDir, "./package.json"),
    },
  },
  test: {
    globals: true,
    watch: false, // agents keep getting hung up in watch mode

    // "happy-dom" costs us about 1/2 second per test run (including each update)
    // it is the cause of the "Download the React DevTools..." message
    environment: "happy-dom",
    // About 20% of our tests rely browser environment of happy-dom.
    //environment: "node",

    //deps: { interopDefault: true }, // needed this when I was attempting environment:"node" see https://github.com/vitest-dev/vitest/issues/2544
    include: ["./**/*.spec.ts"],

    // Note: the __mocks__ system seems to not be working. In mainProcess/__mocks__ there is a MainProcessApiAccess.ts, but it is ignored,
    // so I had to detect when we're tesitng within the real MainProcessApiAccess.ts and create a mock there.

    setupFiles: ["./src/vitest.mock.ts"],
    server: {
      deps: {
        // @lingui/react imports "react/jsx-runtime", which Node cannot resolve in React 17
        // (it has no "exports" map); letting Vite bundle it resolves the import.
        inline: ["@lingui/react"],
      },
    },
    /**
     * The default timeout of 5000ms is sometimes not enough for playwright.
     */
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  plugins: [
    lingui({
      configPath: path.resolve(rootDir, "lingui.vite.config.ts"),
      macroTransform: true,
    }),
    react(),
    dsv(), // without this, importing genres.csv causes a failure when it sees `"foo",,"bar"`
  ],
});
