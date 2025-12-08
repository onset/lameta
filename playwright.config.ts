import { defineConfig } from "@playwright/test";

export default defineConfig({
  // Limit discovery to e2e tests
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  // Prepare env (E2ERoot, assets copy, logging tweaks) before tests
  globalSetup: "./e2e/globalSetup.ts",
  workers: 4,
  reporter: process.env.CI
    ? [["blob"], ["html"]] // keep artifacts only in CI (for PR reports, etc.)
    : [["line", { printSteps: true }]], // or could use "list"
  // Prevent the logs from being flooded with the console.log output from
  // passing tests, making it much easier to find the relevant output from
  // the tests that actually failed.  If you need to debug, you can use the
  // trace viewer or temporarily change this setting.
  // Keep artifacts for failures locally so screenshots/traces persist
  preserveOutput: "failures-only",
  outputDir: "tmp/playwright-output",

  use: {
    trace: "retain-on-failure"
  }
});
