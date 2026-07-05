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

/** Fields common to every `lameta:init` context, regardless of the iframe's role. */
export interface PluginContextBase {
  /** The API major version lameta is speaking. Matches the plugin manifest's apiVersion. */
  apiVersion: number;
  plugin: {
    id: string;
    version: string;
    /** The manifest `permissions` the host granted this plugin (currently always all of
     * them, e.g. ["companionFiles"]). Check this before calling permission-gated APIs. */
    grantedPermissions: string[];
  };
  ui: {
    /** lameta's current UI language code, e.g. "en", "es". */
    languageCode: string;
    /** lameta version string, for display / compatibility checks. */
    appVersion: string;
  };
}

/**
 * The context for a persistent, hidden **tab-provider** iframe. lameta loads one of these per
 * plugin (see the manifest `tabProvider` entry) and asks it, on EVERY selection change, which
 * tabs to show for the selected file (`lameta:getTabs` → `lameta:tabs`). It carries no file —
 * the file arrives with each query. Use `connectAsTabProvider()` in the client kit.
 */
export interface PluginTabProviderContext extends PluginContextBase {
  role: "tabProvider";
}

/**
 * A tab the provider claims for the currently selected file. Returning `[]` means "no tab for
 * this file" (e.g. an audio file that already has its annotation companion). The provider is
 * re-queried on every selection change and its answer is never cached, so it MAY differ across
 * calls for the same file as that file's companions come and go.
 */
export interface TabDescriptor {
  /** stable id lameta echoes back as `context.tab.id` when this tab's content iframe loads. */
  id: string;
  /** plain string, or a language-code→string map (host localizes; `en` is the fallback). */
  label: string | Record<string, string>;
  /** open this tab instead of the built-in viewer. */
  claimDefault?: boolean;
  /** tiebreak among default claimants (higher wins); then plugin id, then tab id. */
  defaultPriority?: number;
}

/**
 * The one-time context lameta hands a plugin's **content tab** iframe at startup (the
 * `lameta:init` message). Everything here is a plain, serializable value (no functions, no live
 * objects).
 */
export interface PluginInitContext extends PluginContextBase {
  /** Discriminator; "tab" for a content tab iframe (the default/omitted case is also a tab). */
  role?: "tab";
  /** Which provider-supplied tab this iframe is rendering (echoes TabDescriptor.id). */
  tab?: { id: string };
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
  // `ui` is inherited from PluginContextBase.
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
 * Generic ffmpeg/ffprobe access for the selected file and its companions. Requires the
 * `ffmpeg` manifest permission — the client object always has `api.ffmpeg`, but every call
 * errors if the permission is absent (mirrors `companions.*`). On the wire these travel as
 * dotted method strings ("ffmpeg.probe", "ffmpeg.run"). All input/output paths are validated
 * exactly like `companions.*` (the selected file, or a companion of it); nothing else is
 * reachable, so an ffmpeg output can never escape the companion allowlist.
 */
export interface PluginFfmpegApiV1 {
  /** ffprobe a file → curated metadata. `relPath` defaults to the SELECTED file; otherwise it
   * must be a companion path (same allowlist as `companions.*`). */
  probe(relPath?: string): Promise<FfprobeResult>;

  /**
   * Run one ffmpeg conversion to a companion file.
   *  - input   = the selected file (default) OR companion `inputRelPath`
   *  - output  = companion `outputRelPath` (same allowlist + atomic tmp+rename as
   *              `companions.writeBytes`; ffmpeg writes the tmp, the host renames it into
   *              place on success). Give it a real extension for the container you want:
   *              ffmpeg picks its muxer from that extension unless you pass `-f` in `args`.
   *  - `args`      = ffmpeg OUTPUT options placed BEFORE the output file
   *                  (e.g. ["-vn","-ac","1","-ar","22050","-acodec","pcm_s16le"])
   *  - `inputArgs` = optional options placed BEFORE `-i` (rarely needed)
   *  - `onProgress(fraction)` fires 0..1 as ffmpeg reports progress (the host computes it from
   *    the probed input duration). Advisory: it may fire 0 times if the duration is unknown,
   *    and is not guaranteed to reach exactly 1 — treat the promise resolving as "done".
   * Resolves once the output has been renamed into place. Rejects on a non-zero ffmpeg exit
   * (the message carries a stderr tail) or an invalid/denied path — never crashes the host.
   */
  run(spec: {
    inputRelPath?: string;
    outputRelPath: string;
    args: string[];
    inputArgs?: string[];
    onProgress?: (fraction: number) => void;
  }): Promise<void>;
}

/** Curated subset of ffprobe output (the host maps fluent-ffmpeg's raw result into this).
 * All durations are in seconds. Fields are optional because not every stream/format reports
 * every value. */
export interface FfprobeResult {
  format: { durationSec?: number; formatName?: string; formatLongName?: string };
  streams: Array<{
    codecType?: "audio" | "video" | string;
    codecName?: string;
    channels?: number;
    sampleRate?: number;
    width?: number;
    height?: number;
    durationSec?: number;
  }>;
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

  /**
   * Ask lameta to make another file in the SAME folder the selected file, re-driving the
   * file-pane tabs (so a plugin can, e.g., create `<media>.annotations.eaf` via companions
   * and then switch selection to it so its "Segments" tab shows). `relPath` is relative to
   * `folder.directory`; the file must already exist on disk (write it first) and lie directly
   * in that folder (no `..`, no absolute paths, no subdirectories). Resolves to true if a file
   * was selected, false if it could not be found. Ungated (a plugin can only select a file the
   * user could select by hand).
   */
  selectFile(relPath: string): Promise<boolean>;

  /** Companion-file access; requires the `companionFiles` manifest permission. */
  companions: PluginCompanionsApiV1;

  /** ffmpeg/ffprobe access; requires the `ffmpeg` manifest permission. */
  ffmpeg: PluginFfmpegApiV1;
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

/** host -> plugin: the one-time init handshake carrying the context. The context is a
 * PluginInitContext for a content-tab iframe, or a PluginTabProviderContext for the hidden
 * tab-provider iframe. */
export interface PluginInitMessage {
  type: "lameta:init";
  context: PluginInitContext | PluginTabProviderContext;
}

/** host -> tab-provider: "which tabs do you claim for this selected file?" Sent on EVERY
 * selection change (never cached). While a query is outstanding, the provider's `companions.*`
 * calls are scoped to `file` so it can decide live (e.g. `companions.exists(eaf)`). */
export interface PluginGetTabsMessage {
  type: "lameta:getTabs";
  id: number;
  file: {
    name: string;
    extension: string;
    mimeType: string;
    lametaType: string;
    path: string;
    uri: string;
  };
  folder: {
    type: PluginFolderType;
    directory: string;
  };
}

/** tab-provider -> host: the tabs to show for the queried file (`[]` = none). */
export interface PluginTabsMessage {
  type: "lameta:tabs";
  id: number;
  tabs: TabDescriptor[];
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

/** host -> plugin: advisory, fire-and-forget progress for an in-flight `lameta:request`
 * (currently only `ffmpeg.run`). Keyed by that request's id. The final `lameta:response`
 * still resolves the promise; progress messages may be dropped or coalesced. */
export interface PluginProgressMessage {
  type: "lameta:progress";
  id: number;
  fraction: number; // 0..1, monotonic-ish
}

export type PluginToHostMessage =
  | PluginReadyMessage
  | PluginRequestMessage
  | PluginTabsMessage;
export type HostToPluginMessage =
  | PluginInitMessage
  | PluginResponseMessage
  | PluginGetTabsMessage
  | PluginProgressMessage;
