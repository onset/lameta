const path = require("path");
const electron = require("electron");

const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");

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
  if (process.platform !== "darwin") app.quit();
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
        show: false,
        width: 1024,
        height: 728,
        //windows
        icon: path.join(__dirname, "../artwork/windows.ico")
        //linxu icon: path.join(__dirname, "../app/icons/linux/64x64.png")
        //mac icon: path.join(__dirname, "../app/icons/mac.icns")
      });

      mainWindow.loadURL(`file://${__dirname}/app.html`);

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
      });
      mainWindow.on("closed", () => {
        mainWindow = null;
      });
      // warning: this kills e2e! mainWindow.openDevTools(); // temporary, during production build testing
      if (process.env.NODE_ENV === "development") {
        console.log(
          "*****If you hang when doing a 'yarn dev', it's possible that Chrome is trying to pause on a breakpoint. Disable the mainWindow.openDevTools(), run 'dev' again, open devtools (ctrl+alt+i), turn off the breakpoint settings, then renable."
        );
        mainWindow.openDevTools();
        //NB: setting up the context menu happened here, in the boilerplate.
        // But it proved difficult to override based on where the user clicked.
        // So now the default context menu is handled on the home page.
        // mainWindow.webContents.on("context-menu", (e, props) => {
      }
    });
  }
);
