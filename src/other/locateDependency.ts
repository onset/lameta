import * as Path from "path";
import * as fs from "fs-extra";

// Find a file or directory that is part of the distribution.
// The path will vary when we're running from source vs in an asar-packaged mac app.
// See https://github.com/electron-userland/electron-builder/issues/751

const fileLocationCache = new Map<string, string>();

export function locateDependency(
  relativePath: string,
  appPath?: string
): string {
  if (appPath === undefined) {
    // check if we are running in the electron rendere process or the main process without accessing remote
    if (typeof window !== "undefined") {
      // we are dynamically loading so that we don't get an error when this code is used on the main process
      appPath = require("@electron/remote").app.getAppPath();
    } else {
      throw new Error("From Main Process, provide the appPath argument.");
    }
  }
  appPath = appPath!; // typescript doesn't understand that we've just set it

  const cached = fileLocationCache.get(relativePath);
  if (cached) return cached;

  //console.log(`locate(${path})  appPath= ${appPath}`);

  // If we are run from outside of a packaged app, our working directory is the right place to be.
  // And no, we can't just set our working directory to somewhere inside the asar. The OS can't handle that.
  // appPath varies by platform and scenario:

  // mac  and windows from `yarn dev`: just the root of the lameta directory
  // mac when packaged (haven't tried from installed yet): appPath= /Users/johnhatton/dev/lameta/release/mac-arm64/lameta.app/Contents/Resources/app.asar
  // windows from the release/unpacked directory: appPath= C:\Users\me\dev\lameta\release\win-unpacked\resources\app.asar
  // windows installed: appPath= <install dir>\resources\app.asar
  // note the difference in case for "Resources/"
  // In most cases, our extra files (assets/, sample data/) are all on the file system, and
  // the working directory is set such that they are the immediate children.

  // However when running from a packaged up mac app, the whole file tree has been encased in a single file,
  // and the working directory is who-knows-where; it cannot point into that archive.
  // However electron manages to intercept filesytem calls so you can point into the insides of the app.
  // In this case, apppPath will be <somewhere>/my.app/Contents/Resources/app.asar
  // But the root we want, to be the same as the other situations, is in my.app/contents.
  let adjustedPath = "";
  if (appPath.indexOf("app.asar") >= 0) {
    // Running from windows install, or
    adjustedPath = Path.join(appPath, "../..", relativePath);
  } else {
    // runtime, appPath is just the root folder
    adjustedPath = Path.join(appPath, relativePath);
  }
  console.log(`locate(${relativePath}) INITIAL adjustedPath= ${adjustedPath}`);

  try {
    adjustedPath = fs.realpathSync(adjustedPath);
    // if we're running on a mac
    if (process.platform === "darwin") {
      adjustedPath = adjustedPath.replace(appPath, "");
      console.log(
        `locate(${relativePath}) CHANGE FOR MAC adjustedPath= ${adjustedPath}`
      );
    }
    fileLocationCache.set(relativePath, adjustedPath);
  } catch (err) {
    console.error(
      `Could not find: ${relativePath}. Looked in ${adjustedPath}. appPath was ${appPath}`
    );
    adjustedPath = "";
  }

  console.log(
    `locate(${relativePath}) appPath=${appPath} FINAL adjustedPath=  ${adjustedPath}`
  );
  return adjustedPath;
}
