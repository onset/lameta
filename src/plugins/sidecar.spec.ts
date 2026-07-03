import { describe, it, expect } from "vitest";
import * as Path from "path";
import {
  isValidSidecarName,
  getPluginDataDir,
  getSidecarPath,
  parseSidecarName,
  DEFAULT_SIDECAR_NAME
} from "./sidecar";

describe("isValidSidecarName", () => {
  it("accepts safe names", () => {
    expect(isValidSidecarName("annotations")).toBe(true);
    expect(isValidSidecarName("my_data-2")).toBe(true);
  });
  it("rejects traversal and separators", () => {
    expect(isValidSidecarName("../evil")).toBe(false);
    expect(isValidSidecarName("a/b")).toBe(false);
    expect(isValidSidecarName("a\\b")).toBe(false);
    expect(isValidSidecarName("has space")).toBe(false);
    expect(isValidSidecarName("")).toBe(false);
  });
});

describe("getPluginDataDir", () => {
  it("nests under plugin-data/<pluginId>", () => {
    const dir = getPluginDataDir("/proj/Sessions/S1", "org.example.a");
    expect(dir).toBe(
      Path.join("/proj/Sessions/S1", "plugin-data", "org.example.a")
    );
  });
});

describe("getSidecarPath", () => {
  it("builds <file>.<name>.json under the plugin data dir", () => {
    const p = getSidecarPath(
      "/proj/Sessions/S1",
      "org.example.a",
      "ETR009_Careful.mp3",
      "annotations"
    );
    expect(p).toBe(
      Path.join(
        "/proj/Sessions/S1",
        "plugin-data",
        "org.example.a",
        "ETR009_Careful.mp3.annotations.json"
      )
    );
  });

  it("defaults the name to 'annotations'", () => {
    const p = getSidecarPath("/proj/S", "a.b", "f.wav");
    expect(p.endsWith(`f.wav.${DEFAULT_SIDECAR_NAME}.json`)).toBe(true);
  });

  it("throws on an invalid name", () => {
    expect(() =>
      getSidecarPath("/proj/S", "a.b", "f.wav", "../escape")
    ).toThrow(/Invalid sidecar name/);
  });
});

describe("parseSidecarName", () => {
  it("extracts the name segment for a matching sidecar", () => {
    expect(
      parseSidecarName("f.wav.annotations.json", "f.wav")
    ).toBe("annotations");
  });
  it("returns null for a non-matching basename", () => {
    expect(parseSidecarName("other.wav.annotations.json", "f.wav")).toBeNull();
    expect(parseSidecarName("f.wav.annotations.txt", "f.wav")).toBeNull();
    expect(parseSidecarName("f.wav.json", "f.wav")).toBeNull();
  });
});
