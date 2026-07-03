// lameta plugin client kit (canonical TypeScript source).
//
// This is the ~small, dependency-free helper a plugin runs INSIDE its iframe to talk to
// lameta. For now plugins vendor a copy of this (see example-plugins/.../lametaPluginClient.js);
// eventually this ships as part of the `@lameta/plugin-api` package. Keep it dependency-free
// and framework-free.
//
// Usage inside a plugin:
//   import { connectToLameta } from "./lametaPluginClient.js";
//   const { context, api } = await connectToLameta();
//   const bytes = await api.getFileBytes();
//   await api.writeSidecar(JSON.stringify(data));   // debounce your writes!
//
// IMPORTANT for plugin authors: your iframe is created fresh for each file and destroyed on
// file change / tab switch (and, during development, whenever you edit your source). There
// are no "selection changed" events. So persist eagerly (debounced) and restore your state
// from readSidecar() on connect — that makes hot-reload loss-free.

import {
  PluginHostApiV1,
  PluginInitContext,
  PluginResponseMessage
} from "../PluginApiTypes";

export interface LametaConnection {
  context: PluginInitContext;
  api: PluginHostApiV1;
}

export function connectToLameta(
  timeoutMs = 10000
): Promise<LametaConnection> {
  return new Promise((resolve, reject) => {
    let nextId = 1;
    const pending = new Map<
      number,
      { resolve: (v: any) => void; reject: (e: any) => void }
    >();

    let initTimer: any = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Timed out waiting for lameta:init from host"));
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "lameta:init") {
        if (initTimer) {
          clearTimeout(initTimer);
          initTimer = null;
        }
        const context = (data as any).context as PluginInitContext;
        resolve({ context, api });
        return;
      }

      if (data.type === "lameta:response") {
        const msg = data as PluginResponseMessage;
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        if (msg.error !== undefined && msg.error !== null) {
          entry.reject(new Error(msg.error));
        } else {
          entry.resolve(msg.result);
        }
      }
    }

    // Companion methods travel as dotted strings ("companions.readText", ...), so
    // `method` is a plain string. `transfer` lets writeBytes hand its ArrayBuffer to the
    // host zero-copy (the buffer is unusable in the plugin afterwards).
    function request(
      method: string,
      params: any[],
      transfer?: Transferable[]
    ): Promise<any> {
      const id = nextId++;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        const message = { type: "lameta:request", id, method, params };
        if (transfer && transfer.length)
          window.parent.postMessage(message, "*", transfer);
        else window.parent.postMessage(message, "*");
      });
    }

    const api: PluginHostApiV1 = {
      getFileBytes: () => request("getFileBytes", []),
      readFileRange: (offset: number, length: number) =>
        request("readFileRange", [offset, length]),
      readSidecar: (name?: string) => request("readSidecar", [name]),
      writeSidecar: (contents: string, name?: string) =>
        request("writeSidecar", [contents, name]),
      listSidecars: () => request("listSidecars", []),
      // Always present; every call errors unless the manifest declares the
      // "companionFiles" permission.
      companions: {
        list: (subdir?: string) => request("companions.list", [subdir]),
        exists: (relPath: string) => request("companions.exists", [relPath]),
        readText: (relPath: string) =>
          request("companions.readText", [relPath]),
        readBytes: (relPath: string) =>
          request("companions.readBytes", [relPath]),
        writeText: (relPath: string, contents: string) =>
          request("companions.writeText", [relPath, contents]),
        writeBytes: (relPath: string, data: ArrayBuffer) =>
          request("companions.writeBytes", [relPath, data], [data]),
        rename: (fromRelPath: string, toRelPath: string) =>
          request("companions.rename", [fromRelPath, toRelPath]),
        delete: (relPath: string) => request("companions.delete", [relPath]),
        stat: (relPath: string) => request("companions.stat", [relPath])
      }
    };

    window.addEventListener("message", onMessage);
    // Tell the host we're loaded and ready for lameta:init.
    window.parent.postMessage({ type: "lameta:ready" }, "*");
  });
}
