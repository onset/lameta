const electron = require("electron");
import * as Path from "path";
import * as fs from "fs-extra";
import { PatientFS } from "./patientFile";
import { t } from "@lingui/macro";
import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
import { globSync } from "glob";

export function revealInFolder(path: string) {
  console.log("Revealing in folder:", path);
  if (!path) return;
  if (process.platform === "win32") {
    path = path.replace(/\//g, "\\");
  }
  mainProcessApi.revealInFolder(path);
}

export async function asyncTrash(path: string) {
  return await asyncTrashWithContext<null>(path, null);
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

// normalize both in terms of resolving things like ".." but also going to posix path separators
export function normalizePath(path: string): string {
  return Path.normalize(path).replace(/\\/g, "/");
}

// on a recent macos/electron, copying sample data to the user's home directory was working but
// the result was that the user did not have permissions to any of the folders! I tried
// various approaches to fix the permissions after the directories were created, but
// they failed. So insted here we creat the directories and then copy the files into them,
// setting the permissions of the copied files as we go,
export function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = Path.join(src, entry.name);
    const destPath = Path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      fs.chmodSync(destPath, 0o777); // Change the permissions here
    }
  }
}

// this is "safe" because it escapes all characters that glob might interpret and works on windows
// this is "limited" because it does not allow for things like [ and ] in the path
function globSyncSaferAndLimited(pattern: string): string[] {
  let p;
  if (process.platform === "win32") {
    p = pattern.replace(/\\/g, "/"); // deal with windows paths
  } else {
    p = pattern;
  }
  // escape() does not work, at least on windows and glob 9.3 const safeDirectory = escape(pattern);
  p = p.replace(/\[/g, "\\[").replace(/\]/g, "\\]"); // deal with brackets in the path
  return globSync(p);
}

export function getAllFilesSync(directory: string): string[] {
  return globSyncSaferAndLimited(Path.join(directory, "*.*"));
}
