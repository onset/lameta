import { vi } from "vitest";

vi.mock("@electron/remote", () => ({ exec: vi.fn(), process: vi.fn() })); //See commit msg for info
vi.mock("../../../index", () => ({
  getTestEnvironment: () => ({
    E2E: false,
    E2E_USER_SETTINGS_STORE_NAME: "",
    E2ERoot: ""
  })
}));
