process.env.DIST_ELECTRON = join(__dirname, "../..");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = app.isPackaged
  ? process.env.DIST
  : join(process.env.DIST_ELECTRON, "../public");

import { dialog } from "electron";

import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, shell, ipcMain, screen } from "electron";
import { release } from "os";
import { join } from "path";
import Store from "electron-store";

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

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

  win = new BrowserWindow({
    x: x,
    y: y,
    title: "Main window",
    //icon: join(process.env.PUBLIC, "favicon.svg"),
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // this is safe, so long as we have no way of showing external web content
    }
  });

  require("@electron/remote/main").enable(win.webContents);
  require("@electron/remote/main").initialize();

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

app.whenReady().then(createWindow);

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
