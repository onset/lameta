// lameta plugin API — version 1
//
// These are dependency-free types that define the contract between lameta (the host)
// and a file-handler plugin running inside an <iframe>. They are intentionally free of
// any lameta or node imports so that they can one day be published as a standalone
// `@lameta/plugin-api` npm package for plugin authors to depend on. Do not import
// anything from the rest of lameta into this file.

/** The plugin API major versions that this build of lameta can host. */
export const LAMETA_PLUGIN_API_VERSIONS_SUPPORTED: number[] = [1];

/** Folder kinds a plugin might be shown in. v1 only ever runs plugins for content files
 * inside session/person/project/project-documents folders (never for the Session or
 * Person metadata "files" themselves). */
export type PluginFolderType =
  | "session"
  | "person"
  | "project"
  | "project documents";

/**
 * The one-time context lameta hands a plugin at startup (the `lameta:init` message).
 * Everything here is a plain, serializable value (no functions, no live objects).
 */
export interface PluginInitContext {
  /** The API major version lameta is speaking. Matches the plugin manifest's apiVersion. */
  apiVersion: number;
  plugin: {
    id: string;
    version: string;
    /** The manifest `permissions` the host granted this plugin (currently always all of
     * them, e.g. ["companionFiles"]). Check this before calling permission-gated APIs. */
    grantedPermissions: string[];
  };
  file: {
    /** Absolute path on disk to the actual file (link files already resolved). */
    path: string;
    /** File name including extension, e.g. "ETR009_Careful.mp3". */
    name: string;
    /** Lowercase extension without the dot, e.g. "mp3". */
    extension: string;
    /** Best-guess mime type, e.g. "audio/mpeg". */
    mimeType: string;
    /** lameta's file-type classification, e.g. "Audio", "Video", "Image". */
    lametaType: string;
    /** A file:// URL usable directly in <audio>/<img>/<video> src attributes. */
    uri: string;
  };
  folder: {
    type: PluginFolderType;
    /** Absolute path to the folder that "owns" the file. Sidecars live under here. */
    directory: string;
  };
  ui: {
    /** lameta's current UI language code, e.g. "en", "es". */
    languageCode: string;
    /** lameta version string, for display / compatibility checks. */
    appVersion: string;
  };
}

/**
 * Scoped access to the selected file's SayMore-style companion files (the
 * `.annotations.eaf` / `_Annotations/` / `_StandardAudio.wav` family living beside the
 * actual media file). Requires the `companionFiles` manifest permission — the client
 * object always has `api.companions`, but every call errors if the permission is absent.
 *
 * All `relPath`s are relative to the selected file's own directory and are validated by
 * the host against an allowlist derived from the selected file's name; anything else
 * (including `..` and absolute paths) is rejected. On the wire these travel as dotted
 * method strings ("companions.list", "companions.readText", ...).
 */
export interface PluginCompanionsApiV1 {
  /** List existing companions. With no `subdir`, stats each allowed top-level companion
   * that exists. With a `subdir` (must be an allowed `..._Annotations` dir), lists the
   * .wav files directly inside it (empty array if the dir doesn't exist). */
  list(subdir?: string): Promise<{ name: string; size: number; mtimeMs: number }[]>;
  exists(relPath: string): Promise<boolean>;
  readText(relPath: string): Promise<string>;
  /** Read a companion as bytes. Transferred as an ArrayBuffer, like getFileBytes. */
  readBytes(relPath: string): Promise<ArrayBuffer>;
  /** Atomic: written to a temp file in the same directory, then renamed over the target. */
  writeText(relPath: string, contents: string): Promise<void>;
  /** Atomic, like writeText. */
  writeBytes(relPath: string, data: ArrayBuffer): Promise<void>;
  /** A real fs rename (not copy+delete); both paths validated. */
  rename(fromRelPath: string, toRelPath: string): Promise<void>;
  /** Delete a companion file (never a directory). */
  delete(relPath: string): Promise<void>;
  /** Stat a companion, or null if it doesn't exist. Poll this (~2s) to detect external
   * edits, e.g. the user saving the .eaf from ELAN. */
  stat(relPath: string): Promise<{ size: number; mtimeMs: number } | null>;
}

/**
 * The RPC surface a plugin can call on the host. In the iframe, a plugin obtains an
 * object implementing this interface from `connectToLameta()` in the client kit; each
 * method is a thin wrapper that posts a `lameta:request` and awaits the matching
 * `lameta:response`.
 */
export interface PluginHostApiV1 {
  /** Read the whole selected file as bytes. Transferred as an ArrayBuffer. Intended for
   * reasonable-size reads; for large media prefer `file.uri` directly in a media element. */
  getFileBytes(): Promise<ArrayBuffer>;

  /** Read `length` bytes of the selected file starting at `offset` (both non-negative
   * integers; length is clamped to the file size). Transferred as an ArrayBuffer.
   * Prefer this over getFileBytes for chunked processing of long media. */
  readFileRange(offset: number, length: number): Promise<ArrayBuffer>;

  /** Read a plugin-namespaced sidecar for the current file. Returns null if none exists.
   * `name` defaults to "annotations"; it must match /^[a-z0-9_-]+$/i. */
  readSidecar(name?: string): Promise<string | null>;

  /** Write (create/overwrite) a plugin-namespaced sidecar for the current file. */
  writeSidecar(contents: string, name?: string): Promise<void>;

  /** List the sidecar names that currently exist for this file & plugin. */
  listSidecars(): Promise<string[]>;

  /** Companion-file access; requires the `companionFiles` manifest permission. */
  companions: PluginCompanionsApiV1;
}

// ---------------------------------------------------------------------------
// Wire protocol (postMessage envelopes). Kept here so both host and client agree.
// ---------------------------------------------------------------------------

export const PLUGIN_MESSAGE_PREFIX = "lameta:";

/** plugin -> host: sent once, when the plugin's script has loaded and it is ready to
 * receive `lameta:init`. */
export interface PluginReadyMessage {
  type: "lameta:ready";
}

/** host -> plugin: the one-time init handshake carrying the context. */
export interface PluginInitMessage {
  type: "lameta:init";
  context: PluginInitContext;
}

/** plugin -> host: a request to invoke one of the PluginHostApiV1 methods. Nested API
 * groups travel as dotted strings, e.g. "companions.readText" — so `method` is a string
 * rather than `keyof PluginHostApiV1`. */
export interface PluginRequestMessage {
  type: "lameta:request";
  id: number;
  method: string;
  params: any[];
}

/** host -> plugin: the response to a PluginRequestMessage. */
export interface PluginResponseMessage {
  type: "lameta:response";
  id: number;
  result?: any;
  error?: string;
}

export type PluginToHostMessage = PluginReadyMessage | PluginRequestMessage;
export type HostToPluginMessage = PluginInitMessage | PluginResponseMessage;
