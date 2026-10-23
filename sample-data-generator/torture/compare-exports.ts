// Runs every exporter of a lameta worktree over a project and compares the output with
// another run, so that what changed in lameta's exports between two versions can be read
// in one place. See ../README.md, "Comparing exports".
//
//   pnpm exec tsx sample-data-generator/torture/compare-exports.ts run <lametaDir> <projectDir> <outDir> [--normalized <dir>]
//   pnpm exec tsx sample-data-generator/torture/compare-exports.ts diff <beforeDir> <afterDir> [--ignore-source-comments]
//
// `run` uses the worktree's own src/export/tortureProject.manual.spec.ts. A version too old
// to have one gets a copy of this worktree's, so its exporters must keep the names that
// harness imports. It runs on a copy of the project in <outDir>/project. The raw output goes
// to <outDir>/raw and the normalized copy to
// <outDir>/normalized, or to --normalized. `diff` exits with 1 when the folders differ.

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  compareFolders,
  formatComparison,
  isEmpty,
  isInside,
  writeNormalizedCopy,
} from "./exportComparison";

const kHarness = "src/export/tortureProject.manual.spec.ts";
const kThisLameta = path.resolve(__dirname, "../..");
// the harness is one test, so more workers only cost memory
const kMaxWorkers = "--maxWorkers=1";

function usage(): never {
  console.error(
    "Usage: tsx compare-exports.ts run <lametaDir> <projectDir> <outDir> [--normalized <dir>]\n" +
      "       tsx compare-exports.ts diff <beforeDir> <afterDir> [--ignore-source-comments]",
  );
  process.exit(2);
}

function isTrackedByGit(lametaDir: string, file: string): boolean {
  const r = spawnSync("git", ["-C", lametaDir, "ls-files", "--error-unmatch", file], {
    stdio: "ignore",
  });
  return r.status === 0;
}

// Before Vite+, lameta ran vitest itself and imported its test API from "vitest"
function usesVitePlus(lametaDir: string): boolean {
  return fs.existsSync(path.join(lametaDir, "node_modules", "vite-plus"));
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
        JSON.parse(fs.readFileSync(path.join(lametaDir, "package.json"), "utf8")).engines.node,
        "node",
        "node_modules/vitest/vitest.mjs",
        "run",
        kHarness,
        kMaxWorkers,
      ];
  console.log(`In ${lametaDir}: ${command.join(" ")}`);
  // `pnpm exec` puts this worktree's node_modules/.bin first, and its vp has no `env`
  // command; the global vp has, and hands the rest to the vp of the worktree it runs in.
  // Windows spells the variable "Path".
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const r = spawnSync(command[0], command.slice(1), {
    cwd: lametaDir,
    stdio: "inherit",
    // vp is a .cmd shim on Windows; no argument here needs quoting
    shell: process.platform === "win32",
    env: {
      ...process.env,
      [pathKey]: (process.env[pathKey] ?? "")
        .split(path.delimiter)
        .filter((dir) => !/node_modules[\\/]\.bin/.test(dir))
        .join(path.delimiter),
      LAMETA_TORTURE_DIR: projectDir,
      LAMETA_TORTURE_OUT: rawDir,
    },
  });
  if (r.status !== 0) {
    console.error(`The harness failed in ${lametaDir}`);
    process.exit(1);
  }
}

function run(args: string[]) {
  const normalizedAt = args.indexOf("--normalized");
  const normalizedOption = normalizedAt >= 0 ? args.splice(normalizedAt, 2)[1] : undefined;
  if (args.length !== 3) usage();
  const [lametaDir, sourceProjectDir, outDir] = args.map((a) => path.resolve(a));
  const rawDir = path.join(outDir, "raw");
  const normalizedDir = path.resolve(normalizedOption ?? path.join(outDir, "normalized"));
  // Loading a project writes into it (an empty .session where a session folder has none),
  // so each run gets its own copy, and every run starts from the same files. The copy keeps
  // the folder's name, which the .sprj is named after.
  const projectDir = path.join(outDir, "project", path.basename(sourceProjectDir));
  // a run empties <outDir>/project before copying, so it must not hold the source, and the
  // copy cannot go inside what it copies
  if (isInside(sourceProjectDir, outDir) || isInside(outDir, sourceProjectDir)) {
    console.error(`The output folder and the project folder must not contain each other.`);
    process.exit(2);
  }
  fs.rmSync(path.dirname(projectDir), { recursive: true, force: true });
  fs.cpSync(sourceProjectDir, projectDir, { recursive: true, preserveTimestamps: true });
  fs.rmSync(rawDir, { recursive: true, force: true });
  provideHarness(lametaDir);
  runHarness(lametaDir, projectDir, rawDir);
  writeNormalizedCopy(rawDir, normalizedDir, { projectDir, lametaDir, outDir: rawDir });
  console.log(`Normalized output: ${normalizedDir}`);
}

function diff(args: string[]) {
  const ignoreSourceComments = args.includes("--ignore-source-comments");
  const dirs = args.filter((a) => !a.startsWith("--"));
  if (dirs.length !== 2) usage();
  const comparison = compareFolders(dirs[0], dirs[1], { ignoreSourceComments });
  if (isEmpty(comparison)) {
    console.log("No differences.");
    return;
  }
  console.log(formatComparison(comparison));
  process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
if (command === "run") run(rest);
else if (command === "diff") diff(rest);
else usage();
