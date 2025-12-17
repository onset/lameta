type TestEnvironment = {
  E2E: boolean; // Critical for Sentry error handling - prevents RendererTransport issues
  E2E_USER_SETTINGS_STORE_NAME: string;
  E2ERoot: string;
  // E2E fast project creation: when set, bypasses registration and start screen
  E2E_PROJECT_NAME: string; // If set, auto-create project with this name
  E2E_ARCHIVE_CONFIG: string; // If set, use this archive configuration (e.g., "ELAR")
};

export function getTestEnvironment(): TestEnvironment {
  // Indexing instead of, e.g., `process.env` because vite replaces that with ({}). Bad vite!
  // NOTE: The E2E flag is crucial for preventing Sentry initialization issues in E2E tests
  const e = {
    E2E: !!process["env"]["E2E"],
    E2E_USER_SETTINGS_STORE_NAME:
      process["env"]["E2E_USER_SETTINGS_STORE_NAME"] || "",
    E2ERoot: process["env"]["E2ERoot"] || "",
    E2E_PROJECT_NAME: process["env"]["E2E_PROJECT_NAME"] || "",
    E2E_ARCHIVE_CONFIG: process["env"]["E2E_ARCHIVE_CONFIG"] || ""
  };
  //console.log("getTestEnvironment() = ", JSON.stringify(e, null, 2));
  return e;
}
