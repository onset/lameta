const Path = require("path");
const electron = require("electron");
import "./MainProcessApi"; // this instantiates the API for our render process to call
import Store from "electron-store";

/* cannot use electron sentry in the main process yet, error only shows up when you run the packaged app.
See https://github.com/getsentry/sentry-electron/issues/92. Probably don't really need the "electron" version anyhow,
could just use the node or web sdk's?
*/
// import {initializeSentry} from("./errorHandling");
// initializeSentry();

import {
  app,
  BrowserWindow,
  Menu,
  shell,
  ipcMain,
  dialog,
  MessageBoxSyncOptions,
} from "electron";

(global as any).arguments = process.argv;

// Note: when actually running the program, stuff will be stored where you expect them,
// using the name of the app. But running in development, you get everything in just
// appdata/roaming/electron. Don't worry about that. app.setPath("userData", somewhere...);

// Put this on global so that the renderer process can get at it.
// When running from code, the path is something like <somewhere>lameta\node_modules\ffmpeg-static\bin\win32\x64\ffmpeg.exe
// When running from installed, it will be somewhere else, depending on elctron builder's "build" parameters in the package.json
// see https://stackoverflow.com/a/43389268/723299

// running release/win-unpacked/lameta.exe we get C:\dev\lameta\release\win-unpacked\resources\app.asar\bin\win32\x64\ffprobe.exe
// running  from installed we get C:\Users\hatto\AppData\Local\Programs\lameta\resources\app.asar\bin\win32\x64\ffprobe.exe
console.log(
  ` require("ffprobe-static").path was ${require("ffprobe-static").path}`
);

(global as any).ffprobepath = require("ffprobe-static")
  .path // during run from release (win-unpacked or installed)
  .replace("app.asar", "node_modules/ffprobe-static")
  // during run from dev
  .replace("app/", "node_modules/ffprobe-static/");

console.log("Setting global.ffprobepath to " + (global as any).ffprobepath);

let mainWindow: BrowserWindow | undefined;

if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support"); // eslint-disable-line
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === "development") {
  // Part of a failed attempt to hook up render process with vscode
  // see launch.json and https://github.com/electron/electron/issues/10445
  app.commandLine.appendSwitch("remote-debugging-port", "9223");

  require("electron-debug")(); // eslint-disable-line global-require
  const p = Path.join(__dirname, "..", "app", "node_modules"); // eslint-disable-line
  require("module").globalPaths.push(p); // eslint-disable-line
}

Store.initRenderer();

// will become unavailable in electron 11. Using until these are sorted out: https://github.com/electron/electron/pull/25869 https://github.com/electron/electron/issues/25405#issuecomment-707455020
//app.allowRendererProcessReuse = false;

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
  const result = await dialog.showMessageBox(mainWindow!, {
    message: args[0],
    buttons: [args[1], args[2]],
  });
  return result;
});
// app.on("before-quit", (event) => {
//   //if (copyInProgress) {
//   dialog.showMessageBox(mainWindow!, { message: "hello" });
//   event.preventDefault();
//   //}
// });

const installExtensions = () => {
  if (process.env.NODE_ENV === "development") {
    const installer = require("electron-devtools-installer"); // eslint-disable-line global-require

    const extensions = ["REACT_DEVELOPER_TOOLS"];
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    return Promise.all(
      extensions.map((name) =>
        installer.default(installer[name], forceDownload)
      )
    );
  }

  return Promise.resolve([]);
};

function fillLastMonitor() {
  const displays = electron.screen.getAllDisplays();
  mainWindow?.setBounds(displays[displays.length - 1].bounds);
  mainWindow?.maximize();
}

app.on("ready", () =>
  // NB: __dirname is something like lameta\release\win-unpacked\resources\app.asar
  // you can look in the asar file using a 7-zip plugin: http://www.tc4shell.com/en/7zip/asar/
  // it looks like
  // dist/
  //    renderer-bundle.js
  //    style.css
  //    some fonts, maps, and stuff
  // app.html
  // main-bundle.js
  // package.json
  {
    installExtensions().then(() => {
      require("@electron/remote/main").initialize();
      mainWindow = new BrowserWindow({
        webPreferences: {
          plugins: true, // to enable the pdf-viewer built in to electron
          backgroundThrottling: false,
          nativeWindowOpen: false,
          webSecurity: false,
          //  enableRemoteModule: true
          // lameta does not show external web pages, so there is no threat there needing sanboxing
          nodeIntegration: true,
          sandbox: false,
          contextIsolation: false,
          //enableRemoteModule: true, // TODO Electron wants us to stop using this: https://medium.com/@nornagon/electrons-remote-module-considered-harmful-70d69500f31
        },
        show: false,
        width: 1024,
        height: 728,

        //windows
        icon: Path.join(__dirname, "../build/windows.ico"),
        //linux icon: path.join(__dirname, "../app/icons/linux/64x64.png")
        //mac icon: path.join(__dirname, "../app/icons/mac.icns")
      }); // Ideally the main-bundle.js should be in app/dist, but Electron // doesn't allow us to reach up a level for the app.html like this: //mainWindow.loadURL(`file://${__dirname}/../app.html`); // so at the moment we're putting the main-bundle.js up in app and use this

      require("@electron/remote/main").enable(mainWindow.webContents);

      /* For hot loading, this is how https://github.com/s-h-a-d-o-w/rhl-electron-quick-start does it, 
       but I get 
          VM113 inject.js:29 Refused to execute inline script because it violates the following Content Security Policy directive: "default-src 'self'". Either the 'unsafe-inline' keyword, a hash ('sha256-T9oXk+Q36ipraPWSTq67s1+uEjr8aQsC45iEyyM9Ztk='), or a nonce ('nonce-...') is required to enable inline execution. Note also that 'script-src' was not explicitly set, so 'default-src' is used as a fallback.

      if (process.env.NODE_ENV === "development") {
        mainWindow.loadURL("http://localhost:3000/app.html");
      } else {
       */ mainWindow.loadURL(
        `file://${__dirname}/app.html`
      );

      /*}*/

      // Send links to the browser, instead of opening new electron windows
      const handleRedirect = (e, url) => {
        if (url !== mainWindow!.webContents.getURL()) {
          e.preventDefault();
          require("electron").shell.openExternal(url);
        }
      };
      mainWindow.webContents.on("will-navigate", handleRedirect);
      mainWindow.webContents.on("new-window", handleRedirect);

      mainWindow.webContents.on("did-finish-load", () => {
        mainWindow!.show();
        mainWindow!.focus();
        fillLastMonitor();
        if (process.env.NODE_ENV === "development") {
          console.log(
            "!!!!!If you hang when doing a 'yarn dev', it's possible that Chrome is trying to pause on a breakpoint. Disable the mainWindow.openDevTools(), run 'dev' again, open devtools (ctrl+alt+i), turn off the breakpoint settings, then renable."
          );

          mainWindow!.webContents.openDevTools();
        }
      });

      ipcMain.handle("showOpenDialog", (event, options) => {
        //returns a promise which is somehow funneled to the caller in the render process
        return dialog.showOpenDialog(mainWindow!, options);
      });

      ipcMain.handle("showMessageBox", (event, options) => {
        return dialog.showMessageBoxSync(mainWindow!, options);
      });

      mainWindow.on("closed", () => {
        mainWindow = undefined;
      });

      // ipcMain.on("show-debug-tools", (event, arg) => {
      //   mainWindow!.webContents.openDevTools();
      // });

      // // warning: this kills e2e! mainWindow.openDevTools(); // temporary, during production build testing
      // if (process.env.NODE_ENV === "development") {
      //   console.log(
      //     "*****If you hang when doing a 'yarn dev', it's possible that Chrome is trying to pause on a breakpoint. Disable the mainWindow.openDevTools(), run 'dev' again, open devtools (ctrl+alt+i), turn off the breakpoint settings, then renable."
      //   );
      //   //mainWindow.openDevTools();
      //   //NB: setting up the context menu happened here, in the boilerplate.
      //   // But it proved difficult to override based on where the user clicked.
      //   // So now the default context menu is handled on the home page.
      //   // mainWindow.webContents.on("context-menu", (e, props) => {
      // }
    });
  }
);
