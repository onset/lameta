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
import { PluginInitContext } from "./PluginApiTypes";
import {
  getSidecarPath,
  getPluginDataDir,
  parseSidecarName,
  isValidSidecarName,
  DEFAULT_SIDECAR_NAME
} from "./sidecar";
import {
  resolveCompanionPath,
  getAllowedCompanionSubdirs,
  getTopLevelCompanionNames
} from "./companions";

export interface PluginBridgeOptions {
  iframe: HTMLIFrameElement;
  context: PluginInitContext;
  /** absolute path to the actual file on disk (link files already resolved). */
  filePath: string;
  /** file name including extension. */
  fileName: string;
  /** owning folder directory — sidecars live under here. */
  folderDirectory: string;
  pluginId: string;
  /** the plugin's granted manifest permissions, e.g. ["companionFiles"]. */
  permissions: string[];
}

export class PluginHostBridge {
  private opts: PluginBridgeOptions;
  private listener: (event: MessageEvent) => void;
  private attached = false;

  constructor(opts: PluginBridgeOptions) {
    this.opts = opts;
    this.listener = this.onMessage.bind(this);
  }

  public attach() {
    if (this.attached) return;
    window.addEventListener("message", this.listener);
    this.attached = true;
  }

  public detach() {
    if (!this.attached) return;
    window.removeEventListener("message", this.listener);
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
      this.post({ type: "lameta:init", context: this.opts.context });
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
          const buf = await fs.readFile(this.opts.filePath);
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
          const { size } = await fs.stat(this.opts.filePath);
          const clamped = Math.max(0, Math.min(length, size - offset));
          const buf = Buffer.alloc(clamped);
          if (clamped > 0) {
            const fd = await fs.open(this.opts.filePath, "r");
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
            this.opts.folderDirectory,
            this.opts.pluginId,
            this.opts.fileName,
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
            this.opts.folderDirectory,
            this.opts.pluginId,
            this.opts.fileName,
            name
          );
          await fs.ensureDir(Path.dirname(path));
          await fs.writeFile(path, contents, "utf8");
          this.post({ type: "lameta:response", id, result: undefined });
          return;
        }
        case "listSidecars": {
          const dir = getPluginDataDir(
            this.opts.folderDirectory,
            this.opts.pluginId
          );
          let names: string[] = [];
          if (await fs.pathExists(dir)) {
            const entries = await fs.readdir(dir);
            names = entries
              .map((f) => parseSidecarName(f, this.opts.fileName))
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

  // The "companions.*" family: scoped access to SayMore-style companion files living
  // beside the ACTUAL selected file (Path.dirname(filePath), NOT folderDirectory — for
  // .link files the media lives elsewhere and its companions belong beside it). Every
  // relPath is validated by resolveCompanionPath against an allowlist derived from the
  // selected file's name. Called from inside handleRequest's try/catch, so throwing here
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
    const companionDir = Path.dirname(this.opts.filePath);
    const resolve = (relPath: string) =>
      resolveCompanionPath(companionDir, this.opts.fileName, relPath);

    switch (method) {
      case "companions.list": {
        const subdir = params[0];
        let result: { name: string; size: number; mtimeMs: number }[] = [];
        if (subdir !== undefined && subdir !== null) {
          const allowed = getAllowedCompanionSubdirs(this.opts.fileName);
          const match = allowed.find(
            (d) => d.toLowerCase() === String(subdir).toLowerCase()
          );
          if (!match)
            throw new Error(
              `companions.list: "${subdir}" is not an allowed subdirectory (allowed: ${allowed.join(
                ", "
              )})`
            );
          const dir = Path.join(companionDir, match);
          if (await fs.pathExists(dir)) {
            for (const name of await fs.readdir(dir)) {
              if (!name.toLowerCase().endsWith(".wav")) continue;
              const stats = await fs.stat(Path.join(dir, name));
              if (!stats.isFile()) continue;
              result.push({ name, size: stats.size, mtimeMs: stats.mtimeMs });
            }
          }
        } else {
          // No subdir: stat each allowed top-level companion that exists.
          for (const name of getTopLevelCompanionNames(this.opts.fileName)) {
            const p = Path.join(companionDir, name);
            if (await fs.pathExists(p)) {
              const stats = await fs.stat(p);
              if (!stats.isFile()) continue;
              result.push({ name, size: stats.size, mtimeMs: stats.mtimeMs });
            }
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
