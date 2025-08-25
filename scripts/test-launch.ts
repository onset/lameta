/*
  Launch an the app repeated in order to check for a race condition that could cause the app to fail with
  a "no-access", of the style in https://linear.app/lameta/issue/LAM-27. During development, we've
  seen this happen just twice when running with `yarn dev`.
  So far I've been unable to make it break while using this.

  To run, do `yarn test:build-then-launch` or `yarn test:launch-previous-build` or `yarn test:launch-after-package`.
*/
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const args = process.argv.slice(2);
const getFlag = (name: string, def?: string) => {
  const pfx = `--${name}=`;
  const matches = args.filter((a) => a.startsWith(pfx));
  const last = matches[matches.length - 1];
  return last ? last.substring(pfx.length) : def;
};
const getBool = (name: string) => {
  // Presence check; last occurrence wins implicitly by how you pass args
  return args.includes(`--${name}`);
};

const runsStr = getFlag("runs");
const timeoutStr = getFlag("timeout");
const verbose = getBool("verbose");
const exe = getFlag("exe");
const electron = getFlag("electron");
const mainJs = getFlag("main");
const appArgFlags = args
  .filter((a) => a.startsWith("--app-arg="))
  .map((a) => a.substring("--app-arg=".length));

const usage = () => {
  console.error(
    [
      "Usage:",
      "  tsx scripts/smoke-launch.ts --exe=./release/win-unpacked/lameta.exe --runs=10 --timeout=30000 [--verbose]",
      "  OR",
      "  tsx scripts/smoke-launch.ts --electron=./node_modules/.bin/electron --main=./dist/src/mainProcess/main.js --runs=10 --timeout=30000 [--verbose]",
      "",
      "Notes:",
      "  - Exactly one of --exe or (--electron and --main) must be provided.",
      "  - There are no fallbacks or defaults; all required flags must be set."
    ].join("\n")
  );
};

if (!runsStr || !timeoutStr) {
  usage();
  process.exit(1);
}

const runs = parseInt(runsStr, 10);
const timeoutMs = parseInt(timeoutStr, 10);
if (
  !Number.isFinite(runs) ||
  runs <= 0 ||
  !Number.isFinite(timeoutMs) ||
  timeoutMs <= 0
) {
  usage();
  process.exit(1);
}

const usingExe = !!exe;
const usingElectron = !!electron && !!mainJs;
if ((usingExe ? 1 : 0) + (usingElectron ? 1 : 0) !== 1) {
  usage();
  process.exit(1);
}

let binaryPath: string;
if (usingExe) {
  binaryPath = path.resolve(process.cwd(), exe!);
} else {
  const e = electron!;
  const looksLikePath =
    /[\\/]/.test(e) || /^[A-Za-z]:/.test(e) || e.startsWith(".");
  if (looksLikePath) {
    binaryPath = path.resolve(process.cwd(), e);
  } else {
    try {
      // Resolve electron by module name, e.g., --electron=electron
      binaryPath = require(e) as unknown as string;
    } catch (err) {
      console.error(`Failed to resolve electron module '${e}':`, err);
      process.exit(1);
    }
  }
}
// In Electron mode, spawn with the app directory (the repo root with package.json) so app.getAppPath()
// matches development expectations and resource paths (like locale/*) resolve correctly.
const binaryArgsBase: string[] = usingExe ? [] : [process.cwd()];

// Basic existence checks
try {
  fs.accessSync(binaryPath, fs.constants.X_OK | fs.constants.R_OK);
} catch {
  console.error(`Cannot execute: ${binaryPath}`);
  process.exit(1);
}
if (usingElectron) {
  try {
    const compiledMain = path.resolve(process.cwd(), mainJs!);
    fs.accessSync(compiledMain, fs.constants.R_OK);
  } catch {
    console.error(
      `Cannot read compiled main: ${path.resolve(process.cwd(), mainJs!)}`
    );
    process.exit(1);
  }
}

async function runOnce(i: number, tmpDir: string): Promise<void> {
  const marker = path.join(tmpDir, `run-${i}.json`);
  const userDataDir = path.join(tmpDir, `userData-${i}`);
  const args = [
    ...binaryArgsBase,
    `--launch-test=${marker}`,
    `--user-data-dir=${userDataDir}`,
    ...appArgFlags
  ];
  if (verbose) {
    console.log(`spawning: ${binaryPath} ${args.join(" ")}`);
  }
  const child = spawn(binaryPath, args, {
    stdio: verbose ? "inherit" : "ignore",
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: verbose ? "1" : undefined
    }
  });

  const result = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    const to = setTimeout(() => {
      try {
        child.kill();
      } catch {}
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(to);
      reject(err);
    });
    child.on("close", (code, signal) => {
      clearTimeout(to);
      resolve({ code, signal });
    });
  });

  if (result.code !== 0 && result.code !== null) {
    throw new Error(`Electron exited with code ${result.code}`);
  }
  if (!fs.existsSync(marker)) {
    throw new Error(
      [
        `App did not write the launch marker file: ${marker}.`,
        `This indicates the app exited before reaching preload/renderer readiness.`
      ].join(" ")
    );
  }
  const raw = fs.readFileSync(marker, "utf8");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      [
        `Marker exists but is not valid JSON: ${marker}.`,
        `Raw contents: ${raw}`,
        `Parse error: ${(e as Error).message}`
      ].join(" ")
    );
  }
  if (!parsed || parsed.ok !== true) {
    const phase = parsed?.phase ? `phase=${parsed.phase}` : "phase=unknown";
    const detail = parsed?.error ? `error=${parsed.error}` : `contents=${raw}`;
    throw new Error(
      [
        `App reported a launch failure via marker.`,
        phase,
        detail,
        `marker=${marker}`
      ].join(" ")
    );
  }
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lameta-launch-"));
  let ok = 0;
  const failures: Array<{ run: number; message: string }> = [];
  for (let i = 1; i <= runs; i++) {
    const label = `launch ${i}/${runs}`;
    process.stdout.write(`${label}... `);
    try {
      await runOnce(i, tmpDir);
      ok++;
      process.stdout.write("ok\n");
    } catch (e) {
      process.stdout.write("FAIL\n");
      const msg = (e as Error).stack || (e as Error).message || String(e);
      failures.push({ run: i, message: msg });
      console.error(msg);
    }
  }
  if (failures.length === 0) {
    console.log(`All ${ok}/${runs} launches succeeded. Temp: ${tmpDir}`);
    return;
  }
  console.error(
    `App successfully launches ${ok}/${runs} times. Temp: ${tmpDir}`
  );
  if (verbose) {
    console.error("Failure details:");
    for (const f of failures) {
      console.error(`  - Run ${f.run}: ${f.message}`);
    }
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
