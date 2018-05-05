import { Menu, remote } from "electron";
import HomePage from "./containers/HomePage";

export default class SayLessMenu {
  private homePage: HomePage;
  public constructor(homePage: HomePage) {
    this.homePage = homePage;
  }

  public buildMainMenu() {}
  public updateMainMenu() {
    const mainWindow = remote.getCurrentWindow(); // as any;
    const template = [
      {
        label: "&Project",
        submenu: [
          {
            label: "&Open Project...",
            accelerator: "Ctrl+O",
            click: () => this.homePage.openProject()
          },
          {
            label: "&Create Project...",
            click: () => this.homePage.createProject(false)
          },
          {
            label: "&Start Screen",
            click: () => this.homePage.projectHolder.setProject(null)
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
        label: "&Session",
        submenu: [
          {
            label: "Delete Session...",
            enabled:
              this.homePage.projectHolder.project &&
              this.homePage.projectHolder.project.canDeleteCurrentSession(),
            click: () => {
              if (this.homePage.projectHolder.project) {
                this.homePage.projectHolder.project.deleteCurrentSession();
              }
            }
          }
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
                    mainWindow.webContents.toggleDevTools();
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
    const menu = remote.Menu.buildFromTemplate(
      template as Electron.MenuItemConstructorOptions[]
    );

    mainWindow.setMenu(menu);
    //Menu.setApplicationMenu(menu);
  }
  public setupContentMenu() {
    if (process.env.NODE_ENV === "development") {
      // note that where UI elements offer a context menu to the user, they should
      // do an e.preventDefault() to prevent this code from hiding their menu.
      //https://github.com/electron/electron/blob/master/docs/api/web-contents.md#event-context-menu
      //https://nodejs.org/api/events.html#events_class_eventemitter
      const webContents = remote.getCurrentWebContents();
      remote.getCurrentWebContents().on("context-menu", (e, props) => {
        const { x, y } = props;
        console.log("Main process go context click");
        remote.Menu.buildFromTemplate([
          {
            label: "Inspect element",
            click() {
              remote.getCurrentWebContents().inspectElement(x, y);
            }
          }
        ]).popup({});
      });
    }
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
  // template = [
  //   {
  //     label: "&Project",
  //     submenu: [
  //       {
  //         label: "&Open Project...",
  //         accelerator: "Ctrl+O",
  //         click() {
  //           mainWindow.webContents.send("open-project");
  //         }
  //       },
  //       {
  //         label: "&Create Project...",

  //         click() {
  //           mainWindow.webContents.send("create-project");
  //         }
  //       },
  //       {
  //         label: "&Start Screen",

  //         click() {
  //           mainWindow.webContents.send("start-screen");
  //         }
  //       },
  //       { type: "separator" },
  //       {
  //         label: "Export &Sessions...",
  //         enabled: false
  //       },
  //       {
  //         label: "Export &People...",
  //         enabled: false
  //       },
  //       {
  //         label: "&Archive using IMDI...",
  //         enabled: false
  //       },
  //       { type: "separator" },
  //       { role: "quit" }
  //     ]
  //   },
  //   {
  //     label: "&Session",
  //     submenu: [
  //       {
  //         label: "Delete Session...",
  //         click() {
  //           mainWindow.webContents.send("delete-session");
  //         }
  //       }
  //     ]
  //   },
  //   {
  //     label: "&View",
  //     submenu:
  //       process.env.NODE_ENV === "development"
  //         ? [
  //             {
  //               label: "&Reload",
  //               accelerator: "Ctrl+R",
  //               click() {
  //                 mainWindow.webContents.reload();
  //               }
  //             },
  //             {
  //               label: "Toggle &Developer Tools",
  //               accelerator: "Alt+Ctrl+I",
  //               click() {
  //                 mainWindow.toggleDevTools();
  //               }
  //             }
  //           ]
  //         : []
  //   },
  //   {
  //     label: "Help",
  //     submenu: []
  //   }
  // ];
  // menu = Menu.buildFromTemplate(template);
  // mainWindow.setMenu(menu);
}
