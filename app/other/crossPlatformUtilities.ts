const electron = require("electron");
import * as remote from "@electron/remote";
import * as Path from "path";
import * as fs from "fs-extra";
import { PatientFS } from "./patientFile";
import { t } from "@lingui/macro";

export function showInExplorer(path: string) {
  if (process.platform === "win32") {
    //https://github.com/electron/electron/issues/11617
    path = replaceall("/", "\\", path);
  }
  electron.shell.showItemInFolder(path);
}

export function trash(path: string): boolean {
  // On windows, forward slash is normally fine, but electron.shell.moveItemToTrash fails.
  // So convert to backslashes as needed:
  const fixedPath = Path.normalize(path).replace("/", Path.sep); // ?

  const msg = t`lameta was not able to delete the file.`;

  PatientFS.assertWritePermissionWithNotification(fixedPath, msg);
  // NB: if the file is locked (at least on windows), electron 10 wrongly returns true for success, so
  // we verify that it is now not there.
  // To test this manually, try to trash a video while it is playing.
  let success;
  if (electron?.shell) {
    // note in Electron 13 this will go away and be replaced with async trashItem().then();
    success = electron.shell.trashItem(fixedPath);
  } else {
    fs.rmdirSync(fixedPath, { recursive: true }); // unit tests, no electron available and we don't care about delete vs trash
    success = true; // we don't get a result from rmdirSync
  }
  success = success && !fs.existsSync(fixedPath);

  // enhance: this is lopsided because above we give an nice helpful message if certain problems occur.
  // But if we then fail in the actual moveItemTrash, well we just return false and leave it to the caller to communicate with the user.
  return success;
}

function replaceall(replaceThis: string, withThis: string, inThis: string) {
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

// Find a file or directory that is part of the distribution.
// The path will vary when we're running from source vs in an asar-packaged mac app.
// See https://github.com/electron-userland/electron-builder/issues/751

const fileLocationCache = new Map<string, string>();

export function locate(relativePath: string): string {
  const cached = fileLocationCache.get(relativePath);
  if (cached) return cached;

  //remote unavailable in unit tests (because I haven't figure out how to do it yet)
  const appPath = remote ? remote.app.getAppPath() : "";

  //console.log(`locate(${path})  appPath= ${appPath}`);

  // If we are run from outside of a packaged app, our working directory is the right place to be.
  // And no, we can't just set our working directory to somewhere inside the asar. The OS can't handle that.

  // appPath varies by platform and scenario:

  // windows from source: <somewhere>"\myapp\node_modules\electron\dist\resources\default_app.asar"
  // mac from source: <somewhere>"/myapp/node_modules/electron/dist/Electron.app/Contents/Resources/default_app.asar"

  //  windows from installed package: assets & sample data are one level up from apppath:
  //                        "C:\Users\me\AppData\Local\Programs\myapp\resources\app.asar"
  // mac from a package: <somewhere>"/my.app/Contents/Resources/app.asar"
  // windows from (uninstalled) package: assets & sample data are one level up from apppath:
  //                       <somewhere>"\myapp\release\win-unpacked\resources\app.asar"

  // In most cases, our extra files (assets/, sample data/) are all on the file system, and
  // the working directory is set such that they are the immediate children.

  // However when running from a packaged up mac app, the whole file tree has been encased in a single file,
  // and the working directory is who-knows-where; it cannot point into that archive.
  // However electron manages to intercept filesytem calls so you can point into the insides of the app.
  // In this case, apppPath will be <somewhere>/my.app/Contents/Resources/app.asar
  // But the root we want, to be the same as the other situations, is in my.app/contents.
  let adjustedPath = "";
  if (appPath.indexOf("default_app.asar") >= 0) {
    // mac installed. Leave adjustment alone.
    adjustedPath = relativePath;
  } else if (appPath.indexOf("app.asar") >= 0) {
    // Running from windows install, or
    adjustedPath = Path.join(appPath, "../..", relativePath);
  } else {
    // After a "yarn build-production", "yarn start", we are coming from lameta/app/dist. Just need to go up to app/
    adjustedPath = Path.join(appPath, "..", relativePath);
  }
  //console.log(`locate(${path})  adjustment= ${adjustment}`);

  try {
    const result = fs.realpathSync(adjustedPath);
    //console.log(`locate(${path})  result= ${result}`);
    fileLocationCache.set(relativePath, result);
    return result;
  } catch (err) {
    // console.error(
    //   `Could not find: ${relativePath}. Looked in ${adjustedPath}. appPath was ${appPath}`
    // );
    return "";
  }
}

// normalize both in terms of resolving things like ".." but also going to posix path separators
export function normalizePath(path: string): string {
  return Path.normalize(path).replace(/\\/g, "/");
}
