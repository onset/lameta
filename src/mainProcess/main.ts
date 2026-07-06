process.env.DIST_ELECTRON = join(__dirname, "../..");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = app.isPackaged
  ? process.env.DIST
  : join(process.env.DIST_ELECTRON, "../public");

import { dialog } from "electron";

import { is } from "@electron-toolkit/utils";
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  screen,
  session,
  protocol,
  net
} from "electron";
import { release } from "os";
import { join } from "path";
import { mkdirSync } from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import Store from "electron-store";
import { getTestEnvironment } from "../getTestEnvironment";
import { initLaunchTest } from "./launchTest";
import { spellCheckLanguages } from "../other/spellCheckLanguages";

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

// In dev, expose a CDP endpoint so tooling can drive/inspect the renderer.
// Guarded to dev/non-packaged runs; never enabled in a shipped build.
if (
  !app.isPackaged &&
  (is.dev ||
    process.env.VITE_DEV_SERVER_URL ||
    process.env.NODE_ENV === "development")
) {
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
      stream: true
    }
  }
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
    is.dev ||
    process.env.VITE_DEV_SERVER_URL ||
    process.env.NODE_ENV === "development";

  if (!isDeveloper && !app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
  }
}

Store.initRenderer();

let win: BrowserWindow | null = null;

export { win as mainWindow };

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
    // Move window far off-screen to the right and down (Windows-compatible)
    x = 10000;
    y = 10000;
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
      webSecurity: false // this is safe, so long as we have no way of showing external web content
    }
  });

  require("@electron/remote/main").enable(win.webContents);
  require("@electron/remote/main").initialize();

  // Enable spell checking for multiple languages
  session.defaultSession.setSpellCheckerLanguages(spellCheckLanguages);

  // Electron grants every permission request by default when no handler is set. This
  // explicit handler exists to make it clear that plugin iframes are allowed to capture
  // audio (getUserMedia for their recorders), and it is the place to narrow permissions
  // later (e.g. by inspecting `permission` / the requesting frame).
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => callback(true)
  );

  // getUserMedia for `media` runs a synchronous permission *check* first; if that is
  // denied it never reaches the request handler above and the plugin sees
  // NotAllowedError (its recorder then shows "No microphone / No devices found").
  // Electron's default check rejects `media` for the plugin iframes (a cross-origin
  // file:// subframe: `webContents` is null and `requestingOrigin` is the file origin),
  // so we must also grant here for the mic to work. Same allow-all stance as the
  // request handler; narrow later by inspecting `permission` / `requestingOrigin`.
  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => true
  );

  // Allow device enumeration/selection (mic device chosen by getUserMedia) without a
  // chooser; without this, device labels stay empty and selection can be blocked.
  session.defaultSession.setDevicePermissionHandler((details) => true);

  if (process.env.VITE_DEV_SERVER_URL) {
    console.log("VITE_DEV_SERVER_URL", process.env.VITE_DEV_SERVER_URL);
    // electron-vite-vue#298
    win.loadURL(url!);
    // Open devTool if the app is not packaged
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }
  win.on("ready-to-show", () => {
    win!.maximize();
    win!.show();
  });

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win!.show();
    win!.focus();
    //fillLastMonitor();
    if (process.env.NODE_ENV === "development") {
      console.log(
        "!!!!!If you hang when doing a 'yarn dev', it's possible that Chrome is trying to pause on a breakpoint. Disable the mainWindow.openDevTools(), run 'dev' again, open devtools (ctrl+alt+i), turn off the breakpoint settings, then renable."
      );

      win!.webContents.openDevTools();
    }
  });

  // Initialize launch-test handling (no-op if not requested)
  initLaunchTest(win);

  function fillLastMonitor() {
    const displays = screen.getAllDisplays();
    win?.setBounds(displays[displays.length - 1].bounds);
    win?.maximize();
  }

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
}

// pluginId -> absolute plugin directory on disk. The renderer's PluginManager owns plugin
// discovery (it runs with nodeIntegration), so it registers the current map here whenever it
// (re)scans. The lameta-plugin:// handler resolves requests against this. Keys are lowercased
// because URL parsing lowercases the host component.
const pluginDirById = new Map<string, string>();
ipcMain.handle(
  "plugins:registerDirs",
  (_event, entries: { id: string; directory: string }[]) => {
    pluginDirById.clear();
    for (const e of entries || [])
      if (e && e.id && e.directory)
        pluginDirById.set(e.id.toLowerCase(), e.directory);
    return true;
  }
);

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
    const isSafe =
      !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
    if (!isSafe) return new Response("forbidden", { status: 403 });
    return net.fetch(pathToFileURL(pathToServe).toString());
  });
}

app.whenReady().then(() => {
  registerPluginProtocol();
  createWindow();
});

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
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
    createWindow();
  }
});

// new window example arg: new windows url
ipcMain.handle("open-win", (event, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
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
  const sprjArg = process.argv.find(
    (arg) => arg.endsWith(".sprj") && !arg.startsWith("-")
  );
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

let copyInProgress: boolean;
ipcMain.on("copyInProgress", () => {
  copyInProgress = true;
});
ipcMain.on("copyStopped", () => {
  copyInProgress = false;
});
ipcMain.handle("confirm-quit", async (event, ...args) => {
  const result = await dialog.showMessageBox(win!, {
    message: args[0],
    buttons: [args[1], args[2]]
  });
  return result;
});

ipcMain.handle("showOpenDialog", (event, options) => {
  //returns a promise which is somehow funneled to the caller in the render process
  return dialog.showOpenDialog(win!, options);
});

ipcMain.handle("showMessageBox", (event, options) => {
  return dialog.showMessageBoxSync(win!, options);
});

// this instaniates the MainProcessApi class and makes it available to the render process
import "./MainProcessApi";
