import * as Path from "path";

// This all used to be complicated, but it's been simplified so much I'm almost ready to retire it.

export function locateDependencyForFilesystemCall(
  relativePath: string
): string {
  const appPath = require("@electron/remote").app.getAppPath();
  let adjustedPath = "";
  if (appPath.indexOf("app.asar") >= 0) {
    // Running from windows install, or
    //adjustedPath = Path.join(appPath, "../..", relativePath);
    adjustedPath = Path.join(appPath, relativePath);
  } else {
    // runtime, appPath is just the root folder
    adjustedPath = Path.join(appPath, relativePath);
  }

  console.log(
    `locateDependencyForFilesystemCall(${relativePath}) appPath=${appPath} adjustedPath=${adjustedPath}`
  );
  return adjustedPath;
}

export function locateDependencyForBrowserUrl(relativePath: string): string {
  // note that the base directory for browser stuff is "dist/". In electron-builder.json5, we
  // tell it to put "assets/" under "dist/", so it all works out something like "assets/foo.png" will just work
  // without us having to do anything special.
  return relativePath;
}
