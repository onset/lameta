// Main-process side of the IPC that the renderer uses for menus, app paths, start-up
// arguments, spell checking, and window events. The renderer side is src/other/windowIpc.ts.

import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  session,
  WebContents,
} from "electron";

// A menu template item as the renderer sends it: its click callback stays in the
// renderer, and only the number that identifies the callback comes here.
type IpcMenuItem = Omit<MenuItemConstructorOptions, "click" | "submenu"> & {
  clickId?: number;
  submenu?: IpcMenuItem[];
};

function buildMenu(
  template: IpcMenuItem[],
  sender: WebContents,
  kind: "application" | "popup",
  generation: number,
): Menu {
  const convert = (item: IpcMenuItem): MenuItemConstructorOptions => {
    const { clickId, submenu, ...rest } = item;
    const options: MenuItemConstructorOptions = { ...rest };
    if (clickId !== undefined) {
      options.click = () => {
        if (!sender.isDestroyed()) sender.send("windowIpc.menuClick", kind, generation, clickId);
      };
    }
    if (submenu) options.submenu = submenu.map(convert);
    return options;
  };
  return Menu.buildFromTemplate(template.map(convert));
}

const webContentsCommands = [
  "cut",
  "copy",
  "paste",
  "selectAll",
  "replaceMisspelling",
  "inspectElement",
  "toggleDevTools",
] as const;

ipcMain.on("windowIpc.getPath", (event, name: Parameters<typeof app.getPath>[0]) => {
  event.returnValue = app.getPath(name);
});
ipcMain.on("windowIpc.getAppPath", (event) => {
  event.returnValue = app.getAppPath();
});
// set by main.ts when lameta was started by opening an .sprj file
ipcMain.on("windowIpc.getStartupArguments", (event) => {
  event.returnValue = (global as any).arguments ?? null;
});
ipcMain.on("windowIpc.setTitle", (event, title: string) => {
  BrowserWindow.fromWebContents(event.sender)?.setTitle(title);
});
ipcMain.on("windowIpc.quit", () => {
  app.quit();
});
ipcMain.on("windowIpc.setApplicationMenu", (event, template: IpcMenuItem[], generation: number) => {
  Menu.setApplicationMenu(buildMenu(template, event.sender, "application", generation));
});
ipcMain.on("windowIpc.popupMenu", (event, template: IpcMenuItem[], generation: number) => {
  const window = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  buildMenu(template, event.sender, "popup", generation).popup({ window });
});
ipcMain.on(
  "windowIpc.webContents",
  (event, command: (typeof webContentsCommands)[number], ...args: any[]) => {
    if (!webContentsCommands.includes(command)) return;
    (event.sender[command] as (...a: any[]) => void)(...args);
  },
);
ipcMain.on("windowIpc.addWordToSpellCheckerDictionary", (_event, word: string) => {
  session.defaultSession.addWordToSpellCheckerDictionary(word);
});

// Forwards the window events that the renderer listens for.
export function forwardWindowEvents(win: BrowserWindow) {
  win.on("blur", () => {
    if (!win.webContents.isDestroyed()) win.webContents.send("windowIpc.blur");
  });
  win.webContents.on("context-menu", (_event, params) => {
    win.webContents.send("windowIpc.contextMenu", {
      x: params.x,
      y: params.y,
      misspelledWord: params.misspelledWord,
      dictionarySuggestions: params.dictionarySuggestions,
      isEditable: params.isEditable,
      selectionText: params.selectionText,
      editFlags: params.editFlags,
    });
  });
}
