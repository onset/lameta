// Per-iframe postMessage bridge: the host side of the plugin API.
//
// One bridge instance is attached per plugin tab panel. It listens on `window` for messages
// from its specific iframe (scoped by event.source), performs the handshake, and dispatches
// PluginHostApiV1 method calls to filesystem operations. All IO is wrapped in try/catch and
// turned into error responses so a plugin can't crash the host.
//
// NOTE: if lameta ever turns webSecurity back on, file access here (and file.uri in the
// iframe) will break; switch to a registered custom scheme via protocol.handle(...).

import fs from "fs-extra";
import Path from "path";
import {
  PluginInitContext,
  PluginTabProviderContext,
  TabDescriptor
} from "./PluginApiTypes";
import {
  getSidecarPath,
  getPluginDataDir,
  parseSidecarName,
  isValidSidecarName,
  DEFAULT_SIDECAR_NAME
} from "./sidecar";
import { resolveCompanionPath, isAllowedCompanionPath } from "./companions";

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
  /**
   * Host callback for the `selectFile` API: make `relPath` (relative to the owning folder)
   * the selected file, re-driving the file-pane tabs. Returns true if a file was selected.
   * Absent in contexts that don't support selection (then `selectFile` rejects).
   */
  onSelectFile?: (relPath: string) => Promise<boolean> | boolean;
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

  constructor(opts: PluginBridgeOptions) {
    this.opts = opts;
    this.listener = this.onMessage.bind(this);
    this.initContext = JSON.parse(JSON.stringify(opts.context));
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
      folderDirectory: query.folder.directory
    };
    return new Promise<TabDescriptor[]>((resolve) => {
      let settled = false;
      const finish = (tabs: TabDescriptor[]) => {
        if (settled) return;
        settled = true;
        this.tabQueries.delete(id);
        if (this.activeScope && this.nextTabQueryId - 1 === id)
          this.activeScope = null;
        resolve(tabs);
      };
      this.tabQueries.set(id, finish);
      this.post({
        type: "lameta:getTabs",
        id,
        file: query.file,
        folder: query.folder
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
    // targetOrigin "*" is fine: the iframe loads a local file:// URL we control.
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
      this.post({ type: "lameta:init", context: this.initContext });
      return;
    }

    if (data.type === "lameta:tabs") {
      const finish = this.tabQueries.get(data.id);
      if (finish) finish(Array.isArray(data.tabs) ? data.tabs : []);
      return;
    }

    if (data.type === "lameta:request") {
      this.handleRequest(data.id, data.method, data.params || []);
    }
  }

  // Copy a Buffer into a standalone ArrayBuffer we can transfer (zero-copy) to the iframe.
  private static toTransferable(buf: Buffer): ArrayBuffer {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  private async handleRequest(id: number, method: string, params: any[]) {
    try {
      // Companion-file methods travel as dotted strings ("companions.readText", ...).
      if (method.startsWith("companions.")) {
        await this.handleCompanionRequest(id, method, params);
        return;
      }
      switch (method) {
        case "getFileBytes": {
          const buf = await fs.readFile(this.sFilePath);
          const arrayBuffer = PluginHostBridge.toTransferable(buf);
          this.post(
            { type: "lameta:response", id, result: arrayBuffer },
            [arrayBuffer]
          );
          return;
        }
        case "readFileRange": {
          const [offset, length] = params;
          if (
            !Number.isInteger(offset) ||
            offset < 0 ||
            !Number.isInteger(length) ||
            length < 0
          )
            throw new Error(
              "readFileRange: offset and length must be non-negative integers"
            );
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
          this.post(
            { type: "lameta:response", id, result: arrayBuffer },
            [arrayBuffer]
          );
          return;
        }
        case "readSidecar": {
          const name = params[0] || DEFAULT_SIDECAR_NAME;
          const path = getSidecarPath(
            this.sFolderDir,
            this.opts.pluginId,
            this.sFileName,
            name
          );
          const result = (await fs.pathExists(path))
            ? await fs.readFile(path, "utf8")
            : null;
          this.post({ type: "lameta:response", id, result });
          return;
        }
        case "writeSidecar": {
          const contents = params[0];
          const name = params[1] || DEFAULT_SIDECAR_NAME;
          if (typeof contents !== "string")
            throw new Error("writeSidecar: contents must be a string");
          const path = getSidecarPath(
            this.sFolderDir,
            this.opts.pluginId,
            this.sFileName,
            name
          );
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
          const normalized = relPath.replace(/\\/g, "/");
          if (
            normalized.startsWith("/") ||
            /^[a-z]:/i.test(normalized) ||
            normalized.includes("..") ||
            normalized.includes("/")
          )
            throw new Error(
              `selectFile: "${relPath}" must be a bare file name in the folder`
            );
          if (!this.opts.onSelectFile)
            throw new Error("selectFile is not supported in this context");
          const selected = await this.opts.onSelectFile(relPath);
          this.post({ type: "lameta:response", id, result: !!selected });
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
        error: e?.message || String(e)
      });
    }
  }

  // The "companions.*" family: scoped access to files living beside the ACTUAL selected file
  // (Path.dirname(filePath), NOT folderDirectory — for .link files the media lives elsewhere
  // and its companions belong beside it). Every relPath is validated by resolveCompanionPath
  // against the generic first-dot-stem rule in companions.ts (no plugin-specific naming
  // knowledge in the host). Called from inside handleRequest's try/catch, so throwing here
  // produces a normal error response.
  private async handleCompanionRequest(
    id: number,
    method: string,
    params: any[]
  ) {
    if (!this.opts.permissions.includes("companionFiles"))
      throw new Error(
        "This plugin does not have the companionFiles permission"
      );
    const companionDir = Path.dirname(this.sFilePath);
    const scopeFileName = this.sFileName;
    const resolve = (relPath: string) =>
      resolveCompanionPath(companionDir, scopeFileName, relPath);

    switch (method) {
      case "companions.list": {
        const subdir = params[0];
        const result: { name: string; size: number; mtimeMs: number }[] = [];
        // Which directory to read, and (for a subdir) validate it against the rule first.
        let dir = companionDir;
        if (subdir !== undefined && subdir !== null) {
          const rel = String(subdir);
          // A subdir must be a single allowed segment (no nesting / traversal).
          if (rel.replace(/\\/g, "/").includes("/") || !isAllowedCompanionPath(scopeFileName,rel))
            throw new Error(
              `companions.list: "${subdir}" is not an allowed subdirectory`
            );
          dir = Path.join(companionDir, rel);
        }
        if (await fs.pathExists(dir)) {
          for (const name of await fs.readdir(dir)) {
            // Top-level: only entries whose name passes the 1-segment rule. Inside a subdir:
            // every file (the plugin filters for what it cares about).
            if (subdir === undefined || subdir === null) {
              if (!isAllowedCompanionPath(scopeFileName,name)) continue;
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
        this.post(
          { type: "lameta:response", id, result: arrayBuffer },
          [arrayBuffer]
        );
        return;
      }
      case "companions.writeText": {
        const contents = params[1];
        if (typeof contents !== "string")
          throw new Error("companions.writeText: contents must be a string");
        await this.writeCompanionAtomically(resolve(params[0]), contents);
        this.post({ type: "lameta:response", id, result: undefined });
        return;
      }
      case "companions.writeBytes": {
        const data = params[1];
        if (!(data instanceof ArrayBuffer))
          throw new Error("companions.writeBytes: data must be an ArrayBuffer");
        await this.writeCompanionAtomically(
          resolve(params[0]),
          Buffer.from(data)
        );
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

  // Atomic write: to a temp file in the target's own directory, then rename over the
  // target, so a crash mid-write never leaves a truncated companion.
  private async writeCompanionAtomically(
    target: string,
    data: string | Buffer
  ) {
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
