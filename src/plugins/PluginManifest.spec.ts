import { describe, it, expect } from "vitest";
import {
  parsePluginManifest,
  localizeLabel,
  currentPlatformKey,
  supportsPlatform,
} from "./PluginManifest";

const goodManifest = `{
  id: "org.example.waveform-annotator",
  name: "Waveform Annotator",
  version: "1.0.0",
  apiVersion: 1,
  description: "Annotate audio",
  author: "Example",
  "infoUrl": "https://example.org/waveform",
  tabProvider: {
    entry: "index.html",
    handles: { lametaTypes: ["Audio"], extensions: ["WAV", ".mp3"] }
  }
}`;

describe("parsePluginManifest", () => {
  it("parses a valid JSON5 manifest", () => {
    const result = parsePluginManifest(goodManifest);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.id).toBe("org.example.waveform-annotator");
    expect(result.manifest!.tabProvider.entry).toBe("index.html");
  });

  it("lowercases and strips dots from extensions", () => {
    const result = parsePluginManifest(goodManifest);
    expect(result.manifest!.tabProvider.handles!.extensions).toEqual(["wav", "mp3"]);
  });

  it("accepts a required infoUrl and an optional plugin-level label", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      label: { en: "Nice Name", es: "Buen nombre" },
      "infoUrl": "https://example.org/about",
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.label).toEqual({
      en: "Nice Name",
      es: "Buen nombre",
    });
    expect(result.manifest!.infoUrl).toBe("https://example.org/about");
  });

  it("leaves label undefined when absent (infoUrl still required)", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      "infoUrl": "https://example.org/about",
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.label).toBeUndefined();
  });

  it("requires infoUrl", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors).toBeDefined();
    expect(result.errors!.join(" ")).toMatch(/infoUrl is required/);
  });

  it("rejects a non-string infoUrl and an empty label", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      label: "", "infoUrl": 7,
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors).toBeDefined();
    expect(result.errors!.join(" ")).toMatch(/infoUrl is required/);
    expect(result.errors!.join(" ")).toMatch(/label must not be an empty string/);
  });

  it("reports a parse error for malformed text", () => {
    const result = parsePluginManifest("{ this is not json ");
    expect(result.manifest).toBeUndefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0]).toMatch(/parse/i);
  });

  it("rejects a bad id", () => {
    const result = parsePluginManifest(`{
      id: "Bad Id!", name: "n", version: "1", apiVersion: 1,
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors).toBeDefined();
    expect(result.errors!.join(" ")).toMatch(/id/);
  });

  it("requires name, version, apiVersion, and a tabProvider", () => {
    const result = parsePluginManifest(`{ id: "a.b" }`);
    expect(result.errors).toBeDefined();
    const joined = result.errors!.join(" ");
    expect(joined).toMatch(/name/);
    expect(joined).toMatch(/version/);
    expect(joined).toMatch(/apiVersion/);
    expect(joined).toMatch(/tabProvider/);
  });

  it("requires apiVersion to be a number", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: "one",
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors!.join(" ")).toMatch(/apiVersion/);
  });

  it("accepts a tabProvider manifest (and normalizes handles.extensions)", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      "infoUrl": "https://example.org",
      tabProvider: { entry: "index.html", handles: { lametaTypes: ["Audio"], extensions: ["EAF"] } }
    }`);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.tabProvider!.entry).toBe("index.html");
    expect(result.manifest!.tabProvider!.handles!.extensions).toEqual(["eaf"]);
  });

  it("requires tabProvider.entry when tabProvider is present", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      tabProvider: { handles: {} }
    }`);
    expect(result.errors!.join(" ")).toMatch(/tabProvider\.entry/);
  });

  it("errors when no tabProvider is declared", () => {
    const result = parsePluginManifest(`{ id: "a.b", name: "n", version: "1", apiVersion: 1 }`);
    expect(result.errors!.join(" ")).toMatch(/tabProvider/);
  });

  it("rejects a manifest whose only tabs are a static tabs list", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      "infoUrl": "https://example.org",
      tabs: [{ id: "t", label: "L", entry: "i.html", match: { lametaTypes: ["Audio"] } }]
    }`);
    expect(result.manifest).toBeUndefined();
    expect(result.errors!.join(" ")).toMatch(/tabProvider/);
  });

  it("rejects a static tabs list even alongside a tabProvider", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      "infoUrl": "https://example.org",
      tabProvider: { entry: "index.html" },
      tabs: [{ id: "t", label: "L", entry: "i.html" }]
    }`);
    expect(result.manifest).toBeUndefined();
    expect(result.errors!.join(" ")).toMatch(/\btabs\b/);
  });

  it("accepts a known permission and normalizes absent permissions to []", () => {
    const withPermission = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      "infoUrl": "https://example.org",
      permissions: ["companionFiles"],
      tabProvider: { entry: "i.html" }
    }`);
    expect(withPermission.errors).toBeUndefined();
    expect(withPermission.manifest!.permissions).toEqual(["companionFiles"]);

    const without = parsePluginManifest(goodManifest);
    expect(without.manifest!.permissions).toEqual([]);
  });

  it("accepts the ffmpeg permission alongside companionFiles", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      "infoUrl": "https://example.org",
      permissions: ["companionFiles", "ffmpeg"],
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.permissions).toEqual(["companionFiles", "ffmpeg"]);
  });

  it("accepts the saveFile and projectSettings permissions", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      "infoUrl": "https://example.org",
      permissions: ["saveFile", "projectSettings"],
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.permissions).toEqual(["saveFile", "projectSettings"]);
  });

  it("rejects a non-array permissions value", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      permissions: "companionFiles",
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors!.join(" ")).toMatch(/permissions must be an array/);
  });

  it("rejects non-string permission entries", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      permissions: [42],
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors!.join(" ")).toMatch(/permissions\[0\] must be a string/);
  });

  it("rejects an unknown permission, naming the known set", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      permissions: ["companionFiles", "totalWorldDomination"],
      tabProvider: { entry: "i.html" }
    }`);
    expect(result.errors).toBeDefined();
    const joined = result.errors!.join(" ");
    expect(joined).toMatch(/totalWorldDomination/);
    expect(joined).toMatch(/known: companionFiles/);
  });

  it("accepts plain JSON too", () => {
    const result = parsePluginManifest(
      JSON.stringify({
        id: "a.b",
        name: "n",
        version: "1",
        apiVersion: 1,
        infoUrl: "https://example.org",
        tabProvider: { entry: "i.html" },
      }),
    );
    expect(result.errors).toBeUndefined();
  });
});

const withExtra = (extra: string) => `{
  id: "a.b", name: "n", version: "1", apiVersion: 1,
  "infoUrl": "https://example.org",
  tabProvider: { entry: "i.html" },
  ${extra}
}`;

describe("parsePluginManifest — platforms and binaries", () => {
  it("leaves platforms and binaries undefined when absent", () => {
    const result = parsePluginManifest(withExtra(""));
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.platforms).toBeUndefined();
    expect(result.manifest!.binaries).toBeUndefined();
  });

  it("accepts known platforms and per-platform binary paths, normalizing backslashes", () => {
    const result = parsePluginManifest(
      withExtra(`platforms: ["darwin-arm64", "darwin-x64"],
        binaries: { ffmpeg: { "win32-x64": "bin\\\\ffmpeg.exe", "darwin-arm64": "bin/ffmpeg", "darwin-x64": "bin/ffmpeg" } }`),
    );
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.platforms).toEqual(["darwin-arm64", "darwin-x64"]);
    expect(result.manifest!.binaries).toEqual({
      ffmpeg: {
        "win32-x64": "bin/ffmpeg.exe",
        "darwin-arm64": "bin/ffmpeg",
        "darwin-x64": "bin/ffmpeg",
      },
    });
  });

  it("rejects an unknown platform in platforms, naming the known set", () => {
    const result = parsePluginManifest(withExtra(`platforms: ["win32-x64", "amiga-68k"]`));
    const joined = result.errors!.join(" ");
    expect(joined).toMatch(/platforms\[1\] "amiga-68k" is not a known platform/);
    expect(joined).toMatch(/known: win32-x64/);
  });

  it("rejects an empty or non-array platforms", () => {
    expect(parsePluginManifest(withExtra(`platforms: []`)).errors!.join(" ")).toMatch(
      /platforms must be a non-empty array/,
    );
    expect(parsePluginManifest(withExtra(`platforms: "win32-x64"`)).errors!.join(" ")).toMatch(
      /platforms must be a non-empty array/,
    );
  });

  it("rejects an unknown platform key in binaries", () => {
    const result = parsePluginManifest(
      withExtra(`binaries: { ffmpeg: { "windows": "ffmpeg.exe" } }`),
    );
    expect(result.errors!.join(" ")).toMatch(/binaries\.ffmpeg\."windows" is not a known platform/);
  });

  it("rejects an unknown binary name", () => {
    const result = parsePluginManifest(withExtra(`binaries: { sox: { "win32-x64": "sox.exe" } }`));
    expect(result.errors!.join(" ")).toMatch(/binaries\.sox is not a known binary/);
  });

  it.each([["null"], ["3"], ["{}"]])(
    "rejects a binary path of %s with a manifest error",
    (value) => {
      const result = parsePluginManifest(
        withExtra(`binaries: { ffmpeg: { "darwin-arm64": ${value} } }`),
      );
      expect(result.errors!.join(" ")).toMatch(
        /binaries\.ffmpeg\."darwin-arm64" must be a relative path/,
      );
    },
  );

  it("rejects binaries that are not objects", () => {
    expect(parsePluginManifest(withExtra(`binaries: ["ffmpeg"]`)).errors!.join(" ")).toMatch(
      /binaries must be an object/,
    );
    expect(
      parsePluginManifest(withExtra(`binaries: { ffmpeg: "ffmpeg.exe" }`)).errors!.join(" "),
    ).toMatch(/binaries\.ffmpeg must be an object/);
  });

  it.each([
    ["../ffmpeg.exe"],
    ["bin/../../ffmpeg.exe"],
    ["bin\\\\..\\\\..\\\\ffmpeg.exe"],
    ["/usr/bin/ffmpeg"],
    ["C:/tools/ffmpeg.exe"],
    ["c:\\\\tools\\\\ffmpeg.exe"],
    ["\\\\\\\\server\\\\share\\\\ffmpeg.exe"],
    [""],
    ["bin//ffmpeg.exe"],
  ])("rejects the binary path %s", (path) => {
    const result = parsePluginManifest(
      withExtra(`binaries: { ffmpeg: { "win32-x64": "${path}" } }`),
    );
    expect(result.errors).toBeDefined();
    expect(result.errors!.join(" ")).toMatch(/must be a relative path inside the plugin folder/);
  });
});

describe("currentPlatformKey and supportsPlatform", () => {
  it("joins platform and arch", () => {
    expect(currentPlatformKey("darwin", "arm64")).toBe("darwin-arm64");
    expect(currentPlatformKey("win32", "x64")).toBe("win32-x64");
  });

  it("supports every platform when platforms is absent, otherwise only those listed", () => {
    const all = parsePluginManifest(withExtra("")).manifest!;
    const mac = parsePluginManifest(withExtra(`platforms: ["darwin-arm64"]`)).manifest!;
    expect(supportsPlatform(all, "win32-x64")).toBe(true);
    expect(supportsPlatform(mac, "darwin-arm64")).toBe(true);
    expect(supportsPlatform(mac, "win32-x64")).toBe(false);
  });
});

describe("localizeLabel", () => {
  it("returns a plain string label as-is", () => {
    expect(localizeLabel("Hello", "es")).toBe("Hello");
  });
  it("returns the requested language when present", () => {
    expect(localizeLabel({ en: "Waveform", fr: "Forme" }, "fr")).toBe("Forme");
  });
  it("falls back to the base language then en then any", () => {
    expect(localizeLabel({ en: "E", fr: "F" }, "fr-CA")).toBe("F");
    expect(localizeLabel({ en: "E", fr: "F" }, "de")).toBe("E");
    expect(localizeLabel({ zh: "Z" }, "de")).toBe("Z");
  });
});
