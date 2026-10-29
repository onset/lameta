import fs from "fs";
import path from "path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const { userSettingsMock } = vi.hoisted(() => ({
  userSettingsMock: { UILanguage: "en" }
}));

vi.mock("./UserSettings", () => ({
  default: userSettingsMock
}));

// The catalogs that lingui compiles into locale/<folder>/*.js are gitignored, so on a
// fresh checkout there are none. Point the lookup at catalogs this spec writes itself,
// so it tests the folder resolution instead of whatever "yarn strings:compile" last
// produced on this machine.
vi.mock("./locateDependency", () => ({
  locateDependencyForFilesystemCall: (relativePath: string) =>
    path.join(process.cwd(), "tmp", "localization-spec", relativePath)
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

const fixtureRoot = () => path.join(process.cwd(), "tmp", "localization-spec");

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

describe("setUILanguage", () => {
  beforeAll(() => {
    fs.rmSync(fixtureRoot(), { recursive: true, force: true });
    // "zh" and "pt" are alias folders for the "zh-CN" and "pt-BR" UI locales, and
    // neither matches its locale code by case folding. That matters: Windows
    // filesystems are case-insensitive, so a "zh-cn" folder would answer an
    // existsSync for "zh-CN" and the alias table would never be consulted. With
    // "zh", both tests below pass only if the alias lookup is doing its job, on
    // every platform.
    writeCatalogsFor("zh");
    writeCatalogsFor("pt");
  });

  afterAll(() => {
    fs.rmSync(fixtureRoot(), { recursive: true, force: true });
  });

  beforeEach(() => {
    userSettingsMock.UILanguage = "en";
    vi.restoreAllMocks();
    sentryErrorFromStringMock.mockClear();
    logErrorMock.mockClear();
  });

  it("loads zh-CN catalogs from alias folders under the requested locale", () => {
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

  it("keeps pt-BR catalogs registered under pt-BR", () => {
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

  it("survives a locale whose catalogs have not been compiled", () => {
    const loadSpy = vi.spyOn(i18n, "load").mockImplementation(() => undefined);
    const activateSpy = vi
      .spyOn(i18n, "activate")
      .mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => setUILanguage("zxx-NoSuchFolder", false)).not.toThrow();

    expect(loadSpy).not.toHaveBeenCalled();
    expect(activateSpy).toHaveBeenCalledWith("zxx-NoSuchFolder");
  });

  it("reports a missing catalog to the log and to Sentry", () => {
    vi.spyOn(i18n, "load").mockImplementation(() => undefined);
    vi.spyOn(i18n, "activate").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    setUILanguage("zxx-NoSuchFolder", false);

    // one per catalog set: messages, fields, vocabularies
    expect(sentryErrorFromStringMock).toHaveBeenCalledTimes(3);
    expect(logErrorMock).toHaveBeenCalledTimes(3);
    expect(sentryErrorFromStringMock.mock.calls[0][0]).toContain(
      "zxx-NoSuchFolder"
    );
  });
});
