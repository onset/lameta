import { describe, it, expect } from "vitest";
import * as Path from "path";
import {
  assertPlainJson,
  getProjectSettingsPath,
  PROJECT_SETTINGS_MAX_BYTES,
  serializeProjectSettings,
} from "./projectSettings";

describe("getProjectSettingsPath", () => {
  it("puts the file in the plugin's plugin-data folder in the project folder", () => {
    expect(getProjectSettingsPath("/proj", "org.example.a")).toBe(
      Path.join("/proj", "plugin-data", "org.example.a", "project-settings.json"),
    );
  });
});

describe("assertPlainJson", () => {
  it("accepts nested plain JSON", () => {
    expect(() =>
      assertPlainJson({ a: [1, "two", true, null, { b: -3.5 }], c: Object.create(null) }),
    ).not.toThrow();
  });

  it.each([
    ["undefined", { a: undefined }],
    ["a Date", { a: new Date() }],
    ["a Map", { a: new Map() }],
    ["a typed array", { a: new Uint8Array(2) }],
    ["a function", { a: () => 1 }],
    ["Infinity", { a: Infinity }],
    ["a bigint", { a: BigInt(1) }],
  ])("rejects %s", (_name, value) => {
    expect(() => assertPlainJson(value)).toThrow();
  });

  it("rejects a cycle", () => {
    const a: any = { b: {} };
    a.b.a = a;
    expect(() => assertPlainJson(a)).toThrow(/nested/);
  });

  it("names where the bad value is", () => {
    expect(() => assertPlainJson({ columns: [{ font: new Date() }] })).toThrow(
      /value\.columns\[0\]\.font/,
    );
  });
});

describe("serializeProjectSettings", () => {
  it("writes indented JSON", () => {
    expect(serializeProjectSettings({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("measures the limit in UTF-8 bytes", () => {
    // each "é" is two bytes, so this is under the limit in characters but over it in bytes
    const s = "é".repeat(PROJECT_SETTINGS_MAX_BYTES / 2);
    expect(() => serializeProjectSettings(s)).toThrow(/limit/);
    expect(() => serializeProjectSettings("é".repeat(1000))).not.toThrow();
  });
});
