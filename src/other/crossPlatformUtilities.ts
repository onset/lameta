const electron = require("electron");
import * as remote from "@electron/remote";
import * as Path from "path";
import * as fs from "fs-extra";
import { PatientFS } from "./patientFile";
import { t } from "@lingui/macro";
import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
import { locateDependency } from "./locateDependency";

export function showInExplorer(path: string) {
  if (process.platform === "win32") {
    //https://github.com/electron/electron/issues/11617
    path = path.replace(/\//g, "\\\\");
  }
  electron.shell.showItemInFolder(path);
}
export async function asyncTrash(path: string) {
  return asyncTrashWithContext<null>(path, null);
}
export async function asyncTrashWithContext<T>(
  path: string,
  callerContext: T
): Promise<{ succeeded: boolean; path: string; context: T }> {
  // On windows, forward slash is normally fine, but electron.shell.moveItemToTrash fails.
  // So convert to backslashes as needed:
  const fixedPath = Path.normalize(path).replace("/", Path.sep); // ?

  const msg = t`lameta was not able to delete the file.`;

  PatientFS.assertWritePermissionWithNotification(fixedPath, msg);
  // NB: if the file is locked (at least on windows), electron 10 wrongly returns true for success, so
  // we verify that it is now not there.
  // To test this manually, try to trash a video while it is playing.
  if (electron?.shell) {
    try {
      const result = await mainProcessApi.trashItem(fixedPath);
      if (result)
        return Promise.resolve({
          succeeded: !fs.existsSync(fixedPath),
          path: path,
          context: callerContext
        });
      else
        return Promise.resolve({
          succeeded: false,
          path: path,
          context: callerContext
        });
    } catch (e) {
      return Promise.resolve({
        succeeded: false,
        path: path,
        context: callerContext
      });
    }
  } else {
    fs.removeSync(fixedPath); // unit tests, no electron available and we don't care about delete vs trash
    //console.log(`Deleting ${fixedPath} deleted: ${!fs.existsSync(fixedPath)}`);
    return Promise.resolve({
      succeeded: !fs.existsSync(fixedPath),
      path: path,
      context: callerContext
    }); // we don't get a result from removeSync
  }

  // enhance: this is lopsided because above we give an nice helpful message if certain problems occur.
  // But if we then fail in the actual moveItemTrash, well we just return false and leave it to the caller to communicate with the user.
}

export function locate(relativePath: string): string {
  //remote unavailable in unit tests (because I haven't figure out how to do it yet)
  const appPath = remote ? remote.app.getAppPath() : "";
  return locateDependency(relativePath, appPath);
}

// normalize both in terms of resolving things like ".." but also going to posix path separators
export function normalizePath(path: string): string {
  return Path.normalize(path).replace(/\\/g, "/");
}
