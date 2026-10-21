type TestEnvironment = {
  E2E: boolean; // Critical for Sentry error handling - prevents RendererTransport issues
  E2E_USER_SETTINGS_STORE_NAME: string;
  E2ERoot: string;
  // E2E fast project creation: when set, bypasses registration and start screen
  E2E_PROJECT_NAME: string; // If set, auto-create project with this name
  E2E_ARCHIVE_CONFIG: string; // If set, use this archive configuration (e.g., "ELAR")
  // If set, start in this UI language, as though the user had chosen it in an earlier run
  E2E_UI_LANGUAGE: string;
  // Path to the JSON manifest that turns on the fake cloud provider (see fakeCloudProvider.ts)
  E2E_FAKE_CLOUD_PROVIDER: string;
  // The GitHub repo whose releases the update check reads, as owner/name. Lets a test build
  // hear about releases published somewhere other than onset/lameta.
  LAMETA_RELEASES_REPO: string;
};

export function getTestEnvironment(): TestEnvironment {
  const runtimeProcess = Reflect.get(globalThis as object, "process") as
    | { env?: Record<string, string | undefined> }
    | undefined;
  const runtimeEnv = runtimeProcess?.env || {};

  // NOTE: The E2E flag is crucial for preventing Sentry initialization issues in E2E tests
  const e = {
    E2E: !!runtimeEnv["E2E"],
    E2E_USER_SETTINGS_STORE_NAME: runtimeEnv["E2E_USER_SETTINGS_STORE_NAME"] || "",
    E2ERoot: runtimeEnv["E2ERoot"] || "",
    E2E_PROJECT_NAME: runtimeEnv["E2E_PROJECT_NAME"] || "",
    E2E_ARCHIVE_CONFIG: runtimeEnv["E2E_ARCHIVE_CONFIG"] || "",
    E2E_UI_LANGUAGE: runtimeEnv["E2E_UI_LANGUAGE"] || "",
    E2E_FAKE_CLOUD_PROVIDER: runtimeEnv["E2E_FAKE_CLOUD_PROVIDER"] || "",
    LAMETA_RELEASES_REPO: runtimeEnv["LAMETA_RELEASES_REPO"] || "onset/lameta",
  };
  //console.log("getTestEnvironment() = ", JSON.stringify(e, null, 2));
  return e;
}
