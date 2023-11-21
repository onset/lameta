import * as Path from "path";
import * as fs from "fs-extra";

// Find a file or directory that is part of the distribution.
// The path will vary when we're running from source vs in an asar-packaged mac app.
// See https://github.com/electron-userland/electron-builder/issues/751

const fileLocationCache = new Map<string, string>();

export function locateWithApp(appPath: string, relativePath: string): string {
  const cached = fileLocationCache.get(relativePath);
  if (cached) return cached;

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
  } else if (appPath.indexOf("dist") >= 0) {
    // After a "yarn build-production", "yarn start", we are coming from lameta/app/dist. Just need to go up to app/
    adjustedPath = Path.join(appPath, "..", relativePath);
  } else {
    // runtime, appPath is just the root folder
    adjustedPath = Path.join(appPath, relativePath);
  }
  // console.log(
  //   `locate(${relativePath}) appPath=${appPath} adjustment= ${adjustedPath}`
  // );

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
