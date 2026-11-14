import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs-extra";
import * as os from "os";
import * as Path from "path";
import {
  missingBinaryMessage,
  pluginBinaryPath,
  prepareBinary,
  resolveFfmpegPath,
} from "./pluginBinaries";
import { PluginBinaries } from "./PluginManifest";

const binaries: PluginBinaries = {
  ffmpeg: {
    "win32-x64": "bin/ffmpeg.exe",
    "darwin-arm64": "bin/mac-arm/ffmpeg",
    "darwin-x64": "bin/mac-intel/ffmpeg",
  },
};
const pluginDir = Path.resolve("/plugins/org.example.convert");

describe("pluginBinaryPath", () => {
  it("resolves each platform's binary inside the plugin folder", () => {
    expect(pluginBinaryPath(pluginDir, binaries, "ffmpeg", "win32-x64")).toBe(
      Path.join(pluginDir, "bin", "ffmpeg.exe"),
    );
    expect(pluginBinaryPath(pluginDir, binaries, "ffmpeg", "darwin-arm64")).toBe(
      Path.join(pluginDir, "bin", "mac-arm", "ffmpeg"),
    );
    expect(pluginBinaryPath(pluginDir, binaries, "ffmpeg", "darwin-x64")).toBe(
      Path.join(pluginDir, "bin", "mac-intel", "ffmpeg"),
    );
  });

  it("is undefined for a platform or binary the manifest does not name", () => {
    expect(pluginBinaryPath(pluginDir, binaries, "ffmpeg", "linux-x64")).toBeUndefined();
    expect(pluginBinaryPath(pluginDir, binaries, "sox", "win32-x64")).toBeUndefined();
    expect(pluginBinaryPath(pluginDir, undefined, "ffmpeg", "win32-x64")).toBeUndefined();
  });

  it("refuses a path that escapes the plugin folder", () => {
    expect(() =>
      pluginBinaryPath(
        pluginDir,
        { ffmpeg: { "win32-x64": "../x/ffmpeg.exe" } },
        "ffmpeg",
        "win32-x64",
      ),
    ).toThrow(/outside the plugin folder/);
  });
});

describe("resolveFfmpegPath", () => {
  const fallbackPath = Path.resolve("/lameta/node_modules/ffmpeg-ffprobe-static/ffmpeg");
  const own = Path.join(pluginDir, "bin", "mac-arm", "ffmpeg");

  it("uses the plugin's own ffmpeg when the manifest names one and it exists", () => {
    const exists = (p: string) => p === own || p === fallbackPath;
    expect(
      resolveFfmpegPath({
        pluginDirectory: pluginDir,
        binaries,
        platformKey: "darwin-arm64",
        fallbackPath: () => fallbackPath,
        exists,
      }),
    ).toBe(own);
  });

  it("fails, without falling back, when the named ffmpeg is missing", () => {
    expect(() =>
      resolveFfmpegPath({
        pluginDirectory: pluginDir,
        binaries,
        platformKey: "darwin-arm64",
        fallbackPath: () => fallbackPath,
        exists: (p) => p === fallbackPath,
      }),
    ).toThrow(/ffmpeg for darwin-arm64 is missing/);
  });

  it("falls back to lameta's ffmpeg when the manifest names none for this platform", () => {
    expect(
      resolveFfmpegPath({
        pluginDirectory: pluginDir,
        binaries,
        platformKey: "linux-x64",
        fallbackPath: () => fallbackPath,
        exists: (p) => p === fallbackPath,
      }),
    ).toBe(fallbackPath);
    expect(
      resolveFfmpegPath({
        pluginDirectory: undefined,
        binaries: undefined,
        platformKey: "win32-x64",
        fallbackPath: () => fallbackPath,
        exists: (p) => p === fallbackPath,
      }),
    ).toBe(fallbackPath);
  });

  it("says the plugin does not include ffmpeg for this platform when neither exists", () => {
    expect(() =>
      resolveFfmpegPath({
        pluginDirectory: pluginDir,
        binaries,
        platformKey: "linux-x64",
        fallbackPath: () => fallbackPath,
        exists: () => false,
      }),
    ).toThrow(/does not include ffmpeg for this platform \(linux-x64\)/);
  });
});

describe("prepareBinary", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-plugin-bin-"));
    fs.outputFileSync(Path.join(dir, "bin", "mac-arm", "ffmpeg"), "x");
  });
  afterEach(() => fs.removeSync(dir));

  const arm = () => Path.join(dir, "bin", "mac-arm", "ffmpeg");

  it("on macOS, makes the binary executable and removes its quarantine", async () => {
    const chmod = vi.fn(async () => {});
    const run = vi.fn(async () => ({ code: 0, stderr: "" }));
    await prepareBinary(arm(), { platform: "darwin", chmod, run });
    expect(chmod.mock.calls).toEqual([[arm(), 0o755]]);
    expect(run.mock.calls).toEqual([["xattr", ["-d", "com.apple.quarantine", arm()]]]);
  });

  it("ignores a binary that was never quarantined", async () => {
    const run = vi.fn(async (_c: string, args: string[]) => ({
      code: 1,
      stderr: `xattr: ${args[2]}: No such xattr: com.apple.quarantine`,
    }));
    await expect(
      prepareBinary(arm(), { platform: "darwin", chmod: async () => {}, run }),
    ).resolves.toBeUndefined();
  });

  it("fails when the quarantine cannot be removed for another reason", async () => {
    const run = vi.fn(async () => ({
      code: 1,
      stderr: "xattr: [Errno 1] Operation not permitted",
    }));
    await expect(
      prepareBinary(arm(), { platform: "darwin", chmod: async () => {}, run }),
    ).rejects.toThrow(/quarantine.*Operation not permitted/);
  });

  it("on Linux, only makes the binary executable", async () => {
    const chmod = vi.fn(async () => {});
    const run = vi.fn(async () => ({ code: 0, stderr: "" }));
    await prepareBinary(arm(), { platform: "linux", chmod, run });
    expect(chmod.mock.calls).toEqual([[arm(), 0o755]]);
    expect(run).not.toHaveBeenCalled();
  });

  it("on Windows, does nothing", async () => {
    const chmod = vi.fn(async () => {});
    const run = vi.fn(async () => ({ code: 0, stderr: "" }));
    await prepareBinary(arm(), { platform: "win32", chmod, run });
    expect(chmod).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  // Windows has no Unix modes to check.
  it.skipIf(process.platform === "win32")("sets mode 0755 with the default chmod", async () => {
    await prepareBinary(arm(), {
      platform: "linux",
      run: async () => ({ code: 0, stderr: "" }),
    });
    expect(fs.statSync(arm()).mode & 0o777).toBe(0o755);
  });
});

describe("missingBinaryMessage", () => {
  const arm = Path.join(pluginDir, "bin", "mac-arm", "ffmpeg");

  it("names the relative path of this platform's binary when the package lacks it", () => {
    const message = missingBinaryMessage(pluginDir, binaries, "darwin-arm64", () => false);
    expect(message).toContain("bin/mac-arm/ffmpeg");
    expect(message).toContain("darwin-arm64");
  });

  it("is undefined when this platform's binary is in the package, whatever else is missing", () => {
    expect(missingBinaryMessage(pluginDir, binaries, "darwin-arm64", (p) => p === arm)).toBe(
      undefined,
    );
  });

  it("is undefined when the manifest names no binary for this platform", () => {
    expect(missingBinaryMessage(pluginDir, binaries, "linux-x64", () => false)).toBeUndefined();
  });

  it("is undefined for a plugin without binaries", () => {
    expect(missingBinaryMessage(pluginDir, undefined, "win32-x64", () => false)).toBeUndefined();
  });

  it("checks the real file system by default", () => {
    const dir = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-plugin-bin-"));
    try {
      expect(missingBinaryMessage(dir, binaries, "win32-x64")).toContain("bin/ffmpeg.exe");
      fs.outputFileSync(Path.join(dir, "bin", "ffmpeg.exe"), "x");
      expect(missingBinaryMessage(dir, binaries, "win32-x64")).toBeUndefined();
    } finally {
      fs.removeSync(dir);
    }
  });
});
