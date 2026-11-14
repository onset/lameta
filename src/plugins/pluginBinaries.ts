// Native executables that a plugin carries inside its own package (manifest `binaries`).
//
// Pure path logic, the install-time check that a package contains its binaries, and the step that
// makes a binary runnable before it is spawned. No electron imports, so it is unit-testable and
// usable from both the install dialog and the host bridge.

import Path from "path";
import fs from "fs-extra";
import { spawn as nodeSpawn } from "child_process";
import { i18n } from "@lingui/core";
import { t } from "@lingui/core/macro";
import { PluginBinaries } from "./PluginManifest";

/**
 * The absolute path of the plugin's `name` binary for `platformKey`, or undefined when the
 * manifest names none. The manifest parser already rejects paths that climb out of the plugin
 * folder; containment is checked again here because this path is about to be spawned.
 */
export function pluginBinaryPath(
  pluginDirectory: string,
  binaries: PluginBinaries | undefined,
  name: string,
  platformKey: string,
): string | undefined {
  const rel = binaries?.[name]?.[platformKey];
  if (!rel) return undefined;
  const root = Path.resolve(pluginDirectory);
  const full = Path.resolve(root, rel);
  const fromRoot = Path.relative(root, full);
  if (!fromRoot || fromRoot.startsWith("..") || Path.isAbsolute(fromRoot))
    throw new Error(`The plugin's ${name} path "${rel}" is outside the plugin folder`);
  return full;
}

/**
 * Which ffmpeg `ffmpeg.run` spawns for a plugin:
 *  1. the plugin's own ffmpeg for this platform, when its manifest names one (it must exist);
 *  2. otherwise lameta's ffmpeg from `fallbackPath()` (the ffmpeg-ffprobe-static ffmpeg, present
 *     only in a development checkout), when it exists;
 *  3. otherwise an error saying the plugin does not include ffmpeg for this platform.
 * `fallbackPath` is called only when the plugin names no ffmpeg for this platform, because
 * finding lameta's own path costs a synchronous call to the main process.
 */
export function resolveFfmpegPath(args: {
  pluginDirectory: string | undefined;
  binaries: PluginBinaries | undefined;
  platformKey: string;
  fallbackPath: () => string;
  exists?: (path: string) => boolean;
}): string {
  const exists = args.exists ?? ((p: string) => fs.existsSync(p));
  const own = args.pluginDirectory
    ? pluginBinaryPath(args.pluginDirectory, args.binaries, "ffmpeg", args.platformKey)
    : undefined;
  if (own) {
    if (!exists(own))
      throw new Error(
        `The plugin's ffmpeg for ${args.platformKey} is missing: ${own} does not exist`,
      );
    return own;
  }
  const fallback = args.fallbackPath();
  if (exists(fallback)) return fallback;
  throw new Error(`This plugin does not include ffmpeg for this platform (${args.platformKey})`);
}

/** Runs a command and resolves with its exit code and stderr. Injected so tests can mock it. */
export type RunCommand = (
  command: string,
  args: string[],
) => Promise<{ code: number | null; stderr: string }>;

const runCommand: RunCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const child = nodeSpawn(command, args);
    let stderr = "";
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr }));
  });

export type PrepareBinaryOptions = {
  platform?: string;
  run?: RunCommand;
  chmod?: (path: string, mode: number) => Promise<void>;
};

/**
 * Make one binary runnable. extract-zip applies the Unix mode stored in the zip, and a zip made
 * on Windows stores none, so a binary can arrive as 0644; a hand-copied plugin can lack the mode
 * too. So chmod it to 0755 on every platform except Windows. On macOS also remove the
 * `com.apple.quarantine` attribute so Gatekeeper does not block the spawn; "No such xattr" means
 * the file was never quarantined and is fine.
 */
export async function prepareBinary(
  file: string,
  options: PrepareBinaryOptions = {},
): Promise<void> {
  const platform = options.platform ?? process.platform;
  if (platform === "win32") return;
  const run = options.run ?? runCommand;
  const chmod = options.chmod ?? ((p: string, mode: number) => fs.chmod(p, mode));
  await chmod(file, 0o755);
  if (platform !== "darwin") return;
  const { code, stderr } = await run("xattr", ["-d", "com.apple.quarantine", file]);
  if (code !== 0 && !/no such xattr/i.test(stderr))
    throw new Error(
      `Could not remove the quarantine attribute from ${file}: ${stderr.trim() || `exit ${code}`}`,
    );
}

/**
 * The message that refuses to install a package whose manifest names a binary for `platformKey`
 * that the unpacked package in `pluginDirectory` does not contain, or undefined when every such
 * binary is present.
 */
export function missingBinaryMessage(
  pluginDirectory: string,
  binaries: PluginBinaries | undefined,
  platformKey: string,
  exists: (path: string) => boolean = (p) => fs.existsSync(p),
): string | undefined {
  for (const name of Object.keys(binaries ?? {})) {
    const full = pluginBinaryPath(pluginDirectory, binaries, name, platformKey);
    if (!full || exists(full)) continue;
    const rel = binaries![name][platformKey];
    return i18n._(
      t`This plugin package is missing ${rel}, the ${name} that its manifest names for ${platformKey}. Get a complete package from the plugin's author.`,
    );
  }
  return undefined;
}
