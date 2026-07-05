// lameta plugin client kit (canonical TypeScript source).
//
// This is the ~small, dependency-free helper a plugin runs INSIDE its iframe to talk to
// lameta. For now plugins vendor a copy of this (see example-plugins/.../lametaPluginClient.js);
// eventually this ships as part of the `@lameta/plugin-api` package. Keep it dependency-free
// and framework-free.
//
// Two entry points:
//   connectToLameta()        — for a CONTENT TAB iframe; returns { context, api }.
//   connectAsTabProvider(fn)  — for the hidden TAB-PROVIDER iframe; lameta calls fn() on every
//                               selection change to ask which tabs to show.
//
// Usage inside a content tab:
//   import { connectToLameta } from "./lametaPluginClient.js";
//   const { context, api } = await connectToLameta();
//   const bytes = await api.getFileBytes();
//   await api.writeSidecar(JSON.stringify(data));   // debounce your writes!
//
// Usage inside the tab provider (a hidden page lameta loads once per plugin):
//   import { connectAsTabProvider } from "./lametaPluginClient.js";
//   await connectAsTabProvider(async ({ file, folder, api }) => {
//     if (file.lametaType === "Audio") {
//       const hasEaf = await api.companions.exists(file.name + ".annotations.eaf");
//       return hasEaf ? [] : [{ id: "start", label: "Start Annotating" }];
//     }
//     if (file.extension === "eaf")
//       return [{ id: "segments", label: "Segments", claimDefault: true }];
//     return [];
//   });
//
// IMPORTANT for content-tab authors: your iframe is created fresh for each file and destroyed on
// file change / tab switch (and, during development, whenever you edit your source). There
// are no "selection changed" events. So persist eagerly (debounced) and restore your state
// from readSidecar() on connect — that makes hot-reload loss-free.

import {
  PluginHostApiV1,
  PluginInitContext,
  PluginProgressMessage,
  PluginResponseMessage,
  PluginTabProviderContext,
  TabDescriptor
} from "../PluginApiTypes";

export interface LametaConnection {
  /** For a content tab this is a PluginInitContext (`role:"tab"`, with `file`/`folder`/`tab`).
   * For the hidden tab-provider iframe it is a PluginTabProviderContext (`role:"tabProvider"`).
   * Branch on `context.role` — one shared `entry` can serve both. */
  context: PluginInitContext | PluginTabProviderContext;
  api: PluginHostApiV1;
}

/** The query a tab provider's handler receives on each selection change. */
export interface TabProviderQuery {
  file: {
    name: string;
    extension: string;
    mimeType: string;
    lametaType: string;
    path: string;
    uri: string;
  };
  folder: { type: string; directory: string };
  /** The same scoped host API as a content tab, but scoped to THIS query's file — so
   * `api.companions.exists("<media>.annotations.eaf")` answers for the file being queried. */
  api: PluginHostApiV1;
}

export type TabProviderHandler = (
  query: TabProviderQuery
) => TabDescriptor[] | Promise<TabDescriptor[]>;

// Shared plumbing: a pending-response map + a `request()` and the typed `api` built on it.
function makeApiPlumbing() {
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: any) => void }
  >();
  // onProgress callbacks are functions (not serializable), so they never cross the wire —
  // the client stashes them by request id and invokes them on `lameta:progress`.
  const progress = new Map<number, (fraction: number) => void>();

  function handleResponse(data: PluginResponseMessage) {
    const entry = pending.get(data.id);
    progress.delete(data.id); // the response is terminal: drop any progress cb for this id
    if (!entry) return;
    pending.delete(data.id);
    if (data.error !== undefined && data.error !== null)
      entry.reject(new Error(data.error));
    else entry.resolve(data.result);
  }

  function handleProgress(data: PluginProgressMessage) {
    const cb = progress.get(data.id);
    if (!cb) return;
    try {
      cb(data.fraction);
    } catch {
      // a throwing progress callback must never break the message loop
    }
  }

  function request(
    method: string,
    params: any[],
    transfer?: Transferable[],
    onProgress?: (fraction: number) => void
  ): Promise<any> {
    const id = nextId++;
    if (onProgress) progress.set(id, onProgress);
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
    selectFile: (relPath: string) => request("selectFile", [relPath]),
    companions: {
      list: (subdir?: string) => request("companions.list", [subdir]),
      exists: (relPath: string) => request("companions.exists", [relPath]),
      readText: (relPath: string) => request("companions.readText", [relPath]),
      readBytes: (relPath: string) => request("companions.readBytes", [relPath]),
      writeText: (relPath: string, contents: string) =>
        request("companions.writeText", [relPath, contents]),
      writeBytes: (relPath: string, data: ArrayBuffer) =>
        request("companions.writeBytes", [relPath, data], [data]),
      rename: (fromRelPath: string, toRelPath: string) =>
        request("companions.rename", [fromRelPath, toRelPath]),
      delete: (relPath: string) => request("companions.delete", [relPath]),
      stat: (relPath: string) => request("companions.stat", [relPath])
    },
    ffmpeg: {
      probe: (relPath?: string) => request("ffmpeg.probe", [relPath]),
      run: (spec: {
        inputRelPath?: string;
        outputRelPath: string;
        args: string[];
        inputArgs?: string[];
        onProgress?: (fraction: number) => void;
      }) => {
        // onProgress isn't serializable: keep it client-side and send only the rest.
        const { onProgress, ...params } = spec;
        return request("ffmpeg.run", [params], undefined, onProgress);
      }
    }
  };

  return { api, handleResponse, handleProgress };
}

// The tab-provider handler, registered via serveTabProvider(). Because one shared `entry` can be
// loaded as EITHER a content tab or the hidden provider, a plugin connects first, learns its role
// from `context.role`, and (if "tabProvider") registers a handler — which the same message loop
// invokes on each `lameta:getTabs`.
let tabProviderHandler: TabProviderHandler | null = null;

/**
 * Register the handler lameta calls (on EVERY selection change, uncached) to ask which tabs to
 * show. Call it from the `role === "tabProvider"` branch after `connectToLameta()`. The handler
 * must recompute live (e.g. `await api.companions.exists(...)`); its companions.* calls are scoped
 * to the file being queried.
 */
export function serveTabProvider(handler: TabProviderHandler): void {
  tabProviderHandler = handler;
}

/**
 * Connect this iframe to lameta and resolve with `{ context, api }`. Works for BOTH roles:
 *   const { context, api } = await connectToLameta();
 *   if (context.role === "tabProvider") serveTabProvider(myHandler);   // hidden provider iframe
 *   else renderMyTab(context, api);                                    // content tab iframe
 * The message loop stays alive after connecting to service API responses and (for a provider)
 * `lameta:getTabs` queries.
 */
export function connectToLameta(
  timeoutMs = 10000
): Promise<LametaConnection> {
  return new Promise((resolve, reject) => {
    const { api, handleResponse, handleProgress } = makeApiPlumbing();
    let connected = false;

    let initTimer: any = setTimeout(() => {
      if (!connected) {
        window.removeEventListener("message", onMessage);
        reject(new Error("Timed out waiting for lameta:init from host"));
      }
    }, timeoutMs);

    async function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "lameta:init") {
        if (initTimer) {
          clearTimeout(initTimer);
          initTimer = null;
        }
        if (!connected) {
          connected = true;
          resolve({ context: (data as any).context, api });
        }
        return;
      }

      if (data.type === "lameta:response") {
        handleResponse(data as PluginResponseMessage);
        return;
      }

      if (data.type === "lameta:progress") {
        handleProgress(data as PluginProgressMessage);
        return;
      }

      if (data.type === "lameta:getTabs") {
        const { id, file, folder } = data as any;
        let tabs: TabDescriptor[] = [];
        if (tabProviderHandler) {
          try {
            tabs = (await tabProviderHandler({ file, folder, api })) || [];
          } catch {
            // A failing provider must not wedge the host: report "no tabs" for this query.
            tabs = [];
          }
        }
        window.parent.postMessage({ type: "lameta:tabs", id, tabs }, "*");
      }
    }

    window.addEventListener("message", onMessage);
    // Announce we're ready; the host replies with lameta:init (and also re-sends it on our load,
    // so a missed early ready self-heals).
    window.parent.postMessage({ type: "lameta:ready" }, "*");
  });
}

/**
 * Convenience for a provider-only entry: register the handler and connect. Equivalent to
 * `serveTabProvider(handler); await connectToLameta();`. Prefer `connectToLameta()` +
 * `serveTabProvider()` when one shared entry serves both roles.
 */
export function connectAsTabProvider(
  handler: TabProviderHandler,
  timeoutMs = 10000
): Promise<void> {
  serveTabProvider(handler);
  return connectToLameta(timeoutMs).then(() => undefined);
}
