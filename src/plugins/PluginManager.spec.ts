import { describe, it, expect } from "vitest";
import { parseManifestForThisPlatform, platformMismatchMessage } from "./PluginManager";
import { parsePluginManifest } from "./PluginManifest";

const manifestFor = (platforms?: string[]) => `{
  id: "org.example.convert", name: "Convert", version: "1", apiVersion: 1,
  "infoUrl": "https://example.org",
  tabProvider: { entry: "i.html" },
  ${platforms ? `platforms: ${JSON.stringify(platforms)},` : ""}
}`;

describe("platform rejection", () => {
  it("loads a package built for this platform, or for every platform", () => {
    expect(parseManifestForThisPlatform(manifestFor(["darwin-arm64"]), "darwin-arm64").errors).toBe(
      undefined,
    );
    expect(parseManifestForThisPlatform(manifestFor(), "win32-x64").errors).toBeUndefined();
  });

  it("refuses a package built for other platforms, naming them and this computer", () => {
    const result = parseManifestForThisPlatform(
      manifestFor(["darwin-arm64", "darwin-x64"]),
      "win32-x64",
    );
    expect(result.manifest).toBeUndefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toContain("darwin-arm64, darwin-x64");
    expect(result.errors![0]).toContain("win32-x64");
  });

  it("reports manifest errors before the platform check", () => {
    const result = parseManifestForThisPlatform(
      `{ id: "a.b", platforms: ["win32-x64"] }`,
      "darwin-arm64",
    );
    expect(result.errors!.join(" ")).toMatch(/name is required/);
  });

  it("platformMismatchMessage is undefined when the package can run here", () => {
    const manifest = parsePluginManifest(manifestFor(["win32-x64"])).manifest!;
    expect(platformMismatchMessage(manifest, "win32-x64")).toBeUndefined();
    expect(platformMismatchMessage(manifest, "darwin-arm64")).toContain("win32-x64");
  });
});
