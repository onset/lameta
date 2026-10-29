import fs from "fs";
import path from "path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { userSettingsMock } = vi.hoisted(() => ({
  userSettingsMock: { UILanguage: "en" }
}));

vi.mock("./UserSettings", () => ({
  default: userSettingsMock
}));

// These tests are about which folder a locale's catalogs are found in, so they supply their
// own folders in a temporary directory instead of reading locale/. That is also why they are
// not in localization.spec.ts: the tests there need the real compiled catalogs, and one file
// cannot mock this module both ways.
vi.mock("./locateDependency", () => ({
  locateDependencyForFilesystemCall: (relativePath: string) =>
    path.join(process.cwd(), "tmp", "localization-aliases", relativePath)
}));

vi.mock("../model/Project/AuthorityLists/AuthorityLists", () => ({
  loadOLACRoles: () => []
}));

import { i18n, setUILanguage } from "./localization";

const fixtureRoot = () => path.join(process.cwd(), "tmp", "localization-aliases");

function writeCatalogsFor(folder: string) {
  const dir = path.join(fixtureRoot(), "locale", folder);
  fs.mkdirSync(dir, { recursive: true });
  for (const set of ["messages", "fields", "vocabularies"]) {
    fs.writeFileSync(
      path.join(dir, `${set}.js`),
      "/*eslint-disable*/module.exports={messages:{}};"
    );
  }
}

describe("finding a locale's catalogs under an alias folder", () => {
  beforeAll(() => {
    fs.rmSync(fixtureRoot(), { recursive: true, force: true });
    // Only the alias folders exist, and neither one matches its locale code by case folding.
    // That is the whole point: Windows and macOS filesystems are case-insensitive, so a
    // "zh-cn" folder would answer an existsSync for "zh-CN" and these tests would pass
    // without the alias table ever being read. With "zh" and "pt" they cannot.
    writeCatalogsFor("zh");
    writeCatalogsFor("pt");
  });

  afterAll(() => {
    fs.rmSync(fixtureRoot(), { recursive: true, force: true });
  });

  beforeEach(() => {
    userSettingsMock.UILanguage = "en";
    vi.restoreAllMocks();
  });

  it("loads zh-CN catalogs from the zh folder", () => {
    const loadSpy = vi.spyOn(i18n, "load").mockImplementation(() => undefined);
    const activateSpy = vi
      .spyOn(i18n, "activate")
      .mockImplementation(() => undefined);

    setUILanguage("zh-CN", false);

    expect(loadSpy).toHaveBeenCalledTimes(3);
    expect(loadSpy.mock.calls.map((call) => call[0])).toEqual([
      "zh-CN",
      "zh-CN",
      "zh-CN"
    ]);
    expect(activateSpy).toHaveBeenCalledWith("zh-CN");
    expect(userSettingsMock.UILanguage).toBe("zh-CN");
  });

  it("loads pt-BR catalogs from the pt folder, still registered under pt-BR", () => {
    const loadSpy = vi.spyOn(i18n, "load").mockImplementation(() => undefined);

    setUILanguage("pt-BR", false);

    expect(loadSpy).toHaveBeenCalledTimes(3);
    expect(loadSpy.mock.calls.map((call) => call[0])).toEqual([
      "pt-BR",
      "pt-BR",
      "pt-BR"
    ]);
    expect(userSettingsMock.UILanguage).toBe("pt-BR");
  });

  it("loads nothing when neither the locale's own folder nor its aliases are there", () => {
    const loadSpy = vi.spyOn(i18n, "load").mockImplementation(() => undefined);
    vi.spyOn(i18n, "activate").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    setUILanguage("es", false);

    expect(loadSpy).not.toHaveBeenCalled();
  });
});
