/*

Run e2e tests against an already-installed lameta.

Notes:
- We could not reliably access draft releases via the GitHub API, so this script no longer downloads or installs lameta.
- Install lameta manually first. Then run this script to launch e2e against the installed build.

What this does now:
1) Ensures no running lameta instance (installer may auto-launch on Windows)
2) Locates the installed executable (Windows or macOS)
3) Runs Playwright e2e with that executable

Usage:
  yarn tsx ./scripts/install-run-e2e.ts [--stop-on-failure] [<playwright-args>...]

Examples:
  # Single file
  yarn tsx ./scripts/install-run-e2e.ts e2e/peopleSearchByRole.e2e.ts

  # Single test by title grep
  yarn tsx ./scripts/install-run-e2e.ts -g "typing a role filters and highlights person"
*/
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
// ...no GitHub/release logic anymore

const log = (...args: any[]) => console.log("[install-run-e2e]", ...args);
const error = (...args: any[]) => console.error("[install-run-e2e]", ...args);

const findInstalledPath = async (): Promise<string> => {
  const platform = os.platform();
  if (platform === "win32") {
    const candidates = [
      path.join(
        process.env.LOCALAPPDATA || "",
        "Programs",
        "lameta",
        "lameta.exe"
      ),
      path.join(
        process.env["ProgramFiles"] || "C:/Program Files",
        "lameta",
        "lameta.exe"
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)",
        "lameta",
        "lameta.exe"
      )
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }
    throw new Error("Could not find installed lameta.exe in default locations");
  } else if (platform === "darwin") {
    const appPath = "/Applications/lameta.app";
    const exe = path.join(appPath, "Contents", "MacOS", "lameta");
    if (fs.existsSync(exe)) return exe;
    throw new Error("Could not find /Applications/lameta.app");
  }
  throw new Error(`Unsupported platform: ${platform}`);
};

// No install logic anymore

const killExistingLameta = async (): Promise<void> => {
  const platform = os.platform();
  if (platform === "win32") {
    // Kill any auto-launched instance from the installer so Playwright can start a fresh one
    await new Promise<void>((resolve) => {
      const p = spawn("taskkill", ["/IM", "lameta.exe", "/F"], {
        stdio: "ignore"
      });
      p.on("exit", () => resolve());
      p.on("error", () => resolve());
    });
    // Give Windows a moment to let the process exit and release single-instance locks
    await new Promise((r) => setTimeout(r, 800));
  } else if (platform === "darwin") {
    await new Promise<void>((resolve) => {
      const p = spawn("bash", ["-lc", "pkill -f 'lameta.app' || true"], {
        stdio: "ignore"
      });
      p.on("exit", () => resolve());
      p.on("error", () => resolve());
    });
    await new Promise((r) => setTimeout(r, 500));
  }
};

const runYarnE2E = async (
  exePath: string,
  opts?: { stopOnFailure?: boolean; extraArgs?: string[] }
): Promise<number> => {
  return new Promise<number>((resolve) => {
    // Use 1 worker to avoid single-instance conflicts with packaged app
    // Use the project's Yarn script to respect repo conventions and config
    const args = ["e2e", "--workers=1"];
    if (opts?.stopOnFailure) {
      args.push("--max-failures=1");
    }
    if (opts?.extraArgs && opts.extraArgs.length) {
      args.push(...opts.extraArgs);
    }
    const child = spawn("yarn", args, {
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_LAMETA_EXECUTABLE: exePath
      }
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
};

const main = async () => {
  const platform = os.platform();
  const argv = process.argv.slice(2);
  const stopOnFailure =
    argv.includes("--stop-on-failure") || argv.includes("-x");
  const extraArgs = argv.filter((a) => a !== "--stop-on-failure" && a !== "-x");
  if (platform !== "win32" && platform !== "darwin") {
    throw new Error(`Unsupported OS for this script: ${platform}`);
  }
  // If the app is already running (e.g., after manual install), close it first
  await killExistingLameta();

  const exePath = await findInstalledPath();
  log(`Using installed executable: ${exePath}`);

  log(
    `Running e2e${stopOnFailure ? " (stop on first failure)" : ""}${
      extraArgs.length ? ` with args: ${extraArgs.join(" ")}` : ""
    }...`
  );
  const exitCode = await runYarnE2E(exePath, { stopOnFailure, extraArgs });
  if (exitCode === 0) {
    log("E2E SUCCESS");
    process.exit(0);
  } else {
    error("E2E FAILURE");
    process.exit(exitCode);
  }
};

main().catch((e) => {
  error(e?.message || e);
  process.exit(1);
});
