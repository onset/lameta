// Per-iframe postMessage bridge: the host side of the plugin API.
//
// One bridge instance is attached per plugin tab panel. It listens on `window` for messages
// from its specific iframe (scoped by event.source), performs the handshake, and dispatches
// PluginHostApiV1 method calls to filesystem operations. All IO is wrapped in try/catch and
// turned into error responses so a plugin can't crash the host.
//
// NOTE: the plugin iframe's HTML/JS is now served over the registered lameta-plugin:// scheme
// (see main.ts) so it has a real secure origin — needed for microphone Permissions-Policy
// delegation. The bridge's own file access (below) still uses node fs, and file.uri media is
// still a file:// URL; if lameta ever turns webSecurity back on, those would need to move
// behind a scheme/handler too.

import fs from "fs-extra";
import Path from "path";
import {
  FfprobeResult,
  PluginInitContext,
  PluginTabProviderContext,
  TabDescriptor,
} from "./PluginApiTypes";
import {
  getSidecarPath,
  getPluginDataDir,
  parseSidecarName,
  isValidSidecarName,
  DEFAULT_SIDECAR_NAME,
} from "./sidecar";
import { getFfmpegPath, getFfprobePath } from "../other/ffprobePath";
import { currentPlatformKey, PluginBinaries } from "./PluginManifest";
import { prepareBinary, resolveFfmpegPath } from "./pluginBinaries";
import { ffmpegArguments, runFfmpegProcess } from "./ffmpegProcess";
import { resolveCompanionPath, isAllowedCompanionPath } from "./companions";
import { getProjectSettingsPath, serializeProjectSettings } from "./projectSettings";

// Lazily require fluent-ffmpeg (used only for ffprobe) and point it at lameta's shipped ffprobe,
// once. Kept out of module scope (and behind the first ffmpeg.* call) so importing the bridge —
// e.g. in unit tests that never touch ffmpeg — doesn't pull in fluent-ffmpeg. The ffprobe path
// comes from the app directory, because the static package's own paths point into dist/ after
// bundling.
let fluentFfprobe: any = null;
function getFluentFfprobe(): any {
  if (fluentFfprobe) return fluentFfprobe;
  const fluent = require("fluent-ffmpeg");
  fluent.setFfprobePath(getFfprobePath());
  fluentFfprobe = fluent;
  return fluent;
}

/** Coerce an ffprobe field (which may be a number, a numeric string, or "N/A") to a number,
 * or undefined if it isn't a finite number. */
function numOrUndef(v: any): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** A filter in the Save dialog's file-type list, as Electron's dialog takes it. */
export interface SaveDialogFilter {
  name: string;
  extensions: string[];
}

/**
 * What the bridge needs from the rest of lameta for `saveFile` and the project-settings calls.
 * Injected so the bridge stays free of Electron and of the project model.
 */
export interface PluginHostServices {
  /** Show the native Save dialog, titled with `pluginName` and the localized word "Save".
   * Resolves like Electron's dialog.showSaveDialog. */
  showSaveDialog(options: {
    pluginName: string;
    defaultPath: string;
    filters?: SaveDialogFilter[];
  }): Promise<{ canceled: boolean; filePath?: string }>;
  /** The folder this plugin last saved into under `key`, from lameta's user settings. */
  getSaveFolder(pluginId: string, key: string): string | undefined;
  setSaveFolder(pluginId: string, key: string, folder: string): void;
  /** The open project's folder, or undefined when no project is open. */
  getProjectDirectory(): string | undefined;
}

/** `saveFile`'s `rememberFolderKey` names a user-settings entry, so keep it short and plain. */
const REMEMBER_FOLDER_KEY_REGEX = /^[a-z0-9_.-]{1,64}$/i;
const DEFAULT_REMEMBER_FOLDER_KEY = "default";
const FILTER_EXTENSION_REGEX = /^(\*|[a-z0-9]+)$/i;

function validateSaveFilters(filters: any): SaveDialogFilter[] | undefined {
  if (filters === undefined || filters === null) return undefined;
  const bad = () => new Error("saveFile: filters must be an array of {name, extensions[]}");
  if (!Array.isArray(filters)) throw bad();
  return filters.map((f: any) => {
    if (!f || typeof f.name !== "string" || !Array.isArray(f.extensions)) throw bad();
    for (const ext of f.extensions)
      if (typeof ext !== "string" || !FILTER_EXTENSION_REGEX.test(ext))
        throw new Error(
          `saveFile: filter extension "${ext}" must be letters and digits with no dot, or "*"`,
        );
    return { name: f.name, extensions: [...f.extensions] };
  });
}

/** Accept a bare file name only; reject anything that names a folder or climbs out of one. */
function isBareFileName(name: string): boolean {
  const normalized = name.replace(/\\/g, "/");
  return (
    !normalized.startsWith("/") &&
    !/^[a-z]:/i.test(normalized) &&
    !normalized.includes("..") &&
    !normalized.includes("/")
  );
}

export interface PluginBridgeOptions {
  iframe: HTMLIFrameElement;
  /** The init context: a content-tab context, or a tab-provider context. */
  context: PluginInitContext | PluginTabProviderContext;
  /** "tab" (default) for a content-tab iframe, or "tabProvider" for the hidden provider. */
  role?: "tab" | "tabProvider";
  /** absolute path to the actual file on disk (link files already resolved). For a
   * tab-provider this is unused/"" — the file arrives per `getTabs` query and scopes
   * companions for the duration of that query. */
  filePath: string;
  /** file name including extension. */
  fileName: string;
  /** owning folder directory — sidecars live under here. */
  folderDirectory: string;
  pluginId: string;
  /** the plugin's granted manifest permissions, e.g. ["companionFiles"]. */
  permissions: string[];
  /** The plugin's folder (installed or the Developer plugin folder); `binaries` paths are
   * relative to it. */
  pluginDirectory?: string;
  /** The manifest's `binaries`; `ffmpeg.run` spawns `binaries.ffmpeg[<this platform>]`. */
  binaries?: PluginBinaries;
  /**
   * Host callback for the `selectFile` API: make `relPath` (relative to the owning folder)
   * the selected file, re-driving the file-pane tabs, and open this plugin's tab `tabId` when
   * given. Returns true if a file was selected. Absent in contexts that don't support
   * selection (then `selectFile` rejects).
   */
  onSelectFile?: (relPath: string, options: { tabId?: string }) => Promise<boolean> | boolean;
  /** The plugin's user-facing name; the Save dialog's title starts with it. */
  pluginDisplayName?: string;
  /** Needed by `saveFile` and the project-settings calls, which reject without it. */
  host?: PluginHostServices;
}

export class PluginHostBridge {
  private opts: PluginBridgeOptions;
  private listener: (event: MessageEvent) => void;
  private attached = false;
  /**
   * A plain, structured-cloneable snapshot of the init context. The context we're handed can
   * contain MobX observable arrays (e.g. plugin.grantedPermissions comes from the observable
   * plugin manifest), which are Proxies that postMessage's structured clone rejects with a
   * DataCloneError — so the init would silently never reach the iframe and the plugin would
   * hang "waiting for lameta:init". Deep-plain it once here (the context is pure data) so every
   * init post is cloneable.
   */
  private readonly initContext: PluginInitContext | PluginTabProviderContext;

  // Tab-provider state: outstanding getTabs queries, and the file scope companions.* resolves
  // against while a query is in flight (the host serializes queries per provider).
  private nextTabQueryId = 1;
  private tabQueries = new Map<number, (tabs: TabDescriptor[]) => void>();
  private activeScope: {
    filePath: string;
    fileName: string;
    folderDirectory: string;
  } | null = null;

  /** Resolves the first time the plugin posts `lameta:ready` — i.e. its client listener is up
   * and it will receive messages. A tab-provider manager awaits this before sending `getTabs`. */
  public readonly ready: Promise<void>;
  private markReady!: () => void;

  constructor(opts: PluginBridgeOptions) {
    this.opts = opts;
    this.listener = this.onMessage.bind(this);
    this.initContext = JSON.parse(JSON.stringify(opts.context));
    this.ready = new Promise<void>((resolve) => {
      this.markReady = resolve;
    });
  }

  // File scope for request handling: the active getTabs query's file when a provider query is
  // in flight, otherwise this bridge's own file (a content tab is always its own file).
  private get sFilePath(): string {
    return this.activeScope?.filePath ?? this.opts.filePath;
  }
  private get sFileName(): string {
    return this.activeScope?.fileName ?? this.opts.fileName;
  }
  private get sFolderDir(): string {
    return this.activeScope?.folderDirectory ?? this.opts.folderDirectory;
  }

  /**
   * Ask this bridge's (tab-provider) iframe which tabs it claims for `query.file`. Sent fresh on
   * every selection change — never cached. Companions.* calls the provider makes while answering
   * are scoped to `query.file`. Resolves to `[]` if the provider errors or doesn't answer in time
   * (a broken provider must never wedge the host). Serialize calls: one query at a time.
   */
  public getTabs(query: {
    file: {
      name: string;
      extension: string;
      mimeType: string;
      lametaType: string;
      path: string;
      uri: string;
    };
    folder: { type: string; directory: string };
  }): Promise<TabDescriptor[]> {
    const id = this.nextTabQueryId++;
    this.activeScope = {
      filePath: query.file.path,
      fileName: query.file.name,
      folderDirectory: query.folder.directory,
    };
    return new Promise<TabDescriptor[]>((resolve) => {
      let settled = false;
      const finish = (tabs: TabDescriptor[]) => {
        if (settled) return;
        settled = true;
        this.tabQueries.delete(id);
        if (this.activeScope && this.nextTabQueryId - 1 === id) this.activeScope = null;
        resolve(tabs);
      };
      this.tabQueries.set(id, finish);
      this.post({
        type: "lameta:getTabs",
        id,
        file: query.file,
        folder: query.folder,
      });
      // Graceful timeout: an unresponsive provider yields "no tabs", never a hang.
      setTimeout(() => finish([]), 8000);
    });
  }

  public attach() {
    if (this.attached) return;
    window.addEventListener("message", this.listener);
    this.attached = true;
    // The handshake is inherently racy: the client attaches its own listener and posts
    // `lameta:ready`, but for a fast local file:// iframe that can happen before this bridge's
    // listener (set up in a post-paint effect) exists, so an early `ready` may be missed.
    // Proactively (re)posting init on the iframe's `load` event covers that case — by `load`
    // the client's module has run and is listening — while `onMessage` below answers every
    // `ready` we do see. The client also retries `ready` until it gets init, so any single
    // dropped message self-heals. Duplicate inits are harmless (the client resolves once).
    this.opts.iframe?.addEventListener("load", this.onIframeLoad);
  }

  private onIframeLoad = () => {
    this.post({ type: "lameta:init", context: this.initContext });
  };

  public detach() {
    if (!this.attached) return;
    window.removeEventListener("message", this.listener);
    this.opts.iframe?.removeEventListener("load", this.onIframeLoad);
    this.attached = false;
  }

  private get pluginWindow(): Window | null {
    return this.opts.iframe?.contentWindow ?? null;
  }

  private post(message: any, transfer?: Transferable[]) {
    const w = this.pluginWindow;
    if (!w) return;
    // targetOrigin "*" is fine: the iframe loads a local lameta-plugin:// URL we control.
    // The iframe can be torn down between an fs operation finishing and this post (see
    // the write-completion guarantee in docs/plugin-authoring.md); an undeliverable
    // response is silently dropped, never thrown.
    try {
      if (transfer && transfer.length) w.postMessage(message, "*", transfer);
      else w.postMessage(message, "*");
    } catch {
      // ignore: the request itself already completed; only the response was lost.
    }
  }

  private onMessage(event: MessageEvent) {
    // Only handle messages from our own iframe.
    if (event.source !== this.pluginWindow) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "lameta:ready") {
      this.markReady();
      this.post({ type: "lameta:init", context: this.initContext });
      return;
    }

    if (data.type === "lameta:tabs") {
      const finish = this.tabQueries.get(data.id);
      if (finish) finish(Array.isArray(data.tabs) ? data.tabs : []);
      return;
    }

    if (data.type === "lameta:request") {
      void this.handleRequest(data.id, data.method, data.params || []);
    }
  }

  // Copy a Buffer into a standalone ArrayBuffer we can transfer (zero-copy) to the iframe.
  private static toTransferable(buf: Buffer): ArrayBuffer {
    const copy = new ArrayBuffer(buf.byteLength);
    new Uint8Array(copy).set(buf);
    return copy;
  }

  private async handleRequest(id: number, method: string, params: any[]) {
    try {
      // Companion-file methods travel as dotted strings ("companions.readText", ...).
      if (method.startsWith("companions.")) {
        await this.handleCompanionRequest(id, method, params);
        return;
      }
      // ffmpeg methods likewise ("ffmpeg.probe", "ffmpeg.run").
      if (method.startsWith("ffmpeg.")) {
        await this.handleFfmpegRequest(id, method, params);
        return;
      }
      switch (method) {
        case "getFileBytes": {
          const buf = await fs.readFile(this.sFilePath);
          const arrayBuffer = PluginHostBridge.toTransferable(buf);
          this.post({ type: "lameta:response", id, result: arrayBuffer }, [arrayBuffer]);
          return;
        }
        case "readFileRange": {
          const [offset, length] = params;
          if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(length) || length < 0)
            throw new Error("readFileRange: offset and length must be non-negative integers");
          const { size } = await fs.stat(this.sFilePath);
          const clamped = Math.max(0, Math.min(length, size - offset));
          const buf = Buffer.alloc(clamped);
          if (clamped > 0) {
            const fd = await fs.open(this.sFilePath, "r");
            try {
              await fs.read(fd, buf, 0, clamped, offset);
            } finally {
              await fs.close(fd);
            }
          }
          const arrayBuffer = PluginHostBridge.toTransferable(buf);
          this.post({ type: "lameta:response", id, result: arrayBuffer }, [arrayBuffer]);
          return;
        }
        case "readSidecar": {
          const name = params[0] || DEFAULT_SIDECAR_NAME;
          const path = getSidecarPath(this.sFolderDir, this.opts.pluginId, this.sFileName, name);
          const result = (await fs.pathExists(path)) ? await fs.readFile(path, "utf8") : null;
          this.post({ type: "lameta:response", id, result });
          return;
        }
        case "writeSidecar": {
          const contents = params[0];
          const name = params[1] || DEFAULT_SIDECAR_NAME;
          if (typeof contents !== "string")
            throw new Error("writeSidecar: contents must be a string");
          const path = getSidecarPath(this.sFolderDir, this.opts.pluginId, this.sFileName, name);
          await fs.ensureDir(Path.dirname(path));
          await fs.writeFile(path, contents, "utf8");
          this.post({ type: "lameta:response", id, result: undefined });
          return;
        }
        case "selectFile": {
          const relPath = params[0];
          if (typeof relPath !== "string" || relPath.length === 0)
            throw new Error("selectFile: relPath must be a non-empty string");
          // Reject traversal / absolute paths / subdirectories — selection is limited to a
          // file living directly in the owning folder (the host also re-checks this).
          if (!isBareFileName(relPath))
            throw new Error(`selectFile: "${relPath}" must be a bare file name in the folder`);
          const options = params[1];
          if (options !== undefined && options !== null && typeof options !== "object")
            throw new Error("selectFile: options must be an object");
          const tabId = options?.tabId;
          if (tabId !== undefined && (typeof tabId !== "string" || tabId.length === 0))
            throw new Error("selectFile: tabId must be a non-empty string");
          if (!this.opts.onSelectFile)
            throw new Error("selectFile is not supported in this context");
          const selected = await this.opts.onSelectFile(relPath, tabId ? { tabId } : {});
          this.post({ type: "lameta:response", id, result: !!selected });
          return;
        }
        case "saveFile": {
          const result = await this.saveFile(params[0], params[1], params[2]);
          this.post({ type: "lameta:response", id, result });
          return;
        }
        case "getProjectSettings": {
          const path = this.projectSettingsPath();
          const result = (await fs.pathExists(path))
            ? JSON.parse(await fs.readFile(path, "utf8"))
            : null;
          this.post({ type: "lameta:response", id, result });
          return;
        }
        case "setProjectSettings": {
          const path = this.projectSettingsPath();
          const value = params[0];
          // Only an explicit null removes the settings; undefined is rejected by the serializer.
          if (value === null) await fs.remove(path);
          else await this.writeFileAtomically(path, serializeProjectSettings(value));
          this.post({ type: "lameta:response", id, result: undefined });
          return;
        }
        case "listSidecars": {
          const dir = getPluginDataDir(this.sFolderDir, this.opts.pluginId);
          let names: string[] = [];
          if (await fs.pathExists(dir)) {
            const entries = await fs.readdir(dir);
            names = entries
              .map((f) => parseSidecarName(f, this.sFileName))
              .filter((n): n is string => !!n && isValidSidecarName(n));
          }
          this.post({ type: "lameta:response", id, result: names });
          return;
        }
        default:
          throw new Error(`Unknown plugin API method: ${method}`);
      }
    } catch (e: any) {
      this.post({
        type: "lameta:response",
        id,
        error: e?.message || String(e),
      });
    }
  }

  // `saveFile`: the user picks where the plugin's bytes go, in the native Save dialog. The
  // plugin learns only the chosen file's name, never its folder.
  private async saveFile(
    suggestedName: any,
    bytes: any,
    options: any,
  ): Promise<{ saved: boolean; fileName?: string }> {
    if (!this.opts.permissions.includes("saveFile"))
      throw new Error("This plugin does not have the saveFile permission");
    if (typeof suggestedName !== "string" || suggestedName.length === 0)
      throw new Error("saveFile: suggestedName must be a non-empty string");
    if (!isBareFileName(suggestedName))
      throw new Error(`saveFile: "${suggestedName}" must be a bare file name`);
    if (!(bytes instanceof ArrayBuffer)) throw new Error("saveFile: bytes must be an ArrayBuffer");
    if (options !== undefined && options !== null && typeof options !== "object")
      throw new Error("saveFile: options must be an object");
    const filters = validateSaveFilters(options?.filters);
    const key = options?.rememberFolderKey ?? DEFAULT_REMEMBER_FOLDER_KEY;
    if (typeof key !== "string" || !REMEMBER_FOLDER_KEY_REGEX.test(key))
      throw new Error(`saveFile: rememberFolderKey must match ${REMEMBER_FOLDER_KEY_REGEX}`);
    const host = this.opts.host;
    if (!host) throw new Error("saveFile is not supported in this context");

    const remembered = host.getSaveFolder(this.opts.pluginId, key);
    const startFolder =
      remembered && (await fs.pathExists(remembered)) ? remembered : this.sFolderDir;
    const choice = await host.showSaveDialog({
      pluginName: this.opts.pluginDisplayName || this.opts.pluginId,
      defaultPath: startFolder ? Path.join(startFolder, suggestedName) : suggestedName,
      filters,
    });
    if (choice.canceled || !choice.filePath) return { saved: false };
    await this.writeFileAtomically(choice.filePath, Buffer.from(bytes));
    host.setSaveFolder(this.opts.pluginId, key, Path.dirname(choice.filePath));
    return { saved: true, fileName: Path.basename(choice.filePath) };
  }

  private projectSettingsPath(): string {
    if (!this.opts.permissions.includes("projectSettings"))
      throw new Error("This plugin does not have the projectSettings permission");
    const projectDirectory = this.opts.host?.getProjectDirectory();
    if (!projectDirectory) throw new Error("No project is open");
    return getProjectSettingsPath(projectDirectory, this.opts.pluginId);
  }

  // The "companions.*" family: scoped access to files living beside the ACTUAL selected file
  // (Path.dirname(filePath), NOT folderDirectory — for .link files the media lives elsewhere
  // and its companions belong beside it). Every relPath is validated by resolveCompanionPath
  // against the generic first-dot-stem rule in companions.ts (no plugin-specific naming
  // knowledge in the host). Called from inside handleRequest's try/catch, so throwing here
  // produces a normal error response.
  private async handleCompanionRequest(id: number, method: string, params: any[]) {
    if (!this.opts.permissions.includes("companionFiles"))
      throw new Error("This plugin does not have the companionFiles permission");
    const companionDir = Path.dirname(this.sFilePath);
    const scopeFileName = this.sFileName;
    const resolve = (relPath: string) => resolveCompanionPath(companionDir, scopeFileName, relPath);

    switch (method) {
      case "companions.list": {
        const subdir = params[0];
        const result: { name: string; size: number; mtimeMs: number }[] = [];
        // Which directory to read, and (for a subdir) validate it against the rule first.
        let dir = companionDir;
        if (subdir !== undefined && subdir !== null) {
          const rel = String(subdir);
          // A subdir must be a single allowed segment (no nesting / traversal).
          if (rel.replace(/\\/g, "/").includes("/") || !isAllowedCompanionPath(scopeFileName, rel))
            throw new Error(`companions.list: "${subdir}" is not an allowed subdirectory`);
          dir = Path.join(companionDir, rel);
        }
        if (await fs.pathExists(dir)) {
          for (const name of await fs.readdir(dir)) {
            // Top-level: only entries whose name passes the 1-segment rule. Inside a subdir:
            // every file (the plugin filters for what it cares about).
            if (subdir === undefined || subdir === null) {
              if (!isAllowedCompanionPath(scopeFileName, name)) continue;
            }
            const stats = await fs.stat(Path.join(dir, name));
            if (!stats.isFile()) continue;
            result.push({ name, size: stats.size, mtimeMs: stats.mtimeMs });
          }
        }
        this.post({ type: "lameta:response", id, result });
        return;
      }
      case "companions.exists": {
        const result = await fs.pathExists(resolve(params[0]));
        this.post({ type: "lameta:response", id, result });
        return;
      }
      case "companions.stat": {
        const path = resolve(params[0]);
        const result = (await fs.pathExists(path))
          ? await fs.stat(path).then((s) => ({ size: s.size, mtimeMs: s.mtimeMs }))
          : null;
        this.post({ type: "lameta:response", id, result });
        return;
      }
      case "companions.readText": {
        const result = await fs.readFile(resolve(params[0]), "utf8");
        this.post({ type: "lameta:response", id, result });
        return;
      }
      case "companions.readBytes": {
        const buf = await fs.readFile(resolve(params[0]));
        const arrayBuffer = PluginHostBridge.toTransferable(buf);
        this.post({ type: "lameta:response", id, result: arrayBuffer }, [arrayBuffer]);
        return;
      }
      case "companions.writeText": {
        const contents = params[1];
        if (typeof contents !== "string")
          throw new Error("companions.writeText: contents must be a string");
        await this.writeFileAtomically(resolve(params[0]), contents);
        this.post({ type: "lameta:response", id, result: undefined });
        return;
      }
      case "companions.writeBytes": {
        const data = params[1];
        if (!(data instanceof ArrayBuffer))
          throw new Error("companions.writeBytes: data must be an ArrayBuffer");
        await this.writeFileAtomically(resolve(params[0]), Buffer.from(data));
        this.post({ type: "lameta:response", id, result: undefined });
        return;
      }
      case "companions.rename": {
        const from = resolve(params[0]);
        const to = resolve(params[1]);
        await fs.ensureDir(Path.dirname(to));
        // A real fs rename (fast, atomic-ish) — not copy+delete.
        await fs.rename(from, to);
        this.post({ type: "lameta:response", id, result: undefined });
        return;
      }
      case "companions.delete": {
        const path = resolve(params[0]);
        if ((await fs.pathExists(path)) && (await fs.stat(path)).isDirectory())
          throw new Error("companions.delete: refusing to delete a directory");
        await fs.remove(path);
        this.post({ type: "lameta:response", id, result: undefined });
        return;
      }
      default:
        throw new Error(`Unknown plugin API method: ${method}`);
    }
  }

  // The "ffmpeg.*" family: probe / convert the ACTUAL selected file or one of its companions.
  // Input defaults to the selected file; input & output are validated against the same generic
  // companion allowlist as companions.* (resolveCompanionPath), so an ffmpeg output can never
  // escape the selected file's directory family. Requires the "ffmpeg" permission. Called from
  // inside handleRequest's try/catch, so throwing here produces a normal error response.
  private async handleFfmpegRequest(id: number, method: string, params: any[]) {
    if (!this.opts.permissions.includes("ffmpeg"))
      throw new Error("This plugin does not have the ffmpeg permission");
    const companionDir = Path.dirname(this.sFilePath);
    const scopeFileName = this.sFileName;
    // Input default = the selected file; otherwise a validated companion.
    const resolveInput = (relPath?: string): string =>
      relPath === undefined || relPath === null || relPath === ""
        ? this.sFilePath
        : resolveCompanionPath(companionDir, scopeFileName, relPath);

    switch (method) {
      case "ffmpeg.probe": {
        const result = await this.ffprobe(resolveInput(params[0]));
        this.post({ type: "lameta:response", id, result });
        return;
      }
      case "ffmpeg.run": {
        const spec = params[0] || {};
        const { inputRelPath, outputRelPath, args, inputArgs } = spec;
        if (typeof outputRelPath !== "string" || outputRelPath.length === 0)
          throw new Error("ffmpeg.run: outputRelPath must be a non-empty string");
        if (!Array.isArray(args) || args.some((a: any) => typeof a !== "string"))
          throw new Error("ffmpeg.run: args must be an array of strings");
        if (
          inputArgs !== undefined &&
          (!Array.isArray(inputArgs) || inputArgs.some((a: any) => typeof a !== "string"))
        )
          throw new Error("ffmpeg.run: inputArgs must be an array of strings");
        const input = resolveInput(inputRelPath);
        const output = resolveCompanionPath(companionDir, scopeFileName, outputRelPath);
        await this.runFfmpeg(id, input, output, args, inputArgs || []);
        this.post({ type: "lameta:response", id, result: undefined });
        return;
      }
      default:
        throw new Error(`Unknown plugin API method: ${method}`);
    }
  }

  // ffprobe a file and map fluent-ffmpeg's raw result into the curated FfprobeResult contract.
  private ffprobe(input: string): Promise<FfprobeResult> {
    const fluent = getFluentFfprobe();
    return new Promise<FfprobeResult>((resolve, reject) => {
      fluent.ffprobe(input, (err: any, data: any) => {
        if (err) return reject(err);
        const fmt = data?.format || {};
        const streams = Array.isArray(data?.streams) ? data.streams : [];
        resolve({
          format: {
            durationSec: numOrUndef(fmt.duration),
            formatName: fmt.format_name,
            formatLongName: fmt.format_long_name,
          },
          streams: streams.map((s: any) => ({
            codecType: s.codec_type,
            codecName: s.codec_name,
            channels: numOrUndef(s.channels),
            sampleRate: numOrUndef(s.sample_rate),
            width: numOrUndef(s.width),
            height: numOrUndef(s.height),
            durationSec: numOrUndef(s.duration),
          })),
        });
      });
    });
  }

  // Run one ffmpeg conversion, reporting 0..1 progress via `lameta:progress` messages, and
  // land the output atomically. We write to a temp file IN THE TARGET DIR THAT KEEPS THE TARGET
  // EXTENSION — ffmpeg picks its muxer from the output extension when no `-f` is given, so the
  // tmp name must end in e.g. ".wav" — then rename over the target on success.
  private async runFfmpeg(
    id: number,
    input: string,
    output: string,
    args: string[],
    inputArgs: string[],
  ): Promise<void> {
    const ffmpegPath = resolveFfmpegPath({
      pluginDirectory: this.opts.pluginDirectory,
      binaries: this.opts.binaries,
      platformKey: currentPlatformKey(),
      fallbackPath: getFfmpegPath,
    });
    // Made runnable before every spawn: this covers the Developer plugin folder, plugins copied
    // in by hand, and a plugin reinstalled during the session, whose new binary arrives at the
    // same path without its execute bit.
    await prepareBinary(ffmpegPath);
    // Probe once up front for the input duration → lets us turn timemark into a fraction.
    let durationSec = 0;
    try {
      durationSec = (await this.ffprobe(input)).format.durationSec || 0;
    } catch {
      // Unknown duration: progress simply won't fire; the conversion still runs.
    }
    await fs.ensureDir(Path.dirname(output));
    const ext = Path.extname(output);
    const tmp = `${output}.${Math.random().toString(36).slice(2)}.lameta-tmp${ext}`;

    try {
      await runFfmpegProcess(ffmpegPath, ffmpegArguments(input, inputArgs, args, tmp), (done) => {
        if (durationSec > 0) {
          const fraction = Math.max(0, Math.min(1, done / durationSec));
          this.post({ type: "lameta:progress", id, fraction });
        }
      });
    } catch (e) {
      await fs.remove(tmp).catch(() => {});
      throw e;
    }
    await fs.rename(tmp, output);
  }

  // Atomic write: to a temp file in the target's own directory, then rename over the
  // target, so a crash mid-write never leaves a truncated file.
  private async writeFileAtomically(target: string, data: string | Buffer) {
    await fs.ensureDir(Path.dirname(target));
    const tmp = `${target}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      if (typeof data === "string") await fs.writeFile(tmp, data, "utf8");
      else await fs.writeFile(tmp, data);
      await fs.rename(tmp, target);
    } catch (e) {
      await fs.remove(tmp).catch(() => {});
      throw e;
    }
  }
}
