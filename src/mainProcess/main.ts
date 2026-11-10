process.env.DIST_ELECTRON = join(__dirname, "../..");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = app.isPackaged
  ? process.env.DIST
  : join(process.env.DIST_ELECTRON, "../public");

import { dialog } from "electron";

import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, shell, ipcMain, screen, session, protocol, net } from "electron";
import { release } from "os";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import Store from "electron-store";
import { getTestEnvironment } from "../getTestEnvironment";
import { claimSprjFiles } from "./fileAssociation";
import { replaceOldBetaIfAny } from "./replaceOldBeta";
import { spellCheckLanguages } from "../other/spellCheckLanguages";
import { forwardWindowEvents } from "./windowIpc";
import { startAlphaUpdates } from "./updater";

// --launch-test opens the app, checks it came up, and quits again (scripts/test-launch.ts).
// Nothing about it may leave a modal error dialog on the developer's screen, so this is
// handled here, at the top of the main process, depending on nothing but electron and fs:
// the failure that made us write this was a module that would not load, which a guard inside
// launchTest.ts could not have caught, because it was launchTest.ts.
const isLaunchTest = (): boolean => process.argv.some((a) => a.startsWith("--launch-test"));

if (isLaunchTest()) {
  // Electron's own uncaught-exception handler is already registered and shows a blocking
  // dialog. Take away what it shows, then exit before anyone could click it anyway.
  try {
    dialog.showErrorBox = () => {};
  } catch {}
  const failTheLaunchTest = (phase: string, error: unknown) => {
    console.error(`launch test: ${phase}:`, error);
    const arg = process.argv.find((a) => a.startsWith("--launch-test="));
    if (arg) {
      try {
        writeFileSync(
          arg.substring("--launch-test=".length),
          JSON.stringify({
            ok: false,
            phase,
            error: String(error),
            when: new Date().toISOString(),
            pid: process.pid,
          }),
        );
      } catch {}
    }
    app.exit(1);
  };
  process.on("uncaughtException", (e) => failTheLaunchTest("uncaughtException", e));
  process.on("unhandledRejection", (e) => failTheLaunchTest("unhandledRejection", e));
}

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

// In dev, expose CDP so tooling (and AI agents) can inspect/drive the live app.
// Not under E2E: Playwright connects through its own debugging port, and a fixed
// port that an earlier or parallel instance still holds stops the launch.
if ((is.dev || process.env.VITE_DEV_SERVER_URL) && !process.env.E2E) {
  app.commandLine.appendSwitch("remote-debugging-port", "9222");
}

// Plugin iframes are served from this registered, privileged+secure custom scheme rather
// than file://. A file:// subframe is an *opaque* origin, and Chromium refuses to delegate
// powerful Permissions-Policy features (microphone/camera) to an opaque origin — so
// `allow="microphone"` on the iframe is silently dropped and getUserMedia throws
// NotAllowedError (the plugin recorder then shows "No microphone / No devices found").
// A real tuple origin (lameta-plugin://<pluginId>/…) *can* receive the delegation.
// registerSchemesAsPrivileged must run before the app 'ready' event, hence module scope.
// `standard` gives normal (relative-URL-resolving) origin semantics; `secure` marks it a
// secure context; `supportFetchAPI`/`stream` let the plugin's fetch/worklet/module loads work.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "lameta-plugin",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

// In normal runs we enforce a single instance. For E2E we allow parallel instances
// so tests can launch while a developer has `yarn dev` running. The E2E harness
// sets process.env.E2E. We also optionally redirect userData to an isolated temp
// directory (E2ERoot) so settings/stores do not collide with a dev session.
// For developers, we also allow multiple instances to make development easier.
if (process.env.E2E) {
  if (process.env.E2ERoot) {
    try {
      app.setPath("userData", join(process.env.E2ERoot, "userData"));
    } catch {}
  }
} else {
  // Allow multiple instances for developers
  const isDeveloper =
    is.dev || process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === "development";

  if (!isDeveloper && !app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
  }
}

Store.initRenderer();

let win: BrowserWindow | null = null;
// whether the developer tools were open, in development
const devToolsStore = new Store<{ open: boolean }>({ name: "devTools" });

export { win as mainWindow };

function isExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // in development lameta itself is served over http, and a reload navigates to it
    const devServer = process.env.VITE_DEV_SERVER_URL;
    if (devServer && parsed.origin === new URL(devServer).origin) return false;
    return ["http:", "https:", "mailto:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const preload = join(__dirname, "../mainProcess/preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

// launch-test parsing and flow handled in ./launchTest

// Allow overriding userData dir from command line: --user-data-dir=PATH
{
  const arg = process.argv.find((a) => a.startsWith("--user-data-dir="));
  if (arg) {
    const value = arg.substring("--user-data-dir=".length);
    try {
      const resolved = path.resolve(value);
      mkdirSync(resolved, { recursive: true });
      app.setPath("userData", resolved);
    } catch (e) {
      console.error("Failed to set userData dir:", e);
    }
  }
}
async function createWindow() {
  let x: number | undefined = undefined;
  let y: number | undefined = undefined;
  if (is.dev) {
    let smallest = 1000000;
    screen.getAllDisplays().forEach((display) => {
      if (display.bounds.height < smallest) {
        smallest = display.bounds.height;
        x = display.bounds.x;
        y = display.bounds.y;
      }
    });
  }
  process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

  // For E2E tests in headless mode, position windows off-screen to avoid focus stealing
  const testEnv = getTestEnvironment();
  const e2eHeadless = testEnv.E2E && process.env.E2E_HEADED !== "1";
  if (e2eHeadless) {
    // Keep test windows off the primary display, where the developer works. A
    // window placed off every screen is still maximized onto the primary display
    // by ready-to-show below, so use the smallest other display when there is one.
    const primaryId = screen.getPrimaryDisplay().id;
    const others = screen.getAllDisplays().filter((d) => d.id !== primaryId);
    if (others.length > 0) {
      const target = others.reduce((a, b) =>
        b.bounds.width * b.bounds.height < a.bounds.width * a.bounds.height ? b : a,
      );
      x = target.bounds.x + 20;
      y = target.bounds.y + 20;
    } else {
      x = 10000;
      y = 10000;
    }
  }

  // The launch test opens the app and quits again. Keep its window off the display the
  // developer is working on, and (below) don't maximize it: nobody is meant to look at it.
  const launchTest = isLaunchTest();
  if (launchTest) {
    const primaryId = screen.getPrimaryDisplay().id;
    const others = screen
      .getAllDisplays()
      .filter((d) => d.id !== primaryId)
      .sort((a, b) => a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height);
    if (others.length > 0) {
      x = others[0].bounds.x + 40;
      y = others[0].bounds.y + 40;
    }
  }

  win = new BrowserWindow({
    x: x,
    y: y,
    title: "Main window",
    //icon: join(process.env.PUBLIC, "favicon.svg"),
    webPreferences: {
      // Preload must be disabled for E2E tests - Playwright's Electron integration
      // doesn't properly support nodeIntegration:true + contextIsolation:false,
      // causing "no access" errors in Node.js module resolution (fs.realpathSync)
      preload: getTestEnvironment().E2E ? undefined : preload,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // this is safe, so long as we have no way of showing external web content
    },
  });

  forwardWindowEvents(win);
  // quit when the main window closes
  win.on("closed", () => {
    win = null;
    app.quit();
  });

  // Enable spell checking for multiple languages
  session.defaultSession.setSpellCheckerLanguages(spellCheckLanguages);

  // Electron grants every permission request by default when no handler is set. This
  // explicit handler exists to make it clear that plugin iframes are allowed to capture
  // audio (getUserMedia for their recorders), and it is the place to narrow permissions
  // later (e.g. by inspecting `permission` / the requesting frame).
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) =>
    callback(true),
  );

  // getUserMedia for `media` runs a synchronous permission *check* first; if that is
  // denied it never reaches the request handler above and the plugin sees
  // NotAllowedError (its recorder then shows "No microphone / No devices found").
  // Electron's default check rejects `media` for the plugin iframes (a cross-origin
  // file:// subframe: `webContents` is null and `requestingOrigin` is the file origin),
  // so we must also grant here for the mic to work. Same allow-all stance as the
  // request handler; narrow later by inspecting `permission` / `requestingOrigin`.
  session.defaultSession.setPermissionCheckHandler(() => true);

  // Allow device enumeration/selection (mic device chosen by getUserMedia) without a
  // chooser; without this, device labels stay empty and selection can be blocked.
  session.defaultSession.setDevicePermissionHandler(() => true);

  if (process.env.VITE_DEV_SERVER_URL) {
    console.log("VITE_DEV_SERVER_URL", process.env.VITE_DEV_SERVER_URL);
    // electron-vite-vue#298
    win.loadURL(url!).catch((err) => console.error("Could not load the main window:", err));
  } else {
    win.loadFile(indexHtml).catch((err) => console.error("Could not load the main window:", err));
  }
  win.on("ready-to-show", () => {
    if (!launchTest) win!.maximize();
    win!.show();
  });

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win!.show();
    if (!launchTest) win!.focus();
    //fillLastMonitor();
    if (process.env.NODE_ENV === "development") {
      console.log(
        "!!!!!If you hang when doing a 'yarn dev', it's possible that Chrome is trying to pause on a breakpoint. Disable the mainWindow.openDevTools(), run 'dev' again, open devtools (ctrl+alt+i), turn off the breakpoint settings, then renable.",
      );
    }
    if (process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === "development") {
      // as the developer last left them, so that a refresh does not reopen them
      if (devToolsStore.get("open", true)) win!.webContents.openDevTools();
    }
  });
  win.webContents.on("devtools-opened", () => devToolsStore.set("open", true));
  win.webContents.on("devtools-closed", () => devToolsStore.set("open", false));

  // Initialize launch-test handling (no-op if not requested). Required lazily, and only in a
  // launch-test run, so that a module this one cannot load fails the check rather than the app.
  if (launchTest) {
    try {
      require("./launchTest").initLaunchTest(win);
    } catch (e) {
      console.error("launch test: could not start:", e);
      throw e; // the guard at the top of this file turns this into a failed check
    }
  }

  // Make all external links open with the browser, not inside the application.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      shell.openExternal(url).catch((err) => console.error(`Could not open ${url}:`, err));
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, navigationUrl) => {
    if (isExternalUrl(navigationUrl)) {
      event.preventDefault();
      shell
        .openExternal(navigationUrl)
        .catch((err) => console.error(`Could not open ${navigationUrl}:`, err));
    }
  });
}

// pluginId -> absolute plugin directory on disk. The renderer's PluginManager owns plugin
// discovery (it runs with nodeIntegration), so it registers the current map here whenever it
// (re)scans. The lameta-plugin:// handler resolves requests against this. Keys are lowercased
// because URL parsing lowercases the host component.
const pluginDirById = new Map<string, string>();
ipcMain.handle("plugins:registerDirs", (_event, entries: { id: string; directory: string }[]) => {
  pluginDirById.clear();
  for (const e of entries || [])
    if (e && e.id && e.directory) pluginDirById.set(e.id.toLowerCase(), e.directory);
  return true;
});

// Serve lameta-plugin://<pluginId>/<assetPath> from that plugin's directory. Serves ALL
// assets (index.html, hashed JS chunks, the recorder's AudioWorklet), not just the entry.
// Must be registered after 'ready'.
function registerPluginProtocol(): void {
  protocol.handle("lameta-plugin", (request) => {
    const { host, pathname } = new URL(request.url);
    const dir = pluginDirById.get(host.toLowerCase());
    if (!dir) return new Response("unknown plugin", { status: 404 });
    const rel = decodeURIComponent(pathname).replace(/^\/+/, "") || "index.html";
    const pathToServe = path.resolve(dir, rel);
    // Reject paths that escape the plugin directory (e.g. lameta-plugin://id/../../secret).
    const relative = path.relative(dir, pathToServe);
    const isSafe = !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
    if (!isSafe) return new Response("forbidden", { status: 403 });
    return net.fetch(pathToFileURL(pathToServe).toString());
  });
}

app
  .whenReady()
  .then(async () => {
    registerPluginProtocol();
    // a beta's first start may replace an old beta; its progress window closes once ours is open
    const closeProgress = await replaceOldBetaIfAny(app.getVersion());
    await createWindow();
    closeProgress();
    if (!isLaunchTest()) startAlphaUpdates();
  })
  .catch((err) => console.error("Could not create the main window:", err));

if (process.platform === "win32" && app.isPackaged && !process.env.E2E) {
  claimSprjFiles(app.getPath("exe"));
}

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win && !win.isDestroyed()) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow().catch((err) => console.error("Could not create the main window:", err));
  }
});

// new window example arg: new windows url
ipcMain.handle("open-win", (event, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow
      .loadURL(`${url}#${arg}`)
      .catch((err) => console.error("Could not load the child window:", err));
  } else {
    childWindow
      .loadFile(indexHtml, { hash: arg })
      .catch((err) => console.error("Could not load the child window:", err));
  }
});

// handle getAppPath event
ipcMain.handle("getAppPath", () => {
  return app.getAppPath();
});

// On Windows/Linux, when a user double-clicks an .sprj file, the OS launches the app
// with the file path as a command line argument. We need to capture this and set
// global.arguments so the renderer process can access it.
{
  const sprjArg = process.argv.find((arg) => arg.endsWith(".sprj") && !arg.startsWith("-"));
  if (sprjArg) {
    console.log(`Found .sprj file in command line args: ${sprjArg}`);
    (global as any).arguments = ["ignore", sprjArg];
  }
}

// on macos, this will be called if the user directly opens an sprj file.
app.on("open-file", (event, path: string) => {
  console.log(`main got open-file(${path})`);
  // This approach assumes that we get this even before the renderer process is started.
  // Otherwise, we'd need to use IPC to notify it.
  if (path.endsWith(".sprj")) {
    (global as any).arguments = ["ignore", path];
    event.preventDefault();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.handle("confirm-quit", async (event, ...args) => {
  const result = await dialog.showMessageBox(win!, {
    message: args[0],
    buttons: [args[1], args[2]],
  });
  return result;
});

ipcMain.handle("showOpenDialog", (event, options) => {
  //returns a promise which is somehow funneled to the caller in the render process
  return dialog.showOpenDialog(win!, options);
});

ipcMain.handle("showSaveDialog", (event, options) => {
  return dialog.showSaveDialog(win!, options);
});

ipcMain.handle("showMessageBox", (event, options) => {
  return dialog.showMessageBoxSync(win!, options);
});

// this instaniates the MainProcessApi class and makes it available to the render process
import "./MainProcessApi";
