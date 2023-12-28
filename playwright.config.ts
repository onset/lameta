import { type PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  workers: 1, // our test run into each other, but I haven't looked into why
  globalSetup: require.resolve("./e2e/globalSetup"),
  testMatch: /.*\.e2e\.ts/,
//  timeout: 1000,
};
export default config;
