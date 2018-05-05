const path = require("path");
const electron = require("electron");

const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");

let menu;
let template;
let mainWindow = null;
var util = require("util");

// allow e2e tests so simulate menu clicks
ipcMain.on("click-menu", (event, menuPath) => {
  var menuItem;
  //electron.dialog.showMessageBox({message:"parts:"+util.inspect(menuPath)});
  for (var menuName of menuPath) {
    if (!menuItem) {
      //electron.dialog.showMessageBox({message:"template:"+util.inspect(template)});
      menuItem = template.find(function(item) {
        return item.label === menuName;
      });
      //electron.dialog.showMessageBox({message:"for "+menuName+" found:"+util.inspect(template)});
    } else {
      //electron.dialog.showMessageBox({message:"menuitem:"+util.inspect(menuItem)});
      //electron.dialog.showMessageBox({message:"submenu:"+util.inspect(menuItem.submenu)});
      menuItem = menuItem.submenu.find(function(item) {
        return item.label === menuName;
      });
    }
  }

  //electron.dialog.showMessageBox({message:"menuitem:"+util.inspect(menuItem)});
  if (menuItem) {
    var enabled = menuItem.enabled;
    var visible = menuItem.visible;
    var click = menuItem.click;

    if (enabled !== false && visible !== false && typeof click === "function") {
      //electron.dialog.showMessageBox({message:"clicking:"+util.inspect(menuItem)});
      menuItem.click();
    }
  }
  //electron.dialog.showMessageBox({message:"leaving ipc call"});
  //mainWindow.webContents.send("start-screen");
});

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
  // disabled this because I was getting an error:
  /* (node:5960) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 2): Error: Version of Electron: 2.0.0 does not match required range ^1.2.1 for extension fmkadmapgofadopljbjfkapdkoienihi */
  // I tried upgrading electron-devtools-installer to its latest, but
  // it didn't help. See https://github.com/MarshallOfSound/electron-devtools-installer/issues/73
  // if (process.env.NODE_ENV === "development") {
  //   const installer = require("electron-devtools-installer"); // eslint-disable-line global-require

  //   const extensions = ["REACT_DEVELOPER_TOOLS"];
  //   const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  //   return Promise.all(
  //     extensions.map(name => installer.default(installer[name], forceDownload))
  //   );
  // }

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
  //    bundle.js
  //    style.css
  //    some fonts, maps, and stuff
  // app.html
  // main.js
  // package.jon

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
      mainWindow.openDevTools();
      //NB: setting up the context menu happened here, in the boilerplate.
      // But it proved difficult to override based on where the user clicked.
      // So now the default context menu is handled on the home page.
      // mainWindow.webContents.on("context-menu", (e, props) => {
    }
  })
);
