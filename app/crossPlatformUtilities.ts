const electron = require("electron");
import { remote } from "electron";
import * as Path from "path";
import * as fs from "fs-extra";

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
  const fixedPath = Path.normalize(path).replace("/", Path.sep);
  const success = electron.shell.moveItemToTrash(fixedPath);
  if (!success) {
    window.alert("Failed to delete " + fixedPath);
  }
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

export function locate(relativePath: string): string {
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
    // After a "yarn build-production", "yarn start", we are coming from sayless/app/dist. Just need to go up to app/
    adjustedPath = Path.join(appPath, "..", relativePath);
  }
  //console.log(`locate(${path})  adjustment= ${adjustment}`);

  try {
    const result = fs.realpathSync(adjustedPath);
    //console.log(`locate(${path})  result= ${result}`);
    return result;
  } catch (err) {
    // console.error(
    //   `Could not find: ${relativePath}. Looked in ${adjustedPath}. appPath was ${appPath}`
    // );
    return "";
  }
}
