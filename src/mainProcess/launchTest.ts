import { app, BrowserWindow, ipcMain } from "electron";
import { execFileSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import * as path from "node:path";
import { ffprobePathForAppPath } from "../other/ffprobePath";

type FfprobeCheck = {
  path: string;
  exists: boolean;
  ran: boolean;
  version?: string;
  error?: string;
};

// Checks that the app can find and run ffprobe where it is actually packaged. Only a packaged
// app can get this wrong -- the paths differ inside app.asar -- so this runs where the only
// test of a packaged app runs, and scripts/test-launch.ts fails the run on it.
// Never throws: a launch test reports its failures through the marker, because an exception
// escaping the main process is what puts a modal dialog on the developer's screen.
const checkFfprobe = (): FfprobeCheck => {
  let ffprobePath = "(not resolved)";
  try {
    ffprobePath = ffprobePathForAppPath(app.getAppPath());
    if (!existsSync(ffprobePath)) {
      return { path: ffprobePath, exists: false, ran: false };
    }
    const version = execFileSync(ffprobePath, ["-version"], {
      encoding: "utf8",
    })
      .split("\n")[0]
      .trim();
    return { path: ffprobePath, exists: true, ran: true, version };
  } catch (e) {
    return {
      path: ffprobePath,
      exists: existsSync(ffprobePath),
      ran: false,
      error: (e as Error).message,
    };
  }
};

type LaunchTestOptions = {
  markerPath?: string;
  simulateFail: boolean;
  delayMs: number;
};

const parseLaunchTestOptions = (): LaunchTestOptions | undefined => {
  const argv = process.argv;
  const launchArg = argv.find((a) => a.startsWith("--launch-test"));
  if (!launchArg) return undefined;

  let markerPath: string | undefined;
  const eq = launchArg.indexOf("=");
  if (eq > -1) {
    markerPath = launchArg.substring(eq + 1);
  } else {
    markerPath = path.join(app.getPath("temp"), `lameta-launch-${process.pid}.txt`);
  }

  const simulateFail = argv.includes("--simulate-launch-fail");

  let delayMs = 0;
  const delayArg = argv.find((a) => a.startsWith("--launch-test-delay="));
  if (delayArg) {
    const n = parseInt(delayArg.substring("--launch-test-delay=".length), 10);
    if (!isNaN(n) && n >= 0) delayMs = n;
  }

  return { markerPath, simulateFail, delayMs };
};

export const initLaunchTest = (win: BrowserWindow | null) => {
  const opts = parseLaunchTestOptions();
  if (!opts || !win || !opts.markerPath) return;

  let preloadReady = false;
  let rendererReady = false;
  let readyToShow = win.isVisible();

  const completeAndQuit = () => {
    const ffprobe = checkFfprobe();
    const ok = !opts.simulateFail && ffprobe.ran;
    try {
      writeFileSync(
        opts.markerPath!,
        JSON.stringify({
          ok,
          phase: ffprobe.ran ? "renderer-ready" : "ffprobe",
          when: new Date().toISOString(),
          pid: process.pid,
          appPath: app.getAppPath(),
          ffprobe,
          reason: opts.simulateFail ? "simulate-launch-fail" : undefined,
        }),
      );
    } catch (e) {
      console.error("Failed to write launch marker:", e);
    }
    setImmediate(() => {
      try {
        win?.destroy();
      } catch {}
      app.quit();
      setTimeout(() => app.exit(ok ? 0 : 1), 2000);
    });
  };

  const maybeFinish = () => {
    if (preloadReady && rendererReady && readyToShow) {
      if (opts.delayMs > 0) {
        setTimeout(completeAndQuit, opts.delayMs);
      } else {
        completeAndQuit();
      }
    }
  };

  ipcMain.once("renderer-ready", () => {
    rendererReady = true;
    maybeFinish();
  });
  ipcMain.once("preload-ready", () => {
    preloadReady = true;
    maybeFinish();
  });
  win.once("ready-to-show", () => {
    readyToShow = true;
    maybeFinish();
  });
  win.webContents.on("preload-error", (_event, _preloadPath, error) => {
    try {
      writeFileSync(
        opts.markerPath!,
        JSON.stringify({
          ok: false,
          phase: "preload-error",
          error: String(error),
          when: new Date().toISOString(),
          pid: process.pid,
        }),
      );
    } catch (e) {
      console.error("Failed to write preload-error marker:", e);
    }
    setImmediate(() => {
      try {
        win?.destroy();
      } catch {}
      app.quit();
      setTimeout(() => app.exit(1), 2000);
    });
  });
};
