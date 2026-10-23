// Compares what this checkout of lameta exports with what an earlier version exported, by
// default the newest beta or release. See ../README.md, "Comparing exports".
//
//   pnpm run compare-exports [<tag>] [--out <folder>]
//
// It makes a git worktree of <tag> in <out>/lameta-<tag> and installs it the first time,
// generates the torture project with this checkout's generator for each version (loading a
// project writes into it, so each version gets its own), runs
// src/export/tortureProject.manual.spec.ts in each, and writes the differences to
// <out>/differences.txt. <out> defaults to tmp/compare-exports, which git ignores.
//
// A version too old to have the harness gets a copy of this checkout's, so its exporters must
// keep the names that the harness imports.

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { compareFolders, formatComparison, isEmpty, writeNormalizedCopy } from "./exportComparison";
import { generateTortureProject, kDefaultTortureProjectOptions } from "./generate-torture-project";
import { newestBetaOrRelease } from "./releaseTags";
import { kMaxPortableRelativePath } from "./writer";

const kHarness = "src/export/tortureProject.manual.spec.ts";
const kThisLameta = path.resolve(__dirname, "../..");
// the harness is one test, so more workers only cost memory
const kMaxWorkers = "--maxWorkers=1";
// short, so that the project's longest paths stay under Windows' limit (see writer.ts); the
// "ŋ" keeps a project name that is not ASCII
const kProjectFolderName = "Torture ŋ";

function usage(): never {
  console.error("Usage: tsx compare-exports.ts [<tag>] [--out <folder>]");
  process.exit(2);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function git(args: string[], cwd = kThisLameta): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) fail(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}

// Runs a command in a lameta worktree. `pnpm run` puts this worktree's node_modules/.bin
// first on the PATH, and its vp has no `env` command; the global vp has, and hands the rest
// to the vp of the worktree it runs in. Windows spells the variable "Path".
function runIn(lametaDir: string, command: string[], env: Record<string, string> = {}) {
  console.log(`In ${lametaDir}: ${command.join(" ")}`);
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const r = spawnSync(command[0], command.slice(1), {
    cwd: lametaDir,
    stdio: "inherit",
    // vp and npx are .cmd shims on Windows; no argument here needs quoting
    shell: process.platform === "win32",
    env: {
      ...process.env,
      [pathKey]: (process.env[pathKey] ?? "")
        .split(path.delimiter)
        .filter((dir) => !/node_modules[\\/]\.bin/.test(dir))
        .join(path.delimiter),
      ...env,
    },
  });
  if (r.status !== 0) fail(`That failed in ${lametaDir}`);
}

// A worktree left by an earlier comparison is used again, so its install is too
function provideWorktree(tag: string, dir: string) {
  const wanted = git(["rev-parse", `${tag}^{commit}`]);
  if (fs.existsSync(dir)) {
    if (git(["rev-parse", "HEAD"], dir) !== wanted)
      fail(`${dir} is not at ${tag}. Remove it with: git worktree remove --force "${dir}"`);
    return;
  }
  git(["worktree", "add", "--detach", dir, tag]);
}

// An install that failed or was stopped leaves a node_modules behind, so only this file,
// written once the install has finished, says that the worktree is ready
const kInstalledMarker = ".compare-exports-installed";

function provideInstall(lametaDir: string) {
  const marker = path.join(lametaDir, kInstalledMarker);
  if (fs.existsSync(marker)) return;
  if (fs.existsSync(path.join(lametaDir, "pnpm-lock.yaml"))) {
    runIn(lametaDir, ["vp", "install"]);
  } else {
    // Before pnpm, lameta used yarn 1. Its package.json names an older Node in "engines",
    // and its postinstall runs yarn again, so the engine check is turned off for both.
    const packageManager: string = readPackageJson(lametaDir).packageManager ?? "yarn@1.22.19";
    runIn(lametaDir, ["npx", "-y", packageManager, "install", "--frozen-lockfile"], {
      YARN_IGNORE_ENGINES: "true",
    });
  }
  fs.writeFileSync(marker, "");
}

function readPackageJson(lametaDir: string) {
  return JSON.parse(fs.readFileSync(path.join(lametaDir, "package.json"), "utf8"));
}

// Before Vite+, lameta ran vitest itself and imported its test API from "vitest"
function usesVitePlus(lametaDir: string): boolean {
  return fs.existsSync(path.join(lametaDir, "node_modules", "vite-plus"));
}

function isTrackedByGit(lametaDir: string, file: string): boolean {
  const r = spawnSync("git", ["-C", lametaDir, "ls-files", "--error-unmatch", file], {
    stdio: "ignore",
  });
  return r.status === 0;
}

function provideHarness(lametaDir: string) {
  if (isTrackedByGit(lametaDir, kHarness)) return;
  let text = fs.readFileSync(path.join(kThisLameta, kHarness), "utf8");
  if (!usesVitePlus(lametaDir)) text = text.replace('"vite-plus/test"', '"vitest"');
  fs.writeFileSync(path.join(lametaDir, kHarness), text);
  console.log(`Copied ${kHarness} into ${lametaDir}`);
}

function runHarness(lametaDir: string, projectDir: string, rawDir: string) {
  // vitest of the yarn era breaks on Node 24, so use the Node that the version names
  const command = usesVitePlus(lametaDir)
    ? ["vp", "test", "run", kHarness, kMaxWorkers]
    : [
        "vp",
        "env",
        "exec",
        "--node",
        readPackageJson(lametaDir).engines.node,
        "node",
        "node_modules/vitest/vitest.mjs",
        "run",
        kHarness,
        kMaxWorkers,
      ];
  runIn(lametaDir, command, { LAMETA_TORTURE_DIR: projectDir, LAMETA_TORTURE_OUT: rawDir });
}

// Generates the project, runs the version's exporters over it, and returns the folder of
// the normalized output
function exportWith(lametaDir: string, versionDir: string): string {
  fs.rmSync(versionDir, { recursive: true, force: true });
  const projectDir = path.join(versionDir, "project", kProjectFolderName);
  generateTortureProject({ folder: projectDir, ...kDefaultTortureProjectOptions });
  const rawDir = path.join(versionDir, "raw");
  const normalizedDir = path.join(versionDir, "normalized");
  provideHarness(lametaDir);
  runHarness(lametaDir, projectDir, rawDir);
  writeNormalizedCopy(rawDir, normalizedDir, { projectDir, lametaDir, outDir: rawDir });
  return normalizedDir;
}

function main(args: string[]) {
  const outAt = args.indexOf("--out");
  const outOption = outAt >= 0 ? args.splice(outAt, 2)[1] : undefined;
  if (outAt >= 0 && !outOption) usage();
  if (args.length > 1 || args.some((a) => a.startsWith("--"))) usage();
  const tag = args[0] ?? newestBetaOrRelease(git(["tag", "--list"]).split("\n"));
  if (!tag) fail("There is no beta or release tag to compare with.");
  const outDir = path.resolve(outOption ?? path.join(kThisLameta, "tmp", "compare-exports"));
  // The exporters, and the old version's tools, are not all long-path aware on Windows, so
  // the project's longest paths must stay under 260 characters there
  const longestPath =
    path.join(outDir, "before", "project", kProjectFolderName).length +
    1 +
    kMaxPortableRelativePath;
  if (process.platform === "win32" && longestPath >= 260)
    fail(
      `Under ${outDir} the project's longest paths would be ${longestPath} characters, over ` +
        `Windows' limit of 260. Give a shorter folder with --out, for example --out C:\\lameta-compare.`,
    );

  const beforeLameta = path.join(outDir, `lameta-${tag}`);
  provideWorktree(tag, beforeLameta);
  provideInstall(beforeLameta);
  const before = exportWith(beforeLameta, path.join(outDir, "before"));
  const after = exportWith(kThisLameta, path.join(outDir, "after"));

  // Versions that have the Problems checks write a lameta-source comment before most elements
  // of the IMDI that the IMDI view and the checks read (not of the IMDI that export writes).
  // Comparing with a version from before them, every such line would differ, which would hide
  // everything else.
  const comparison = compareFolders(before, after, { ignoreSourceComments: true });
  const head = git(["rev-parse", "--short", "HEAD"]);
  const report =
    `Exports of the torture project: ${tag} (before) and this checkout at ${head} (after).\n` +
    `Each line is a changed line, or a changed CSV cell, with the number of files it is in.\n` +
    `Output of each version: ${path.join(outDir, "before")} and ${path.join(outDir, "after")}\n\n` +
    (isEmpty(comparison) ? "No differences." : formatComparison(comparison)) +
    "\n";
  const reportPath = path.join(outDir, "differences.txt");
  fs.writeFileSync(reportPath, report);
  console.log(`\n${report}\nWritten to ${reportPath}`);
}

main(process.argv.slice(2));
