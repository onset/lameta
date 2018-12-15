import { Menu, remote, ipcRenderer } from "electron";
import HomePage from "./containers/HomePage";
import ImdiGenerator from "./export/ImdiGenerator";
import log from "./log";
import ExportDialog from "./components/export/ExportDialog";
import { t } from "@lingui/macro";
import { i18n, setUILanguage } from "l10nUtils";

export default class SayLessMenu {
  private homePage: HomePage;
  public constructor(homePage: HomePage) {
    this.homePage = homePage;

    // add some hotkeys that will work even in production, in case we need
    // to debug
    // const hotkeys = require("hotkeys-js");
    // hotkeys("alt+ctrl+i", (event, handler) => {
    //   event.preventDefault();
    //   remote.getCurrentWindow().webContents.toggleDevTools();
    // });
    // hotkeys("ctrl+r", (event, handler) => {
    //   event.preventDefault();
    //   remote.getCurrentWindow().webContents.reload();
    // });
  }

  public updateMainMenu(sessionMenu: any, peopleMenu: any) {
    log.info("updateMainMenu");
    const haveProject = true; //this.homePage.projectHolder.project;
    const mainWindow = remote.getCurrentWindow();
    const macMenu = {
      label: "SayMore X",
      submenu: [
        {
          label: "About SayMore X",
          selector: "orderFrontStandardAboutPanel:"
        },
        {
          type: "separator"
        },
        {
          label: "Services",
          submenu: []
        },
        {
          type: "separator"
        },
        {
          label: "Hide SayMore X",
          accelerator: "Command+H",
          selector: "hide:"
        },
        {
          label: "Hide Others",
          accelerator: "Command+Shift+H",
          selector: "hideOtherApplications:"
        },
        {
          label: "Show All",
          selector: "unhideAllApplications:"
        },
        {
          type: "separator"
        },
        {
          label: "Quit",
          accelerator: "Command+Q",
          click() {
            remote.app.quit();
          }
        }
      ]
    };
    const projectMenu = {
      label: "&" + i18n._(t`Project`),
      submenu: [
        {
          label: "&" + i18n._(t`Open Project...`),
          accelerator: "Ctrl+O",
          click: () => this.homePage.openProject()
        },
        {
          label: "&" + i18n._(t`Create Project...`),
          click: () => this.homePage.createProject(false)
        },
        {
          label: "&" + i18n._(t`Start Screen`),
          click: () => this.homePage.projectHolder.setProject(null)
        },
        { type: "separator" },
        {
          label: "&" + i18n._(t`Export Project...`),
          accelerator: "Ctrl+E",
          enabled: haveProject,
          click: () => {
            ExportDialog.show();
          }
        },
        { type: "separator" },
        {
          label: i18n._(t`Interface Language`),
          submenu: [
            {
              label: "English",
              click: () => {
                setUILanguage("en");
              }
            },
            {
              label: "Español",
              click: () => {
                setUILanguage("es");
              }
            }
          ]
        },
        { type: "separator" },
        { role: "quit" }
      ]
    };
    // sessionMenu,
    // peopleMenu,
    const devMenu = {
      label: "&Developer",
      submenu: [
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
        },
        {
          label: "Test throw",
          click() {
            throw new Error("Test throw from menu");
          }
        },
        {
          label: "Test bugsnag",
          click() {}
        }
      ]
    };
    const testMenu = {
      label: "Test",
      submenu: [
        {
          label: "Menu Test",
          click() {
            mainWindow.setTitle("Menu Test Invoked");
          }
        },
        {
          label: "Send Error Report Test",
          click() {
            throw new Error("Test error from menu " + new Date().getTime()); // add timestamp so that sentry doesn't swallow duplicates
          }
        }
      ]
    };
    const helpMenu = {
      label: "Help",
      submenu: []
    };

    const template = Array<any>();
    if (process.platform === "darwin") {
      template.push(macMenu);
    }
    // use sessionMenu being undefined to signal that we are in the start screen, so these menus are just confusing
    if (sessionMenu) {
      template.push(projectMenu, sessionMenu, peopleMenu);
    }
    // if (process.env.NODE_ENV === "development") {
    template.push(devMenu);
    //  }
    //if (process.env.NODE_ENV === "test") {
    template.push(testMenu);
    //}
    const menu = remote.Menu.buildFromTemplate(
      template as Electron.MenuItemConstructorOptions[]
    );

    remote.Menu.setApplicationMenu(menu);
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
}
