import { shell } from "electron";
import * as remote from "@electron/remote";
import { IHomePageMenuConnections } from "../containers/HomePage";
import log from "./log";
import { ShowExportDialog } from "../components/export/ExportDialog";
import { setUILanguage, currentUILanguage } from "./localization";
import { t } from "@lingui/macro";
import userSettings from "./UserSettings";
import RegistrationDialog from "../components/registration/RegistrationDialog";
import { initializeSentry } from "./errorHandling";
import { ShowMessageDialog } from "../components/ShowMessageDialog/MessageDialog";
import userSettingsSingleton from "./UserSettings";
import { CopyManager } from "./CopyManager";
import { ShowReleasesDialog } from "../components/ReleasesDialog";
import { ShowMediaFolderDialog } from "../components/MediaFolderDialog";
import { ShowCreditsDialog } from "./CreditsDialog";
import pkg from "package.json";
import { getTestEnvironment } from "../getTestEnvironment";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { Project } from "../model/Project/Project";

export default class LametaMenu {
  private homePage: IHomePageMenuConnections;
  public constructor(homePage: IHomePageMenuConnections) {
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

    const haveProject = this.homePage.projectHolder.project !== null;
    // console.log(
    //   `updating Main Menu. haveProject=${haveProject.toLocaleString()}`
    // );
    const mainWindow = remote.getCurrentWindow();
    const macMenu = {
      label: t`lameta`,
      submenu: [
        {
          label: t`About lameta`,
          selector: "orderFrontStandardAboutPanel:"
        },
        {
          type: "separator"
        },
        {
          label: t`Services`,
          submenu: []
        },
        {
          type: "separator"
        },
        {
          label: t`Hide lameta`,
          accelerator: "Command+H",
          selector: "hide:"
        },
        {
          label: t`Hide Others`,
          accelerator: "Command+Shift+H",
          selector: "hideOtherApplications:"
        },
        {
          label: t`Show All`,
          selector: "unhideAllApplications:"
        },
        {
          type: "separator"
        },
        {
          label: t`Quit`,
          accelerator: "Command+Q",
          click() {
            remote.app.quit();
          }
        }
      ]
    };
    const editMenu = {
      label: t`Edit`,
      submenu: [
        {
          label: t`Undo`,
          accelerator: "CmdOrCtrl+Z",
          selector: "undo:"
        },
        {
          label: t`Redo`,
          accelerator: "Shift+CmdOrCtrl+Z",
          selector: "redo:"
        },
        { type: "separator" },
        { label: t`Cut`, accelerator: "CmdOrCtrl+X", selector: "cut:" },
        {
          label: t`Copy`,
          accelerator: "CmdOrCtrl+C",
          selector: "copy:"
        },
        {
          label: t`Paste`,
          accelerator: "CmdOrCtrl+V",
          selector: "paste:"
        },
        {
          label: t`Select All`,
          accelerator: "CmdOrCtrl+A",
          selector: "selectAll:"
        }
      ]
    };

    const fileMenu = {
      label: "&" + t`File`,
      submenu: [
        {
          label: "&" + t`Open Project...`,
          accelerator: "CmdOrCtrl+O",
          click: () => this.homePage.openProject()
        },
        {
          // Mystery: if we have label: "&" + t`Create Project...`, then this actually gets run
          // whenever we refresh during development mode. I can't figure out what is simulating
          // an alt+f,alt+c
          // But later, this came back.
          label: t`Create Project...`,
          click: () => this.homePage.createProject(false)
        },
        {
          label: "&" + t`Start Screen`,
          click: () => this.homePage.projectHolder.setProject(null)
        },
        { type: "separator" },
        {
          label: "&" + t`Export Project...`,
          accelerator: "CmdOrCtrl+E",
          enabled: haveProject,
          click: () => {
            ShowExportDialog();
          }
        },
        {
          label: "&" + t`Media Folder Settings...`,
          enabled: haveProject,
          click: () => {
            ShowMediaFolderDialog();
          }
        }
      ]
    };
    if (fileMenu && process.platform !== "darwin") {
      fileMenu.submenu.push({ type: "separator" });
      fileMenu.submenu.push({ role: "quit" } as any);
    }

    const viewMenu = {
      label: "&" + t`View`,
      submenu: [
        {
          label: t`Font Size`,

          submenu: [
            {
              label: t`Smaller`,
              accelerator: "CmdOrCtrl+-",
              click: () => {
                userSettingsSingleton.ZoomFont(-1);
              }
            },
            {
              label: t`Larger`,
              accelerator: "CmdOrCtrl+=",
              click: () => {
                userSettingsSingleton.ZoomFont(1);
              }
            }
          ]
        },
        {
          label: t`Interface Language`,

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
              label: "Español",
              type: "radio",
              click: () => {
                setUILanguage("es");
              },
              checked: currentUILanguage === "es"
            },
            {
              label: "简体中文",
              type: "radio",
              click: () => {
                setUILanguage("zh-CN");
              },
              checked: currentUILanguage === "zh-CN"
            },
            {
              label: "Français",
              type: "radio",
              click: () => {
                setUILanguage("fr");
              },
              checked: currentUILanguage === "fr"
            },
            {
              label: "Bahasa Indonesia",
              type: "radio",
              click: () => {
                setUILanguage("id");
              },
              checked: currentUILanguage === "id"
            },
            {
              label: "فارسی",
              type: "radio",
              click: () => {
                setUILanguage("fa");
              },
              checked: currentUILanguage === "fa"
            },
            {
              label: "Portuguesa, Brasileiro",
              type: "radio",
              click: () => {
                setUILanguage("pt-BR");
              },
              checked: currentUILanguage === "pt-BR"
            },
            {
              label: "русский язык",
              type: "radio",
              click: () => {
                setUILanguage("ru");
              },
              checked: currentUILanguage === "ru"
            },
            userSettings.DeveloperMode
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
              label: t`Help translate`,
              click: () => {
                shell.openPath("https://crowdin.com/project/saymorex"); // haven't been able to correct this URL yet
              }
            }
          ]
        },
        {
          label: t`Show IMDI previews`,
          visible: GetOtherConfigurationSettings().archiveUsesImdi,
          // tooltip only works in macos
          tooltip:
            "Show IMDI output preview panels and indicate which fields don't have direct IMDI mappings",
          type: "checkbox",
          checked: userSettings.ShowIMDI,
          click: () => (userSettings.ShowIMDI = !userSettings.ShowIMDI)
        },
        {
          label: t`Show PARADISEC previews`,
          visible: GetOtherConfigurationSettings().archiveUsesParadisec,
          // tooltip only works in macos
          tooltip: "Show PARADISEC output preview panels",
          type: "checkbox",
          checked: userSettings.ParadisecMode,
          click: () =>
            (userSettings.ParadisecMode = !userSettings.ParadisecMode)
        },
        {
          label: Project.getMultilingualConversionPending()
            ? t`Show Language Tags (locked during migration)`
            : t`Show Language Tags`,
          visible: Project.getMetadataLanguageSlots().length > 1,
          // tooltip only works in macos
          tooltip: Project.getMultilingualConversionPending()
            ? "Language tags must remain visible until the multilingual migration is complete"
            : "Show language tags on multilingual fields (unknown languages always show ????)",
          type: "checkbox",
          // Force checked when migration is pending so users can verify language assignments
          checked:
            Project.getMultilingualConversionPending() ||
            userSettings.ShowLanguageTags,
          // Disable while migration is pending - tags must be visible during migration
          enabled: !Project.getMultilingualConversionPending(),
          click: () =>
            (userSettings.ShowLanguageTags = !userSettings.ShowLanguageTags)
        }
      ]
    };
    // sessionMenu,
    // peopleMenu,
    const devMenu = {
      label: "&Developer",
      submenu: [
        {
          label: "🚫 Disable Saving Project Data (for testing)",
          type: "checkbox",
          checked: userSettings.DisableSavingProjectData,
          click() {
            userSettings.DisableSavingProjectData =
              !userSettings.DisableSavingProjectData;
          }
        },
        {
          label: "Do not enforce any file naming",
          type: "checkbox",
          checked: userSettings.IgnoreFileNamingRules,
          click() {
            userSettings.IgnoreFileNamingRules =
              !userSettings.IgnoreFileNamingRules;
          }
        },
        {
          label: "&Reload",
          accelerator: "CmdOrCtrl+R",
          click() {
            mainWindow.webContents.reload();
          }
        },
        {
          label: "Soft Reload",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => this.homePage.softReload()
        },
        {
          label: "Abandon Copying",
          click() {
            CopyManager.abandonCopying(true);
          }
        },
        {
          label: "Toggle &Developer Tools",
          accelerator: "Alt+CmdOrCtrl+T",
          click() {
            mainWindow.webContents.toggleDevTools();
          }
        },
        {
          label: "Send errors to sentry",
          type: "checkbox",
          checked: userSettings.SendErrors,
          click() {
            userSettings.SendErrors = !userSettings.SendErrors;
            initializeSentry(userSettings.SendErrors);
          }
        },
        {
          label: "Test throw (for testing Sentry)",
          click() {
            initializeSentry(true);
            throw new Error(
              "Test throw from menu " + Date.now().toLocaleString()
            );
          }
        },
        {
          label: "Test alert dialog",
          click() {
            ShowMessageDialog({
              title: `The title`,
              text: "the text"
            });
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
        }
      ]
    };
    const helpMenu = {
      label: t`Help`,
      submenu: [
        {
          label: t`Registration...`,
          click: () => {
            RegistrationDialog.show();
          }
        },
        {
          label: t`Report a problem`,
          click: () => {
            shell.openPath("https://saymorex.page.link/problem");
          }
        },
        {
          type: "separator"
        },
        {
          label: t`Credits`,
          click: () => ShowCreditsDialog()
        },
        {
          label: t`Show Release Notes`,
          click: () => ShowReleasesDialog()
        },
        {
          label: "lameta " + pkg.version,
          enabled: false
        }
      ]
    };

    const template = Array<any>();
    if (process.platform === "darwin") {
      template.push(macMenu);
    }

    template.push(fileMenu);
    template.push(editMenu);
    template.push(viewMenu);

    // use sessionMenu being undefined to signal that we are in the start screen, so these menus are just confusing
    if (sessionMenu) {
      template.push(sessionMenu, peopleMenu);
    }

    template.push(helpMenu);

    if (
      // process.env.NODE_ENV === "development" ||
      // process.env.NODE_ENV === "test" ||
      userSettings.DeveloperMode ||
      getTestEnvironment().E2E
    ) {
      template.push(devMenu);
      //template.push(testMenu);
    }
    const menu = remote.Menu.buildFromTemplate(
      template as Electron.MenuItemConstructorOptions[]
    );

    remote.Menu.setApplicationMenu(menu);
  }
  public setupContentMenu() {
    // Set up context menu for spell checking, editing, and developer tools
    // This handler runs for all right-clicks in the app
    remote.getCurrentWebContents().on("context-menu", (e, props) => {
      const {
        x,
        y,
        misspelledWord,
        dictionarySuggestions,
        isEditable,
        selectionText,
        editFlags
      } = props;

      const menuItems: Electron.MenuItemConstructorOptions[] = [];
      const webContents = remote.getCurrentWebContents();

      // If there's a misspelled word, show spelling suggestions and "Add to Dictionary" option
      if (misspelledWord) {
        // Add spelling suggestions first
        if (dictionarySuggestions && dictionarySuggestions.length > 0) {
          for (const suggestion of dictionarySuggestions) {
            menuItems.push({
              label: suggestion,
              click: () => {
                // Replace the misspelled word with the selected suggestion
                webContents.replaceMisspelling(suggestion);
              }
            });
          }
          menuItems.push({ type: "separator" });
        }

        menuItems.push({
          label: t`Add to Dictionary`,
          click: () => {
            // Add word to Electron's built-in spell checker dictionary
            remote.session.defaultSession.addWordToSpellCheckerDictionary(
              misspelledWord
            );
          }
        });
      }

      // Add Cut/Copy/Paste options for editable fields or when there's a selection
      const hasSelection = selectionText && selectionText.length > 0;
      if (isEditable || hasSelection) {
        if (menuItems.length > 0) {
          menuItems.push({ type: "separator" });
        }

        // Cut - only for editable fields with selection
        if (isEditable && hasSelection) {
          menuItems.push({
            label: t`Cut`,
            enabled: editFlags.canCut,
            accelerator: "CmdOrCtrl+X",
            click: () => webContents.cut()
          });
        }

        // Copy - whenever there's a selection
        if (hasSelection) {
          menuItems.push({
            label: t`Copy`,
            enabled: editFlags.canCopy,
            accelerator: "CmdOrCtrl+C",
            click: () => webContents.copy()
          });
        }

        // Paste - only for editable fields
        if (isEditable) {
          menuItems.push({
            label: t`Paste`,
            enabled: editFlags.canPaste,
            accelerator: "CmdOrCtrl+V",
            click: () => webContents.paste()
          });
        }

        // Select All - for editable fields
        if (isEditable) {
          menuItems.push({ type: "separator" });
          menuItems.push({
            label: t`Select All`,
            enabled: editFlags.canSelectAll,
            accelerator: "CmdOrCtrl+A",
            click: () => webContents.selectAll()
          });
        }
      }

      // Add developer "Inspect element" option in development mode
      if (process.env.NODE_ENV === "development") {
        if (menuItems.length > 0) {
          menuItems.push({ type: "separator" });
        }
        menuItems.push({
          label: "Inspect element",
          click() {
            webContents.inspectElement(x, y);
          }
        });
      }

      // Only show the menu if there are items
      if (menuItems.length > 0) {
        remote.Menu.buildFromTemplate(menuItems).popup({});
      }
    });
  }
}
