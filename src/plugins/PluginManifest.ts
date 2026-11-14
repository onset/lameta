// Parsing & validation of a plugin's `plugin.json5` (or `plugin.json`) manifest.
//
// `parsePluginManifest` is a pure function: give it the raw manifest text, get back
// either a validated manifest or a list of human-readable errors. It has no filesystem
// or electron dependencies so it is trivially unit-testable. Discovery code (PluginManager)
// is responsible for reading the file off disk and turning an {errors} result into a
// plugin record in the "error" state.

import JSON5 from "json5";
import { isSafeRelativePath } from "./companions";

/** A localizable label: either a plain string, or a map of language code -> string
 * (with "en" used as the fallback). */
export type LocalizableLabel = string | { [languageCode: string]: string };

export interface PluginTabMatch {
  /** lameta file-type strings, e.g. ["Audio"]. */
  lametaTypes?: string[];
  /** lowercase extensions without a dot, e.g. ["wav", "mp3"]. */
  extensions?: string[];
  /** mime patterns with optional trailing wildcard, e.g. ["audio/*", "image/png"]. */
  mimePatterns?: string[];
}

export interface PluginTabManifest {
  id: string;
  label: LocalizableLabel;
  /** HTML file (relative to the plugin folder) loaded into the tab's iframe. */
  entry: string;
  /** A tab matches a file if ANY criterion hits. All fields are optional; an empty/absent
   * match object never matches anything. */
  match?: PluginTabMatch;
  /** If true, this tab wants to be the initially-selected tab for matching files. */
  claimDefault?: boolean;
  /** Tiebreak among default claimants (higher wins); then plugin id, then tab id. */
  defaultPriority?: number;
}

/**
 * A tab PROVIDER: a hidden page lameta loads once and queries (on every selection change) for
 * which tabs to show. This is the current model; it supersedes a static `tabs` list by letting
 * the plugin decide tabs + labels live per file. See docs/plugin-authoring.md "Tab provider".
 */
export interface PluginTabProviderManifest {
  /** HTML file (relative to the plugin folder) lameta loads hidden to answer tab queries. */
  entry: string;
  /** OPTIONAL coarse capability filter — only query this provider for files matching ANY
   * criterion. Absent = queried for every selection. */
  handles?: PluginTabMatch;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: number;
  /** OPTIONAL user-facing (localizable) label; falls back to `name` where shown in the UI. */
  label?: LocalizableLabel;
  /** REQUIRED `infoUrl` in the manifest: a web page about the plugin. Plugin tab panes show
   * an "About Plugin: <name>" link that opens it in the user's default browser. */
  infoUrl: string;
  description?: string;
  author?: string;
  minLametaVersion?: string;
  /** Capabilities the plugin asks the host for. Each must be one of KNOWN_PERMISSIONS;
   * absent in the manifest text normalizes to []. */
  permissions: string[];
  /** The tab provider (current model). A manifest must declare `tabProvider` OR a non-empty
   * `tabs` list (legacy static tabs). */
  tabProvider?: PluginTabProviderManifest;
  /** Legacy static tab list. Prefer `tabProvider`. */
  tabs: PluginTabManifest[];
  /** OPTIONAL platforms (KNOWN_PLATFORMS keys) this package is built for. Absent means every
   * platform. lameta refuses to install or load a package that excludes the current one. */
  platforms?: string[];
  /** OPTIONAL native executables the plugin carries, by name (KNOWN_BINARIES) and then by
   * platform key, each a path relative to the plugin folder. */
  binaries?: PluginBinaries;
}

/** binary name -> platform key -> path relative to the plugin folder, with "/" separators. */
export type PluginBinaries = { [binaryName: string]: { [platformKey: string]: string } };

/** The permission strings this build of lameta understands. Anything else in a
 * manifest's `permissions` array is a validation error. */
export const KNOWN_PERMISSIONS = ["companionFiles", "ffmpeg", "saveFile", "projectSettings"];

/** Platform keys are `${process.platform}-${process.arch}`, for the platforms lameta builds for. */
export const KNOWN_PLATFORMS = [
  "win32-x64",
  "win32-arm64",
  "darwin-x64",
  "darwin-arm64",
  "linux-x64",
  "linux-arm64",
];

/** The executables a plugin may carry. The host only runs binaries it knows how to use. */
export const KNOWN_BINARIES = ["ffmpeg"];

/** The platform key of the machine lameta is running on, e.g. "darwin-arm64". */
export function currentPlatformKey(
  platform: string = process.platform,
  arch: string = process.arch,
): string {
  return `${platform}-${arch}`;
}

/** True when the manifest has no `platforms` list or its list includes `platformKey`. */
export function supportsPlatform(manifest: PluginManifest, platformKey: string): boolean {
  return !manifest.platforms || manifest.platforms.includes(platformKey);
}

export type ParseManifestResult =
  | { manifest: PluginManifest; errors?: undefined }
  | { manifest?: undefined; errors: string[] };

// Plugin ids namespace both the sidecar folder and the install folder, so keep them to a
// safe, filesystem-friendly character set.
export const PLUGIN_ID_REGEX = /^[a-z0-9][a-z0-9.-]*$/;

function isPlainObject(v: any): boolean {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function validateLabel(label: any, path: string, errors: string[]): void {
  if (typeof label === "string") {
    if (label.trim().length === 0) errors.push(`${path} must not be an empty string`);
    return;
  }
  if (isPlainObject(label)) {
    const keys = Object.keys(label);
    if (keys.length === 0) {
      errors.push(`${path} label map must have at least one language entry`);
      return;
    }
    for (const k of keys) {
      if (typeof label[k] !== "string") errors.push(`${path}.${k} must be a string`);
    }
    return;
  }
  errors.push(`${path} must be a string or a language-code map`);
}

function validateStringArray(value: any, path: string, errors: string[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array of strings`);
    return;
  }
  value.forEach((v, i) => {
    if (typeof v !== "string") errors.push(`${path}[${i}] must be a string`);
  });
}

/** Validate a match/handles object (both share the {lametaTypes,extensions,mimePatterns} shape)
 * and return the normalized form (extensions lowercased, dot stripped). */
function validateMatch(match: any, path: string, errors: string[]): PluginTabMatch | undefined {
  if (match === undefined) return undefined;
  if (!isPlainObject(match)) {
    errors.push(`${path} must be an object`);
    return undefined;
  }
  validateStringArray(match.lametaTypes, `${path}.lametaTypes`, errors);
  validateStringArray(match.extensions, `${path}.extensions`, errors);
  validateStringArray(match.mimePatterns, `${path}.mimePatterns`, errors);
  return {
    lametaTypes: match.lametaTypes,
    extensions: match.extensions
      ? match.extensions.map((e: string) => e.toLowerCase().replace(/^\./, ""))
      : undefined,
    mimePatterns: match.mimePatterns,
  };
}

function validateTabProvider(tp: any, errors: string[]): PluginTabProviderManifest | undefined {
  if (!isPlainObject(tp)) {
    errors.push("tabProvider must be an object");
    return undefined;
  }
  if (typeof tp.entry !== "string" || tp.entry.trim().length === 0)
    errors.push("tabProvider.entry is required and must be a non-empty string");
  const handles = validateMatch(tp.handles, "tabProvider.handles", errors);
  return { entry: tp.entry, handles };
}

function validateTab(tab: any, index: number, errors: string[]): PluginTabManifest | undefined {
  const path = `tabs[${index}]`;
  if (!isPlainObject(tab)) {
    errors.push(`${path} must be an object`);
    return undefined;
  }
  if (typeof tab.id !== "string" || tab.id.trim().length === 0)
    errors.push(`${path}.id is required and must be a non-empty string`);
  validateLabel(tab.label, `${path}.label`, errors);
  if (typeof tab.entry !== "string" || tab.entry.trim().length === 0)
    errors.push(`${path}.entry is required and must be a non-empty string`);

  if (tab.match !== undefined) {
    if (!isPlainObject(tab.match)) {
      errors.push(`${path}.match must be an object`);
    } else {
      validateStringArray(tab.match.lametaTypes, `${path}.match.lametaTypes`, errors);
      validateStringArray(tab.match.extensions, `${path}.match.extensions`, errors);
      validateStringArray(tab.match.mimePatterns, `${path}.match.mimePatterns`, errors);
    }
  }
  if (tab.claimDefault !== undefined && typeof tab.claimDefault !== "boolean")
    errors.push(`${path}.claimDefault must be a boolean`);
  if (tab.defaultPriority !== undefined && typeof tab.defaultPriority !== "number")
    errors.push(`${path}.defaultPriority must be a number`);

  // Return the (possibly partially-invalid) shape; caller only uses it when errors empty.
  const match: PluginTabMatch | undefined = isPlainObject(tab.match)
    ? {
        lametaTypes: tab.match.lametaTypes,
        extensions: tab.match.extensions
          ? tab.match.extensions.map((e: string) => e.toLowerCase().replace(/^\./, ""))
          : undefined,
        mimePatterns: tab.match.mimePatterns,
      }
    : undefined;

  return {
    id: tab.id,
    label: tab.label,
    entry: tab.entry,
    match,
    claimDefault: tab.claimDefault === true,
    defaultPriority: typeof tab.defaultPriority === "number" ? tab.defaultPriority : 0,
  };
}

function validatePlatforms(value: any, errors: string[]): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("platforms must be a non-empty array of platform keys");
    return undefined;
  }
  value.forEach((p: any, i: number) => {
    if (typeof p !== "string") errors.push(`platforms[${i}] must be a string`);
    else if (!KNOWN_PLATFORMS.includes(p))
      errors.push(
        `platforms[${i}] "${p}" is not a known platform (known: ${KNOWN_PLATFORMS.join(", ")})`,
      );
  });
  return value;
}

function validateBinaries(value: any, errors: string[]): PluginBinaries | undefined {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    errors.push("binaries must be an object");
    return undefined;
  }
  const result: PluginBinaries = {};
  for (const name of Object.keys(value)) {
    if (!KNOWN_BINARIES.includes(name)) {
      errors.push(`binaries.${name} is not a known binary (known: ${KNOWN_BINARIES.join(", ")})`);
      continue;
    }
    const byPlatform = value[name];
    if (!isPlainObject(byPlatform)) {
      errors.push(`binaries.${name} must be an object of platform key -> path`);
      continue;
    }
    result[name] = {};
    for (const platformKey of Object.keys(byPlatform)) {
      const path = byPlatform[platformKey];
      if (!KNOWN_PLATFORMS.includes(platformKey))
        errors.push(
          `binaries.${name}."${platformKey}" is not a known platform (known: ${KNOWN_PLATFORMS.join(
            ", ",
          )})`,
        );
      else if (typeof path !== "string" || path.trim().length === 0 || !isSafeRelativePath(path))
        errors.push(
          `binaries.${name}."${platformKey}" must be a relative path inside the plugin folder (no "..", not absolute)`,
        );
      else result[name][platformKey] = path.replace(/\\/g, "/");
    }
  }
  return result;
}

/**
 * Parse & validate raw manifest text (JSON5 or JSON).
 * Pure: no IO. Returns {manifest} on success or {errors} with all problems found.
 */
export function parsePluginManifest(text: string): ParseManifestResult {
  let raw: any;
  try {
    raw = JSON5.parse(text);
  } catch (e: any) {
    return { errors: [`Could not parse manifest: ${e.message || e}`] };
  }

  if (!isPlainObject(raw)) {
    return { errors: ["Manifest must be a JSON object"] };
  }

  const errors: string[] = [];

  if (typeof raw.id !== "string" || !PLUGIN_ID_REGEX.test(raw.id))
    errors.push(
      `id is required and must match ${PLUGIN_ID_REGEX} (lowercase letters, digits, dots, hyphens)`,
    );
  if (typeof raw.name !== "string" || raw.name.trim().length === 0)
    errors.push("name is required and must be a non-empty string");
  if (typeof raw.version !== "string" || raw.version.trim().length === 0)
    errors.push("version is required and must be a non-empty string");
  if (typeof raw.apiVersion !== "number")
    errors.push("apiVersion is required and must be a number");
  if (raw.label !== undefined) validateLabel(raw.label, "label", errors);
  if (typeof raw["infoUrl"] !== "string" || raw["infoUrl"].trim().length === 0)
    errors.push("infoUrl is required and must be a non-empty string");
  if (raw.description !== undefined && typeof raw.description !== "string")
    errors.push("description must be a string");
  if (raw.author !== undefined && typeof raw.author !== "string")
    errors.push("author must be a string");
  if (raw.minLametaVersion !== undefined && typeof raw.minLametaVersion !== "string")
    errors.push("minLametaVersion must be a string");

  if (raw.permissions !== undefined) {
    if (!Array.isArray(raw.permissions)) {
      errors.push("permissions must be an array of strings");
    } else {
      raw.permissions.forEach((p: any, i: number) => {
        if (typeof p !== "string") errors.push(`permissions[${i}] must be a string`);
        else if (!KNOWN_PERMISSIONS.includes(p))
          errors.push(
            `permissions[${i}] "${p}" is not a known permission (known: ${KNOWN_PERMISSIONS.join(
              ", ",
            )})`,
          );
      });
    }
  }

  // A manifest declares a tab PROVIDER (current model) OR a non-empty static `tabs` list (legacy).
  const hasTabProvider = raw.tabProvider !== undefined;
  const hasTabs = Array.isArray(raw.tabs) && raw.tabs.length > 0;

  let tabProvider: PluginTabProviderManifest | undefined;
  if (hasTabProvider) tabProvider = validateTabProvider(raw.tabProvider, errors);

  let tabs: PluginTabManifest[] = [];
  if (raw.tabs !== undefined) {
    if (!Array.isArray(raw.tabs)) {
      errors.push("tabs must be an array");
    } else {
      tabs = raw.tabs
        .map((tab: any, i: number) => validateTab(tab, i, errors))
        .filter(Boolean) as PluginTabManifest[];

      // tab ids must be unique within a plugin
      const seen = new Set<string>();
      for (const tab of tabs) {
        if (seen.has(tab.id)) errors.push(`duplicate tab id "${tab.id}"`);
        seen.add(tab.id);
      }
    }
  }

  if (!hasTabProvider && !hasTabs)
    errors.push("a manifest must declare a `tabProvider` or a non-empty `tabs` array");

  const platforms = validatePlatforms(raw.platforms, errors);
  const binaries = validateBinaries(raw.binaries, errors);

  if (errors.length > 0) return { errors };

  return {
    manifest: {
      id: raw.id,
      name: raw.name,
      version: raw.version,
      apiVersion: raw.apiVersion,
      label: raw.label,
      infoUrl: raw["infoUrl"],
      description: raw.description,
      author: raw.author,
      minLametaVersion: raw.minLametaVersion,
      permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
      tabProvider,
      tabs,
      platforms,
      binaries,
    },
  };
}

/** Resolve a LocalizableLabel to a string for a given UI language, falling back to "en"
 * and then to any available value. */
export function localizeLabel(label: LocalizableLabel, languageCode: string): string {
  if (typeof label === "string") return label;
  if (!label || typeof label !== "object") return "";
  return (
    label[languageCode] ||
    label[languageCode.split("-")[0]] ||
    label["en"] ||
    Object.values(label)[0] ||
    ""
  );
}
