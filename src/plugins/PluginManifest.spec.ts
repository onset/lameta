import { describe, it, expect } from "vitest";
import { parsePluginManifest, localizeLabel } from "./PluginManifest";

const goodManifest = `{
  id: "org.example.waveform-annotator",
  name: "Waveform Annotator",
  version: "1.0.0",
  apiVersion: 1,
  description: "Annotate audio",
  author: "Example",
  tabs: [
    {
      id: "waveform",
      label: { en: "Waveform", fr: "Forme d'onde" },
      entry: "index.html",
      match: { lametaTypes: ["Audio"], extensions: ["WAV", ".mp3"] },
      claimDefault: true,
      defaultPriority: 100
    }
  ]
}`;

describe("parsePluginManifest", () => {
  it("parses a valid JSON5 manifest", () => {
    const result = parsePluginManifest(goodManifest);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.id).toBe("org.example.waveform-annotator");
    expect(result.manifest!.tabs).toHaveLength(1);
    expect(result.manifest!.tabs[0].claimDefault).toBe(true);
    expect(result.manifest!.tabs[0].defaultPriority).toBe(100);
  });

  it("lowercases and strips dots from extensions", () => {
    const result = parsePluginManifest(goodManifest);
    expect(result.manifest!.tabs[0].match!.extensions).toEqual(["wav", "mp3"]);
  });

  it("defaults claimDefault to false and defaultPriority to 0", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      tabs: [{ id: "t", label: "L", entry: "i.html", match: { extensions: ["x"] } }]
    }`);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.tabs[0].claimDefault).toBe(false);
    expect(result.manifest!.tabs[0].defaultPriority).toBe(0);
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
      tabs: [{ id: "t", label: "L", entry: "i.html" }]
    }`);
    expect(result.errors).toBeDefined();
    expect(result.errors!.join(" ")).toMatch(/id/);
  });

  it("requires name, version, apiVersion, and non-empty tabs", () => {
    const result = parsePluginManifest(`{ id: "a.b" }`);
    expect(result.errors).toBeDefined();
    const joined = result.errors!.join(" ");
    expect(joined).toMatch(/name/);
    expect(joined).toMatch(/version/);
    expect(joined).toMatch(/apiVersion/);
    expect(joined).toMatch(/tabs/);
  });

  it("requires apiVersion to be a number", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: "one",
      tabs: [{ id: "t", label: "L", entry: "i.html" }]
    }`);
    expect(result.errors!.join(" ")).toMatch(/apiVersion/);
  });

  it("validates each tab's required fields", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      tabs: [{ label: 123 }]
    }`);
    expect(result.errors).toBeDefined();
    const joined = result.errors!.join(" ");
    expect(joined).toMatch(/tabs\[0\]\.id/);
    expect(joined).toMatch(/tabs\[0\]\.label/);
    expect(joined).toMatch(/tabs\[0\]\.entry/);
  });

  it("rejects duplicate tab ids", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      tabs: [
        { id: "t", label: "L", entry: "i.html", match: { extensions: ["x"] } },
        { id: "t", label: "L2", entry: "j.html", match: { extensions: ["y"] } }
      ]
    }`);
    expect(result.errors!.join(" ")).toMatch(/duplicate tab id/);
  });

  it("accepts a tabProvider manifest with no static tabs (and normalizes handles.extensions)", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      tabProvider: { entry: "index.html", handles: { lametaTypes: ["Audio"], extensions: ["EAF"] } }
    }`);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.tabProvider!.entry).toBe("index.html");
    expect(result.manifest!.tabProvider!.handles!.extensions).toEqual(["eaf"]);
    expect(result.manifest!.tabs).toEqual([]);
  });

  it("requires tabProvider.entry when tabProvider is present", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      tabProvider: { handles: {} }
    }`);
    expect(result.errors!.join(" ")).toMatch(/tabProvider\.entry/);
  });

  it("errors when neither tabProvider nor tabs is declared", () => {
    const result = parsePluginManifest(
      `{ id: "a.b", name: "n", version: "1", apiVersion: 1 }`
    );
    expect(result.errors!.join(" ")).toMatch(/tabProvider|tabs/);
  });

  it("accepts a known permission and normalizes absent permissions to []", () => {
    const withPermission = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      permissions: ["companionFiles"],
      tabs: [{ id: "t", label: "L", entry: "i.html" }]
    }`);
    expect(withPermission.errors).toBeUndefined();
    expect(withPermission.manifest!.permissions).toEqual(["companionFiles"]);

    const without = parsePluginManifest(goodManifest);
    expect(without.manifest!.permissions).toEqual([]);
  });

  it("accepts the ffmpeg permission alongside companionFiles", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      permissions: ["companionFiles", "ffmpeg"],
      tabs: [{ id: "t", label: "L", entry: "i.html" }]
    }`);
    expect(result.errors).toBeUndefined();
    expect(result.manifest!.permissions).toEqual(["companionFiles", "ffmpeg"]);
  });

  it("rejects a non-array permissions value", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      permissions: "companionFiles",
      tabs: [{ id: "t", label: "L", entry: "i.html" }]
    }`);
    expect(result.errors!.join(" ")).toMatch(/permissions must be an array/);
  });

  it("rejects non-string permission entries", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      permissions: [42],
      tabs: [{ id: "t", label: "L", entry: "i.html" }]
    }`);
    expect(result.errors!.join(" ")).toMatch(/permissions\[0\] must be a string/);
  });

  it("rejects an unknown permission, naming the known set", () => {
    const result = parsePluginManifest(`{
      id: "a.b", name: "n", version: "1", apiVersion: 1,
      permissions: ["companionFiles", "totalWorldDomination"],
      tabs: [{ id: "t", label: "L", entry: "i.html" }]
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
        tabs: [{ id: "t", label: "L", entry: "i.html" }]
      })
    );
    expect(result.errors).toBeUndefined();
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
