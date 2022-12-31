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
//import remoteMain from "@electron/remote/main";

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

Store.initRenderer();

let win: BrowserWindow | null = null;
// Here, you can also use other preload
//const preload = join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

async function createWindow() {
  let x: number | undefined = undefined;
  let y: number | undefined = undefined;
  if (is.dev) {
    screen.getAllDisplays().forEach((display) => {
      if (display.bounds.x < 0) {
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
      //preload,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  require("@electron/remote/main").enable(win.webContents);
  require("@electron/remote/main").initialize();

  // invalid value used as a weak map key

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
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

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
      //preload,
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
