import * as Path from "path";

// When running from dev server, "locale/"" and "sample datat/" are at the current working directory.
// When installed, they at at the root of the ASAR file.

export function locateDependencyForFilesystemCall(
  relativePath: string
): string {
  const appPath = require("@electron/remote").app.getAppPath();
  const adjustedPath = Path.join(appPath, relativePath);

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
