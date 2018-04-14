const path = require("path");
const electron = require("electron");

const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");

let menu;
let template;
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

let contextMenuItems = [
  { label: "blah blah", click: () => console.log("clickxlcf") }
];
// app.on("contextMenuItems", (event, items) => {
//   console.log("got context menu items");
//   //contextMenuItems = items;
//   event.returnValue = 4;
// });

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
  //    bundle.js
  //    style.css
  //    some fonts, maps, and stuff
  // app.html
  // main.js
  // package.jon

  installExtensions().then(
    () => {
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
      mainWindow.openDevTools(); // temporary, during production build testing
      if (process.env.NODE_ENV === "development") {
        mainWindow.openDevTools();
        //NB: setting up the context menu happened here, in the boilerplate.
        // But it proved difficult to override based on where the user clicked.
        // So now the default context menu is handled on the home page.
        // mainWindow.webContents.on("context-menu", (e, props) => {
      }

      // if (process.platform === "darwin") {
      //   template = [
      //     {
      //       label: "Electron",
      //       submenu: [
      //         {
      //           label: "About ElectronReact",
      //           selector: "orderFrontStandardAboutPanel:"
      //         },
      //         {
      //           type: "separator"
      //         },
      //         {
      //           label: "Services",
      //           submenu: []
      //         },
      //         {
      //           type: "separator"
      //         },
      //         {
      //           label: "Hide ElectronReact",
      //           accelerator: "Command+H",
      //           selector: "hide:"
      //         },
      //         {
      //           label: "Hide Others",
      //           accelerator: "Command+Shift+H",
      //           selector: "hideOtherApplications:"
      //         },
      //         {
      //           label: "Show All",
      //           selector: "unhideAllApplications:"
      //         },
      //         {
      //           type: "separator"
      //         },
      //         {
      //           label: "Quit",
      //           accelerator: "Command+Q",
      //           click() {
      //             app.quit();
      //           }
      //         }
      //       ]
      //     },
      //     {
      //       label: "Edit",
      //       submenu: [
      //         {
      //           label: "Undo",
      //           accelerator: "Command+Z",
      //           selector: "undo:"
      //         },
      //         {
      //           label: "Redo",
      //           accelerator: "Shift+Command+Z",
      //           selector: "redo:"
      //         },
      //         {
      //           type: "separator"
      //         },
      //         {
      //           label: "Cut",
      //           accelerator: "Command+X",
      //           selector: "cut:"
      //         },
      //         {
      //           label: "Copy",
      //           accelerator: "Command+C",
      //           selector: "copy:"
      //         },
      //         {
      //           label: "Paste",
      //           accelerator: "Command+V",
      //           selector: "paste:"
      //         },
      //         {
      //           label: "Select All",
      //           accelerator: "Command+A",
      //           selector: "selectAll:"
      //         }
      //       ]
      //     },
      //     {
      //       label: "View",
      //       submenu:
      //         process.env.NODE_ENV === "development"
      //           ? [
      //               {
      //                 label: "Reload",
      //                 accelerator: "Command+R",
      //                 click() {
      //                   mainWindow.webContents.reload();
      //                 }
      //               },
      //               {
      //                 label: "Toggle Full Screen",
      //                 accelerator: "Ctrl+Command+F",
      //                 click() {
      //                   mainWindow.setFullScreen(!mainWindow.isFullScreen());
      //                 }
      //               },
      //               {
      //                 label: "Toggle Developer Tools",
      //                 accelerator: "Alt+Command+I",
      //                 click() {
      //                   mainWindow.toggleDevTools();
      //                 }
      //               }
      //             ]
      //           : [
      //               {
      //                 label: "Toggle Full Screen",
      //                 accelerator: "Ctrl+Command+F",
      //                 click() {
      //                   mainWindow.setFullScreen(!mainWindow.isFullScreen());
      //                 }
      //               }
      //             ]
      //     },
      //     {
      //       label: "Window",
      //       submenu: [
      //         {
      //           label: "Minimize",
      //           accelerator: "Command+M",
      //           selector: "performMiniaturize:"
      //         },
      //         {
      //           label: "Close",
      //           accelerator: "Command+W",
      //           selector: "performClose:"
      //         },
      //         {
      //           type: "separator"
      //         },
      //         {
      //           label: "Bring All to Front",
      //           selector: "arrangeInFront:"
      //         }
      //       ]
      //     },
      //     {
      //       label: "Help",
      //       submenu: []
      //     }
      //   ];

      //   menu = Menu.buildFromTemplate(template);
      //   Menu.setApplicationMenu(menu);
      // } else {
      template = [
        {
          label: "&Project",
          submenu: [
            {
              label: "&Open Project...",
              accelerator: "Ctrl+O",
              click() {
                mainWindow.webContents.send("open-project");
              }
            },
            {
              label: "&Create Project...",

              click() {
                mainWindow.webContents.send("create-project");
              }
            },
            {
              label: "&Start Screen",

              click() {
                mainWindow.webContents.send("start-screen");
              }
            },
            { type: "separator" },
            {
              label: "Export &Sessions...",
              enabled: false
            },
            {
              label: "Export &People...",
              enabled: false
            },
            {
              label: "&Archive using IMDI...",
              enabled: false
            },
            { type: "separator" },
            { role: "quit" }
          ]
        },
        {
          label: "&View",
          submenu:
            process.env.NODE_ENV === "development"
              ? [
                  {
                    label: "&Reload",
                    accelerator: "Ctrl+R",
                    click() {
                      mainWindow.webContents.reload();
                    }
                  },
                  {
                    label: "Toggle &Developer Tools",
                    accelerator: "Alt+Ctrl+I",
                    click() {
                      mainWindow.toggleDevTools();
                    }
                  }
                ]
              : []
        },
        {
          label: "Help",
          submenu: []
        }
      ];
      menu = Menu.buildFromTemplate(template);
      mainWindow.setMenu(menu);
    }
    //  }
  )
);
