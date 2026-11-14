// Native executables that a plugin carries inside its own package (manifest `binaries`).
//
// Pure path logic plus the post-install step. No electron imports, so it is unit-testable and
// usable from both the install dialog and the host bridge.

import Path from "path";
import fs from "fs-extra";
import { spawn as nodeSpawn } from "child_process";
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
 *  2. otherwise lameta's `fallbackPath` (the ffmpeg-ffprobe-static ffmpeg, present only in a
 *     development checkout), when it exists;
 *  3. otherwise an error saying the plugin does not include ffmpeg for this platform.
 */
export function resolveFfmpegPath(args: {
  pluginDirectory: string | undefined;
  binaries: PluginBinaries | undefined;
  platformKey: string;
  fallbackPath: string;
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
  if (exists(args.fallbackPath)) return args.fallbackPath;
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

/**
 * After a package is unpacked into `pluginDirectory`, make every binary the manifest names
 * runnable. extract-zip applies the Unix mode stored in the zip, and a zip made on Windows stores
 * none, so the file arrives as 0644: chmod each binary to 0755 on every platform except Windows.
 * On macOS also remove the `com.apple.quarantine` attribute so Gatekeeper does not block the
 * spawn; "No such xattr" means the file was never quarantined and is fine.
 */
export async function prepareInstalledBinaries(
  pluginDirectory: string,
  binaries: PluginBinaries | undefined,
  options: {
    platform?: string;
    run?: RunCommand;
    chmod?: (path: string, mode: number) => Promise<void>;
  } = {},
): Promise<void> {
  const platform = options.platform ?? process.platform;
  if (platform === "win32" || !binaries) return;
  const run = options.run ?? runCommand;
  const chmod = options.chmod ?? ((p: string, mode: number) => fs.chmod(p, mode));

  const paths = new Set<string>();
  for (const name of Object.keys(binaries))
    for (const platformKey of Object.keys(binaries[name])) {
      const full = pluginBinaryPath(pluginDirectory, binaries, name, platformKey);
      if (full && (await fs.pathExists(full))) paths.add(full);
    }

  for (const file of paths) {
    await chmod(file, 0o755);
    if (platform !== "darwin") continue;
    const { code, stderr } = await run("xattr", ["-d", "com.apple.quarantine", file]);
    if (code !== 0 && !/no such xattr/i.test(stderr))
      throw new Error(
        `Could not remove the quarantine attribute from ${file}: ${stderr.trim() || `exit ${code}`}`,
      );
  }
}
