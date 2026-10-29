import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { userSettingsMock } = vi.hoisted(() => ({
  userSettingsMock: { UILanguage: "en" }
}));

vi.mock("./UserSettings", () => ({
  default: userSettingsMock
}));

vi.mock("./locateDependency", () => ({
  locateDependencyForFilesystemCall: (relativePath: string) =>
    path.join(process.cwd(), relativePath)
}));

vi.mock("../model/Project/AuthorityLists/AuthorityLists", () => ({
  loadOLACRoles: () => []
}));

import { i18n, setUILanguage } from "./localization";

describe("setUILanguage", () => {
  beforeEach(() => {
    userSettingsMock.UILanguage = "en";
    vi.restoreAllMocks();
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
});
// Needs the compiled catalogs ("yarn strings:compile").
describe("the translations each UI language ships with", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it.each(["es", "fr", "fa", "id", "ru", "pt-BR", "zh-CN"])(
    "%s translates field labels and the UI",
    (code) => {
      setUILanguage(code, false);
      expect(i18n._("Birth Year")).not.toBe("Birth Year");
      expect(i18n._("Title")).not.toBe("Title");
      expect(i18n._("Add Files")).not.toBe("Add Files");
    }
  );
});
