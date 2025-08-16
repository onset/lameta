type TestEnvironment = {
  E2E: boolean; // Critical for Sentry error handling - prevents RendererTransport issues
  E2E_USER_SETTINGS_STORE_NAME: string;
  E2ERoot: string;
};

export function getTestEnvironment(): TestEnvironment {
  // Indexing instead of, e.g., `process.env` because vite replaces that with ({}). Bad vite!
  // NOTE: The E2E flag is crucial for preventing Sentry initialization issues in E2E tests
  const e = {
    E2E: !!process["env"]["E2E"],
    E2E_USER_SETTINGS_STORE_NAME:
      process["env"]["E2E_USER_SETTINGS_STORE_NAME"] || "",
    E2ERoot: process["env"]["E2ERoot"] || ""
  };
  //console.log("getTestEnvironment() = ", JSON.stringify(e, null, 2));
  return e;
}
