import { type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  globalSetup: require.resolve('./e2e/globalSetup'),
  testMatch: /.*\.e2e\.ts/,
};
export default config;