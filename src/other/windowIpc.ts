// Renderer side of the IPC for menus, app paths, start-up arguments, spell checking,
// and window events. The main-process side is src/mainProcess/windowIpc.ts.

import type { IpcRenderer, MenuItemConstructorOptions } from "electron";

function ipc(): IpcRenderer {
  return require("electron").ipcRenderer;
}

export function getPath(name: Parameters<Electron.App["getPath"]>[0]): string {
  return ipc().sendSync("windowIpc.getPath", name);
}

export function getAppPath(): string {
  return ipc().sendSync("windowIpc.getAppPath");
}

// ["ignore", path] when lameta was started by opening an .sprj file
export function getStartupArguments(): string[] | null {
  return ipc().sendSync("windowIpc.getStartupArguments");
}

// Sets the title of the window without changing the page's title.
export function setWindowTitle(title: string) {
  ipc().send("windowIpc.setTitle", title);
}

export function quitApp() {
  ipc().send("windowIpc.quit");
}

export function toggleDevTools() {
  ipc().send("windowIpc.webContents", "toggleDevTools");
}

export function addWordToSpellCheckerDictionary(word: string) {
  ipc().send("windowIpc.addWordToSpellCheckerDictionary", word);
}

export function runWebContentsCommand(
  command: "cut" | "copy" | "paste" | "selectAll" | "replaceMisspelling" | "inspectElement",
  ...args: any[]
) {
  ipc().send("windowIpc.webContents", command, ...args);
}

// Click callbacks cannot cross IPC, so each menu keeps its callbacks here and sends
// their numbers instead. A click names the menu generation it came from, so that a
// click on a menu that has since been replaced does not run a callback of the new one.
type MenuKind = "application" | "popup";
const menus: Record<MenuKind, { generation: number; clicks: Array<() => void> }> = {
  application: { generation: 0, clicks: [] },
  popup: { generation: 0, clicks: [] },
};
let listeningForMenuClicks = false;

function sendMenu(kind: MenuKind, channel: string, template: MenuItemConstructorOptions[]) {
  const menu = menus[kind];
  menu.generation++;
  menu.clicks = [];
  const convert = (item: MenuItemConstructorOptions): any => {
    const { click, submenu, ...rest } = item;
    const converted: any = { ...rest };
    if (click) {
      converted.clickId = menu.clicks.length;
      menu.clicks.push(click as () => void);
    }
    if (Array.isArray(submenu)) converted.submenu = submenu.map(convert);
    return converted;
  };
  const converted = template.map(convert);
  if (!listeningForMenuClicks) {
    listeningForMenuClicks = true;
    ipc().on("windowIpc.menuClick", (_event, kind: MenuKind, generation: number, id: number) => {
      if (menus[kind].generation === generation) menus[kind].clicks[id]?.();
    });
  }
  ipc().send(channel, converted, menu.generation);
}

export function setApplicationMenu(template: MenuItemConstructorOptions[]) {
  sendMenu("application", "windowIpc.setApplicationMenu", template);
}

export function popupMenu(template: MenuItemConstructorOptions[]) {
  sendMenu("popup", "windowIpc.popupMenu", template);
}

export type ContextMenuParams = Pick<
  Electron.ContextMenuParams,
  | "x"
  | "y"
  | "misspelledWord"
  | "dictionarySuggestions"
  | "isEditable"
  | "selectionText"
  | "editFlags"
>;

// HomePage sets this up again every time it updates, so each call replaces the previous
// handler. Otherwise one right-click would pop up several menus, and only the last
// one's clicks would run.
let contextMenuHandler: ((params: ContextMenuParams) => void) | undefined;
export function onContextMenu(handler: (params: ContextMenuParams) => void) {
  if (!contextMenuHandler) {
    ipc().on("windowIpc.contextMenu", (_event, params: ContextMenuParams) =>
      contextMenuHandler?.(params),
    );
  }
  contextMenuHandler = handler;
}

export function onWindowBlur(handler: () => void) {
  ipc().on("windowIpc.blur", handler);
}
