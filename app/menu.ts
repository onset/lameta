import { remote, shell } from "electron";
import HomePage from "./containers/HomePage";
import log from "./log";
import ExportDialog from "./components/export/ExportDialog";
import { t } from "@lingui/macro";
import { i18n, setUILanguage, currentUILanguage } from "./localization";
import { showIMDIPanels, setShowIMDIPanels } from "./settings";

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
      label: i18n._(t`SayMore X`),
      submenu: [
        {
          label: i18n._(t`About SayMore X`),
          selector: "orderFrontStandardAboutPanel:"
        },
        {
          type: "separator"
        },
        {
          label: i18n._(t`Services`),
          submenu: []
        },
        {
          type: "separator"
        },
        {
          label: i18n._(t`Hide SayMore X`),
          accelerator: "Command+H",
          selector: "hide:"
        },
        {
          label: i18n._(t`Hide Others`),
          accelerator: "Command+Shift+H",
          selector: "hideOtherApplications:"
        },
        {
          label: i18n._(t`Show All`),
          selector: "unhideAllApplications:"
        },
        {
          type: "separator"
        },
        {
          label: i18n._(t`Quit`),
          accelerator: "Command+Q",
          click() {
            remote.app.quit();
          }
        }
      ]
    };
    const editMenu = {
      label: i18n._(t`Edit`),
      submenu: [
        {
          label: i18n._(t`Undo`),
          accelerator: "CmdOrCtrl+Z",
          selector: "undo:"
        },
        {
          label: i18n._(t`Redo`),
          accelerator: "Shift+CmdOrCtrl+Z",
          selector: "redo:"
        },
        { type: "separator" },
        { label: i18n._(t`Cut`), accelerator: "CmdOrCtrl+X", selector: "cut:" },
        {
          label: i18n._(t`Copy`),
          accelerator: "CmdOrCtrl+C",
          selector: "copy:"
        },
        {
          label: i18n._(t`Paste`),
          accelerator: "CmdOrCtrl+V",
          selector: "paste:"
        },
        {
          label: i18n._(t`Select All`),
          accelerator: "CmdOrCtrl+A",
          selector: "selectAll:"
        }
      ]
    };

    const fileMenu = {
      label: "&" + i18n._(t`File`),
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
        }
      ]
    };
    if (fileMenu && process.platform !== "darwin") {
      fileMenu.submenu.push({ type: "separator" });
      fileMenu.submenu.push({ role: "quit" } as any);
    }

    const viewMenu = {
      label: "&" + i18n._(t`View`),
      submenu: [
        {
          label: "Show IMDI panels",
          type: "checkbox",
          checked: showIMDIPanels,
          click: () => setShowIMDIPanels(!showIMDIPanels)
        },
        {
          label: i18n._(t`Interface Language`),

          submenu: [
            {
              label: "English",
              type: "radio",
              click: () => {
                setUILanguage("en");
              },
              checked: currentUILanguage === "en"
            },
            {
              label: "Español (27%)",
              type: "radio",
              click: () => {
                setUILanguage("es");
              },
              checked: currentUILanguage === "es"
            },
            {
              label: "Français  (24%)",
              type: "radio",
              click: () => {
                setUILanguage("fr");
              },
              checked: currentUILanguage === "fr"
            },
            process.env.NODE_ENV === "development"
              ? {
                  label: "Pseudo",
                  type: "radio",
                  click: () => {
                    setUILanguage("ps");
                  },
                  checked: currentUILanguage === "ps"
                }
              : { type: "separator" },
            {
              label: "Help translate",
              click: () => {
                shell.openExternal("https://crowdin.com/project/saymorex");
              }
            }
          ]
        }
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
          label: "Test throw (for testing Sentry)",
          click() {
            throw new Error("Test throw from menu");
          }
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
      label: i18n._(t`Help`),
      submenu: []
    };

    const template = Array<any>();
    if (process.platform === "darwin") {
      template.push(macMenu);
    }

    // use sessionMenu being undefined to signal that we are in the start screen, so these menus are just confusing
    if (sessionMenu) {
      template.push(fileMenu);

      //if (process.platform === "darwin") {
      // in order to get normal editing keys to work (e.g. cmd-v for paste), I had
      // to add an edit menu on mac. If there is a way to get this without the menu,
      // that would be great.
      // Meanwhile, it's not clear where this should go in the order. If it's to the left
      // of the Project menu, that looks weird, because the Project menu acts like a "File" menu.
      template.push(editMenu);
      //}

      template.push(viewMenu);

      template.push(sessionMenu, peopleMenu);
    }

    if (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test"
    ) {
      template.push(devMenu);
      template.push(testMenu);
    }
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
}
