const path = require("path");
const electron = require("electron");

/* cannot use electron sentry in the main process yet, error only shows up when you run the packaged app.
See https://github.com/getsentry/sentry-electron/issues/92. Probably don't really need the "electron" version anyhow,
could just use the node or web sdk's?
require("./init-sentry").initializeSentry();
const { initializeSentry } = require("./init-sentry");
*/

const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");

// Note: when actually running the program, stuff will be stored where you expect them,
// using the name of the app. But running in development, you get everything in just
// appdata/roaming/electron. Don't worry about that. app.setPath("userData", somewhere...);

// Put this on global so that the renderer process can get at it.
// When running from code, the path is something like <somewhere>lameta\node_modules\ffmpeg-static\bin\win32\x64\ffmpeg.exe
// When running from installed, it will be somewhere else, depending on elctron builder's "build" parameters in the package.json
// see https://stackoverflow.com/a/43389268/723299
global.ffprobepath = require("ffprobe-static").path.replace(
  "app.asar",
  "node_modules/ffprobe-static"
);

console.log("Setting global.ffprobepath to " + global.ffprobepath);

let mainWindow = null;

if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support"); // eslint-disable-line
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === "development") {
  // Part of a failed attempt to hook up render process with vscode
  // see launch.json and https://github.com/electron/electron/issues/10445
  app.commandLine.appendSwitch("remote-debugging-port", "9223");

  require("electron-debug")(); // eslint-disable-line global-require
  const path = require("path"); // eslint-disable-line
  const p = path.join(__dirname, "..", "app", "node_modules"); // eslint-disable-line
  require("module").globalPaths.push(p); // eslint-disable-line
}

app.on("window-all-closed", () => {
  //if (process.platform !== "darwin")
  app.quit();
});

const installExtensions = () => {
  if (process.env.NODE_ENV === "development") {
    const installer = require("electron-devtools-installer"); // eslint-disable-line global-require

    const extensions = ["REACT_DEVELOPER_TOOLS"];
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    return Promise.all(
      extensions.map(name => installer.default(installer[name], forceDownload))
    );
  }

  return Promise.resolve([]);
};

function fillLastMonitor() {
  var displays = electron.screen.getAllDisplays();
  mainWindow.setBounds(displays[displays.length - 1].bounds);
  mainWindow.maximize();
}

app.on("ready", () =>
  // NB: __dirname is something like sayless\release\win-unpacked\resources\app.asar
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
      mainWindow = new BrowserWindow({
        webPreferences: {
          nodeIntegration: true
        },
        show: false,
        width: 1024,
        height: 728,
        plugins: true, // to enable the pdf-viewer built in to electron
        //windows
        icon: path.join(__dirname, "../artwork/windows.ico")
        //linux icon: path.join(__dirname, "../app/icons/linux/64x64.png")
        //mac icon: path.join(__dirname, "../app/icons/mac.icns")
      }); // Ideally the main-bundle.js should be in app/dist, but Electron // doesn't allow us to reach up a level for the app.html like this: //mainWindow.loadURL(`file://${__dirname}/../app.html`); // so at the moment we're putting the main-bundle.js up in app and use this

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
      var handleRedirect = (e, url) => {
        if (url != mainWindow.webContents.getURL()) {
          e.preventDefault();
          require("electron").shell.openExternal(url);
        }
      };
      mainWindow.webContents.on("will-navigate", handleRedirect);
      mainWindow.webContents.on("new-window", handleRedirect);

      mainWindow.webContents.on("did-finish-load", () => {
        mainWindow.show();
        mainWindow.focus();
        fillLastMonitor();
        if (process.env.NODE_ENV === "development") {
          console.log(
            "*****If you hang when doing a 'yarn dev', it's possible that Chrome is trying to pause on a breakpoint. Disable the mainWindow.openDevTools(), run 'dev' again, open devtools (ctrl+alt+i), turn off the breakpoint settings, then renable."
          );

          mainWindow.openDevTools();
        }
      });
      mainWindow.on("closed", () => {
        mainWindow = null;
      });

      ipcMain.on("show-debug-tools", (event, arg) => {
        mainWindow.openDevTools();
      });

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
