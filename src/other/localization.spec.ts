import path from "path";
import fs from "fs";
import PO from "pofile";
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
// setUILanguage loads the fields catalog after the messages catalog into one locale, so a
// field label's translation also replaces the UI's translation of the same English text.
describe("text that both the UI and a field label use", () => {
  it.each(["es", "fr", "fa", "id", "ru", "pt-BR", "zh-cn"])(
    "%s translates it the same way in both catalogs",
    (folder) => {
      const translations = (catalog: string) =>
        new Map(
          PO.parse(
            fs.readFileSync(
              path.join(process.cwd(), "locale", folder, `${catalog}.po`),
              "utf8"
            )
          ).items.map((item) => [item.msgid, item.msgstr[0] || ""])
        );
      const messages = translations("messages");
      const differing = [...translations("fields")].filter(
        ([id, str]) => str && messages.get(id) && messages.get(id) !== str
      );
      expect(differing).toEqual([]);
    }
  );
});
