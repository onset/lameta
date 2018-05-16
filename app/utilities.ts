const electron = require("electron");

export function showInExplorer(path: string) {
  if (process.platform === "win32") {
    //https://github.com/electron/electron/issues/11617
    path = replaceall("/", "\\", path);
  }
  electron.shell.showItemInFolder(path);
}

export function replaceall(
  replaceThis: string,
  withThis: string,
  inThis: string
) {
  withThis = withThis.replace(/\$/g, "$$$$");
  return inThis.replace(
    new RegExp(
      replaceThis.replace(
        /([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|<>\-\&])/g,
        "\\$&"
      ),
      "g"
    ),
    withThis
  );
}
