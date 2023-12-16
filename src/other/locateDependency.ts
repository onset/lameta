import * as Path from "path";
import { app } from "@electron/remote";

// When running from dev server, "locale/"" and "sample datat/" are at the current working directory.
//        cwd=C:\dev\lameta
//        appPath=C:\dev\lameta
// When installed, they at at the root of the ASAR file.
//        cwd=C:\dev\lameta
//        appPath=C:\dev\lameta\release\win-unpacked\resources\app.asar

// Note: this can't be called from the main process, because it uses `remote` to get at the app path.
// The main process has to use "electron/app" to get it.
export function locateDependencyForFilesystemCall(
  relativePath: string
): string {
  const appPath = app.getAppPath();
  const adjustedPath = Path.join(appPath, relativePath);
  // print cwd
  // console.log(`locateDependencyForFilesystemCall() cwd=${process.cwd()}`);
  // console.log(
  //   `locateDependencyForFilesystemCall() appPath=${require("@electron/remote").app.getAppPath()}`
  // );
  // console.log(
  //   `locateDependencyForFilesystemCall(${relativePath})  adjustedPath=${adjustedPath}`
  // );
  return adjustedPath;
}

export function locateDependencyForBrowserUrl(relativePath: string): string {
  // note that the base directory for browser stuff is "dist/". In electron-builder.json5, we
  // tell it to put "assets/" under "dist/", so it all works out something like "assets/foo.png" will just work
  // without us having to do anything special.
  return relativePath;
}
