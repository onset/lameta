// lameta plugin client kit (vendored plain-JS copy).
//
// This is a hand-vendored, dependency-free copy of src/plugins/client/lametaPluginClient.ts.
// Plugins ship their own copy for now; later this will be an installable @lameta/plugin-api.
//
// connectToLameta() posts "lameta:ready" to the host, waits for "lameta:init", and returns
// { context, api }. Each api method is a thin postMessage RPC.

export function connectToLameta(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let nextId = 1;
    const pending = new Map();

    let initTimer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Timed out waiting for lameta:init from host"));
    }, timeoutMs);

    function onMessage(event) {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "lameta:init") {
        if (initTimer) {
          clearTimeout(initTimer);
          initTimer = null;
        }
        resolve({ context: data.context, api });
        return;
      }

      if (data.type === "lameta:response") {
        const entry = pending.get(data.id);
        if (!entry) return;
        pending.delete(data.id);
        if (data.error !== undefined && data.error !== null) {
          entry.reject(new Error(data.error));
        } else {
          entry.resolve(data.result);
        }
      }
    }

    // Companion methods travel as dotted strings ("companions.readText", ...). `transfer`
    // lets writeBytes hand its ArrayBuffer to the host zero-copy (the buffer is unusable
    // in the plugin afterwards).
    function request(method, params, transfer) {
      const id = nextId++;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        const message = { type: "lameta:request", id, method, params };
        if (transfer && transfer.length) window.parent.postMessage(message, "*", transfer);
        else window.parent.postMessage(message, "*");
      });
    }

    const api = {
      getFileBytes: () => request("getFileBytes", []),
      readFileRange: (offset, length) => request("readFileRange", [offset, length]),
      readSidecar: (name) => request("readSidecar", [name]),
      writeSidecar: (contents, name) => request("writeSidecar", [contents, name]),
      listSidecars: () => request("listSidecars", []),
      // Always present; every call errors unless the manifest declares the
      // "companionFiles" permission.
      companions: {
        list: (subdir) => request("companions.list", [subdir]),
        exists: (relPath) => request("companions.exists", [relPath]),
        readText: (relPath) => request("companions.readText", [relPath]),
        readBytes: (relPath) => request("companions.readBytes", [relPath]),
        writeText: (relPath, contents) => request("companions.writeText", [relPath, contents]),
        writeBytes: (relPath, data) => request("companions.writeBytes", [relPath, data], [data]),
        rename: (fromRelPath, toRelPath) => request("companions.rename", [fromRelPath, toRelPath]),
        delete: (relPath) => request("companions.delete", [relPath]),
        stat: (relPath) => request("companions.stat", [relPath])
      }
    };

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "lameta:ready" }, "*");
  });
}
