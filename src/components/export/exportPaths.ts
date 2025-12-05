import * as Path from "path";
import { app } from "@electron/remote";
import { ensureDirSync, pathExistsSync } from "fs-extra";
import moment from "moment";

const sanitize = require("sanitize-filename");

/**
 * Get the default save path for CSV export.
 */
export const getPathForCsvSaving = (projectDisplayName: string): string => {
  const parent = Path.join(app.getPath("documents"), "lameta", "CSV Export");
  ensureDirSync(parent);
  return Path.join(
    parent,
    `${sanitize(projectDisplayName)} - lameta CSV Export - ${moment(
      new Date()
    ).format("YYYY-MM-DD")}.zip`
  );
};

/**
 * Get the default save path for Paradisec CSV export.
 */
export const getPathForParadisecSaving = (
  projectDisplayName: string
): string => {
  const parent = Path.join(app.getPath("documents"), "lameta", "CSV Export");
  ensureDirSync(parent);
  return Path.join(
    parent,
    `${sanitize(projectDisplayName)} - lameta Paradisec Export - ${moment(
      new Date()
    ).format("YYYY-MM-DD")}.csv`
  );
};

/**
 * Get the default save path for IMDI/OPEX export.
 * Adds a timestamp suffix if a folder for today already exists.
 */
export const getPathForIMDISaving = (
  projectDisplayName: string,
  exportFormat: string
): string => {
  const parent = Path.join(
    app.getPath("documents"),
    "lameta",
    "IMDI Packages"
  );
  ensureDirSync(parent);

  let folder = Path.join(
    parent,
    `${sanitize(projectDisplayName)} - lameta ${exportFormat} Export - ${moment(
      new Date()
    ).format("YYYY-MM-DD")}`
  );
  // Just that is what we would *like* to have, the problem is that since we are saving
  // a folder, and not a file, on subsequent saves the File Dialog will show *inside*
  // this folder, because it already exists. There does not appear to be a way to say
  // "Show this folder, then use this default name" as separate parameters. Very annoying.
  // So now we add the exact time if there is a already a folder from today.
  if (pathExistsSync(folder)) {
    folder = folder + " " + moment(new Date()).format("HH_mm_ss");
  }
  return folder;
};
