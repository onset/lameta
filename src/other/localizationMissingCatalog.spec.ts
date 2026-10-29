import fs from "fs";
import path from "path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { userSettingsMock } = vi.hoisted(() => ({
  userSettingsMock: { UILanguage: "en" }
}));

vi.mock("./UserSettings", () => ({
  default: userSettingsMock
}));

// These tests are about what happens when a catalog is *missing*, so they must not see
// whatever "yarn strings:compile" last produced in locale/. They get their own directory,
// which is why they live apart from localization.spec.ts: that file's tests need the real
// compiled catalogs, and one file cannot mock this module both ways.
vi.mock("./locateDependency", () => ({
  locateDependencyForFilesystemCall: (relativePath: string) =>
    path.join(process.cwd(), "tmp", "localization-missing-catalog", relativePath)
}));

vi.mock("../model/Project/AuthorityLists/AuthorityLists", () => ({
  loadOLACRoles: () => []
}));

const { sentryErrorFromStringMock, logErrorMock } = vi.hoisted(() => ({
  sentryErrorFromStringMock: vi.fn(),
  logErrorMock: vi.fn()
}));

vi.mock("./errorHandling", () => ({
  sentryErrorFromString: sentryErrorFromStringMock
}));

vi.mock("./log", () => ({
  default: { error: logErrorMock }
}));

import { i18n, setUILanguage } from "./localization";

const fixtureRoot = () =>
  path.join(process.cwd(), "tmp", "localization-missing-catalog");

describe("a UI language whose catalogs are not there", () => {
  afterAll(() => {
    fs.rmSync(fixtureRoot(), { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.rmSync(fixtureRoot(), { recursive: true, force: true });
    userSettingsMock.UILanguage = "en";
    vi.restoreAllMocks();
    sentryErrorFromStringMock.mockClear();
    logErrorMock.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("still sets the language instead of taking down startup", () => {
    const loadSpy = vi.spyOn(i18n, "load").mockImplementation(() => undefined);
    const activateSpy = vi
      .spyOn(i18n, "activate")
      .mockImplementation(() => undefined);

    expect(() => setUILanguage("zxx-NoSuchFolder", false)).not.toThrow();

    expect(loadSpy).not.toHaveBeenCalled();
    expect(activateSpy).toHaveBeenCalledWith("zxx-NoSuchFolder");
  });

  it("reports each missing catalog to the log and to Sentry", () => {
    vi.spyOn(i18n, "load").mockImplementation(() => undefined);
    vi.spyOn(i18n, "activate").mockImplementation(() => undefined);

    setUILanguage("zxx-NoSuchFolder", false);

    // one per catalog set: messages, fields, vocabularies
    expect(sentryErrorFromStringMock).toHaveBeenCalledTimes(3);
    expect(logErrorMock).toHaveBeenCalledTimes(3);
    expect(sentryErrorFromStringMock.mock.calls[0][0]).toContain(
      "zxx-NoSuchFolder"
    );
  });
});
