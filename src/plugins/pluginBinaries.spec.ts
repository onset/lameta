import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs-extra";
import * as os from "os";
import * as Path from "path";
import {
  pluginBinaryPath,
  prepareInstalledBinaries,
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
        fallbackPath,
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
        fallbackPath,
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
        fallbackPath,
        exists: (p) => p === fallbackPath,
      }),
    ).toBe(fallbackPath);
    expect(
      resolveFfmpegPath({
        pluginDirectory: undefined,
        binaries: undefined,
        platformKey: "win32-x64",
        fallbackPath,
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
        fallbackPath,
        exists: () => false,
      }),
    ).toThrow(/does not include ffmpeg for this platform \(linux-x64\)/);
  });
});

describe("prepareInstalledBinaries", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-plugin-bin-"));
    fs.outputFileSync(Path.join(dir, "bin", "mac-arm", "ffmpeg"), "x");
    fs.outputFileSync(Path.join(dir, "bin", "mac-intel", "ffmpeg"), "x");
    // bin/ffmpeg.exe is named for Windows but not in this package: it is skipped.
  });
  afterEach(() => fs.removeSync(dir));

  const arm = () => Path.join(dir, "bin", "mac-arm", "ffmpeg");
  const intel = () => Path.join(dir, "bin", "mac-intel", "ffmpeg");

  it("on macOS, makes each present binary executable and removes its quarantine", async () => {
    const chmod = vi.fn(async () => {});
    const run = vi.fn(async () => ({ code: 0, stderr: "" }));
    await prepareInstalledBinaries(dir, binaries, { platform: "darwin", chmod, run });
    expect(chmod.mock.calls).toEqual(
      expect.arrayContaining([
        [arm(), 0o755],
        [intel(), 0o755],
      ]),
    );
    expect(chmod).toHaveBeenCalledTimes(2);
    expect(run.mock.calls).toEqual(
      expect.arrayContaining([
        ["xattr", ["-d", "com.apple.quarantine", arm()]],
        ["xattr", ["-d", "com.apple.quarantine", intel()]],
      ]),
    );
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("ignores a binary that was never quarantined", async () => {
    const run = vi.fn(async (_c: string, args: string[]) => ({
      code: 1,
      stderr: `xattr: ${args[2]}: No such xattr: com.apple.quarantine`,
    }));
    await expect(
      prepareInstalledBinaries(dir, binaries, {
        platform: "darwin",
        chmod: async () => {},
        run,
      }),
    ).resolves.toBeUndefined();
  });

  it("fails when the quarantine cannot be removed for another reason", async () => {
    const run = vi.fn(async () => ({
      code: 1,
      stderr: "xattr: [Errno 1] Operation not permitted",
    }));
    await expect(
      prepareInstalledBinaries(dir, binaries, { platform: "darwin", chmod: async () => {}, run }),
    ).rejects.toThrow(/quarantine.*Operation not permitted/);
  });

  it("on Linux, only makes binaries executable", async () => {
    const chmod = vi.fn(async () => {});
    const run = vi.fn(async () => ({ code: 0, stderr: "" }));
    await prepareInstalledBinaries(dir, binaries, { platform: "linux", chmod, run });
    expect(chmod).toHaveBeenCalledTimes(2);
    expect(run).not.toHaveBeenCalled();
  });

  it("on Windows, does nothing", async () => {
    const chmod = vi.fn(async () => {});
    const run = vi.fn(async () => ({ code: 0, stderr: "" }));
    await prepareInstalledBinaries(dir, binaries, { platform: "win32", chmod, run });
    expect(chmod).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("does nothing for a plugin without binaries", async () => {
    const chmod = vi.fn(async () => {});
    await prepareInstalledBinaries(dir, undefined, { platform: "darwin", chmod });
    expect(chmod).not.toHaveBeenCalled();
  });

  // Windows has no Unix modes to check.
  it.skipIf(process.platform === "win32")("sets mode 0755 with the default chmod", async () => {
    await prepareInstalledBinaries(dir, binaries, {
      platform: "linux",
      run: async () => ({ code: 0, stderr: "" }),
    });
    expect(fs.statSync(arm()).mode & 0o777).toBe(0o755);
  });
});
