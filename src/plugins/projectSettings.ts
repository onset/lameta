// Pure helpers for a plugin's per-project settings (`api.getProjectSettings` /
// `api.setProjectSettings`).
//
// Each plugin's settings live in one JSON file inside the project folder:
//   <project directory>/plugin-data/<pluginId>/project-settings.json
// so they travel with the project to collaborators. The `plugin-data` folder is the same
// per-plugin namespace that file sidecars use; Folder.loadChildFiles skips directories, so the
// file never shows up in the project's file list, and the .sprj file stays untouched.
//
// No filesystem IO here; the bridge reads and writes the file.

import * as Path from "path";
import { getPluginDataDir } from "./sidecar";

export const PROJECT_SETTINGS_FILE_NAME = "project-settings.json";

/** The largest settings value a plugin may store, measured as UTF-8 bytes of its JSON text. */
export const PROJECT_SETTINGS_MAX_BYTES = 64 * 1024;

/** Nesting deeper than this is rejected, which also bounds the validator's recursion. */
const MAX_DEPTH = 64;

export function getProjectSettingsPath(projectDirectory: string, pluginId: string): string {
  return Path.join(getPluginDataDir(projectDirectory, pluginId), PROJECT_SETTINGS_FILE_NAME);
}

/**
 * Throw unless `value` is plain JSON: null, a boolean, a finite number, a string, an array, or
 * an object whose prototype is Object.prototype or null, all the way down, with no cycles.
 * postMessage's structured clone lets a plugin send Dates, Maps, typed arrays and cyclic
 * graphs, none of which survive JSON, so they are refused here instead of being silently
 * changed on disk.
 */
export function assertPlainJson(value: unknown, path = "value", depth = 0): void {
  if (depth > MAX_DEPTH) throw new Error(`${path} is nested more than ${MAX_DEPTH} levels deep`);
  if (value === null || typeof value === "boolean" || typeof value === "string") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertPlainJson(v, `${path}[${i}]`, depth + 1));
    return;
  }
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null)
      throw new Error(`${path} must be a plain object, array, string, number, boolean or null`);
    for (const key of Object.keys(value as object))
      assertPlainJson((value as Record<string, unknown>)[key], `${path}.${key}`, depth + 1);
    return;
  }
  throw new Error(`${path} must be a plain object, array, string, number, boolean or null`);
}

/**
 * Validate a plugin's settings value and return the text to write: indented JSON, so that a
 * collaborator's change shows up as a readable diff in whatever syncs the project.
 */
export function serializeProjectSettings(value: unknown): string {
  assertPlainJson(value);
  const text = JSON.stringify(value, null, 2);
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > PROJECT_SETTINGS_MAX_BYTES)
    throw new Error(
      `project settings are ${bytes} bytes of JSON; the limit is ${PROJECT_SETTINGS_MAX_BYTES}`,
    );
  return text;
}
