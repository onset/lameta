import { app, BrowserWindow, ipcMain } from "electron";
import { writeFileSync } from "fs";
import * as path from "path";

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
    markerPath = path.join(
      app.getPath("temp"),
      `lameta-launch-${process.pid}.txt`
    );
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
    try {
      writeFileSync(
        opts.markerPath!,
        JSON.stringify({
          ok: !opts.simulateFail,
          phase: "renderer-ready",
          when: new Date().toISOString(),
          pid: process.pid,
          reason: opts.simulateFail ? "simulate-launch-fail" : undefined
        })
      );
    } catch (e) {
      console.error("Failed to write launch marker:", e);
    }
    setImmediate(() => {
      try {
        win?.destroy();
      } catch {}
      app.quit();
      setTimeout(() => app.exit(opts.simulateFail ? 1 : 0), 2000);
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
          pid: process.pid
        })
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
