// Pure helpers for locating plugin sidecar files and validating sidecar names.
//
// Sidecars live at:
//   <folder.directory>/plugin-data/<pluginId>/<describedFileName>.<name>.json
//
// The `plugin-data` subfolder is invisible to lameta's file list (Folder.loadChildFiles
// skips directories), so sidecars never appear as phantom file rows. We always key off the
// owning folder's directory — NOT the media file's own directory — because linked media may
// live outside the project.
//
// No filesystem IO here; the bridge does the actual reading/writing/listing. Keeping this
// pure makes traversal-safety and naming trivially unit-testable.

import * as Path from "path";

export const PLUGIN_DATA_FOLDER = "plugin-data";

// Sidecar names are used to build a filename segment, so restrict to a safe set. This also
// blocks path traversal ("../") and separators.
export const SIDECAR_NAME_REGEX = /^[a-z0-9_-]+$/i;

export const DEFAULT_SIDECAR_NAME = "annotations";

export function isValidSidecarName(name: string): boolean {
  return typeof name === "string" && SIDECAR_NAME_REGEX.test(name);
}

/** The directory holding all of one plugin's sidecars for a folder. */
export function getPluginDataDir(
  folderDirectory: string,
  pluginId: string
): string {
  return Path.join(folderDirectory, PLUGIN_DATA_FOLDER, pluginId);
}

/**
 * Build the absolute path to a specific sidecar. Throws on an invalid name, and (defensively)
 * if the resolved path would escape the plugin's data directory.
 */
export function getSidecarPath(
  folderDirectory: string,
  pluginId: string,
  describedFileName: string,
  name: string = DEFAULT_SIDECAR_NAME
): string {
  if (!isValidSidecarName(name)) {
    throw new Error(
      `Invalid sidecar name "${name}"; must match ${SIDECAR_NAME_REGEX}`
    );
  }
  const dir = getPluginDataDir(folderDirectory, pluginId);
  const fullPath = Path.join(dir, `${describedFileName}.${name}.json`);

  // Defense in depth: ensure we stay inside the plugin's data dir.
  const rel = Path.relative(dir, fullPath);
  if (rel.startsWith("..") || Path.isAbsolute(rel)) {
    throw new Error(
      `Refusing to write sidecar outside plugin data directory (name="${name}", file="${describedFileName}")`
    );
  }
  return fullPath;
}

/**
 * Given a sidecar file's basename and the described file name, return the sidecar `name`
 * segment, or null if the basename isn't a sidecar for that file. Used by listSidecars.
 * e.g. ("ETR009_Careful.mp3.annotations.json", "ETR009_Careful.mp3") -> "annotations"
 */
export function parseSidecarName(
  sidecarBasename: string,
  describedFileName: string
): string | null {
  const prefix = `${describedFileName}.`;
  const suffix = ".json";
  if (
    !sidecarBasename.startsWith(prefix) ||
    !sidecarBasename.endsWith(suffix)
  ) {
    return null;
  }
  const middle = sidecarBasename.slice(
    prefix.length,
    sidecarBasename.length - suffix.length
  );
  if (!isValidSidecarName(middle)) return null;
  return middle;
}
