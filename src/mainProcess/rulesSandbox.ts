import { BrowserWindow, ipcMain, session } from "electron";

// Runs an archive's rules file (see src/problems/rulesFile.ts) away from lameta.
// The rules run in a hidden BrowserWindow with its own renderer process:
//  - sandboxed, no Node, no preload, so it cannot reach lameta or the file system
//  - in its own in-memory session, which refuses every network request, and whose
//    page has a Content-Security-Policy that allows no connections
//  - a run that takes too long is stopped by killing that process, which an iframe
//    or a worker inside lameta's own renderer could not guarantee
// The renderer sends the whole script to run (see rulesSandboxScript.ts) and gets
// back plain data.

const kPartition = "lameta-rules-sandbox"; // no "persist:", so nothing is written to disk
const kPage =
  "data:text/html;charset=utf-8," +
  encodeURIComponent(
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-eval' data:"></head><body></body></html>`,
  );

let sandbox: Promise<BrowserWindow> | undefined;
// the window that `sandbox` resolves to, once it exists
let current: BrowserWindow | undefined;
let sessionIsLockedDown = false;
// The background check and the export dialog's check can ask at the same time. They
// take turns, because a run that times out destroys the window, and with it any other
// run in that window.
let previousRun: Promise<unknown> = Promise.resolve();

export interface IRulesSandboxRunResult {
  value?: unknown;
  timedOut?: boolean;
  error?: string;
}

export function registerRulesSandbox() {
  ipcMain.handle("run-rules-sandbox", (_event, script: string, timeoutMilliseconds: number) => {
    const run = previousRun.then(() => runInSandbox(script, timeoutMilliseconds));
    previousRun = run.catch(() => undefined);
    return run;
  });
  ipcMain.handle("rules-sandbox-process-id", async () =>
    (await getSandbox()).webContents.getOSProcessId(),
  );
}

async function runInSandbox(
  script: string,
  timeoutMilliseconds: number,
): Promise<IRulesSandboxRunResult> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const win = await getSandbox();
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), timeoutMilliseconds);
    });
    const result = await Promise.race([win.webContents.executeJavaScript(script, true), timeout]);
    if (result === "timeout") {
      destroySandbox();
      return { timedOut: true };
    }
    return { value: result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Two callers that ask before the window has loaded get the same window
function getSandbox(): Promise<BrowserWindow> {
  if (current?.isDestroyed()) destroySandbox();
  if (!sandbox) {
    sandbox = createSandbox();
    // a window that failed to load is not kept, so the next run tries again
    sandbox.catch(() => destroySandbox());
  }
  return sandbox;
}

async function createSandbox(): Promise<BrowserWindow> {
  lockDownSession();
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      partition: kPartition,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      nodeIntegrationInWorker: false,
      webviewTag: false,
      spellcheck: false,
      images: false,
      // the window is never shown; keep its timers and promises running at full speed
      backgroundThrottling: false,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.webContents.on("render-process-gone", () => {
    if (current === win) destroySandbox();
  });
  current = win;
  await win.loadURL(kPage);
  return win;
}

function destroySandbox() {
  const win = current;
  sandbox = undefined;
  current = undefined;
  if (win && !win.isDestroyed()) {
    // a script stuck in a loop never yields, so end its process rather than asking it to close
    win.webContents.forcefullyCrashRenderer();
    win.destroy();
  }
}

function lockDownSession() {
  if (sessionIsLockedDown) return;
  sessionIsLockedDown = true;
  const ses = session.fromPartition(kPartition);
  ses.webRequest.onBeforeRequest((details, callback) => {
    // the page itself and the rules module are data: URLs; nothing else may load
    callback({ cancel: !details.url.startsWith("data:") });
  });
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
}
