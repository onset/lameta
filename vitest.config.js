import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import dsv from "@rollup/plugin-dsv";
export default defineConfig({
  resolve: {
    alias: {
      "package.json": path.resolve(__dirname, "./package.json")
    }
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
    }),
    dsv() // without this, importing genres.csv causes a failure when it sees `"foo",,"bar"`
  ]
});
