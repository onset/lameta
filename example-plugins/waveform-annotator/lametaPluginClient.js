// lameta plugin client kit (vendored plain-JS copy).
//
// Generated from src/plugins/client/lametaPluginClient.ts, which documents every function:
//   npx esbuild src/plugins/client/lametaPluginClient.ts --format=esm --target=es2020 \
//     --outfile=example-plugins/waveform-annotator/lametaPluginClient.js
// Plugins ship their own copy for now; later this will be an installable @lameta/plugin-api.

const READY_RESEND_MS = 150;
function toArrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes;
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return copy;
}
function makeApiPlumbing() {
  let nextId = 1;
  const pending = /* @__PURE__ */ new Map();
  const progress = /* @__PURE__ */ new Map();
  function handleResponse(data) {
    const entry = pending.get(data.id);
    progress.delete(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if (data.error !== void 0 && data.error !== null) entry.reject(new Error(data.error));
    else entry.resolve(data.result);
  }
  function handleProgress(data) {
    const cb = progress.get(data.id);
    if (!cb) return;
    try {
      cb(data.fraction);
    } catch {}
  }
  function request(method, params, transfer, onProgress) {
    const id = nextId++;
    if (onProgress) progress.set(id, onProgress);
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
    selectFile: (relPath, options) =>
      request("selectFile", options ? [relPath, options] : [relPath]),
    // The plugin's own ArrayBuffer is copied, not transferred, so it stays usable after a save.
    // The copy that toArrayBuffer makes of a typed array or DataView is transferred.
    saveFile: (suggestedName, bytes, options) => {
      const buffer = toArrayBuffer(bytes);
      return request(
        "saveFile",
        [suggestedName, buffer, options],
        buffer === bytes ? void 0 : [buffer],
      );
    },
    getProjectSettings: () => request("getProjectSettings", []),
    setProjectSettings: (value) => request("setProjectSettings", [value]),
    companions: {
      list: (subdir) => request("companions.list", [subdir]),
      exists: (relPath) => request("companions.exists", [relPath]),
      readText: (relPath) => request("companions.readText", [relPath]),
      readBytes: (relPath) => request("companions.readBytes", [relPath]),
      writeText: (relPath, contents) => request("companions.writeText", [relPath, contents]),
      writeBytes: (relPath, data) => request("companions.writeBytes", [relPath, data], [data]),
      rename: (fromRelPath, toRelPath) => request("companions.rename", [fromRelPath, toRelPath]),
      delete: (relPath) => request("companions.delete", [relPath]),
      stat: (relPath) => request("companions.stat", [relPath]),
    },
    ffmpeg: {
      probe: (relPath) => request("ffmpeg.probe", [relPath]),
      run: (spec) => {
        const { onProgress, ...params } = spec;
        return request("ffmpeg.run", [params], void 0, onProgress);
      },
    },
  };
  return { api, handleResponse, handleProgress };
}
let tabProviderHandler = null;
function serveTabProvider(handler) {
  tabProviderHandler = handler;
}
function connectToLameta(timeoutMs = 1e4) {
  return new Promise((resolve, reject) => {
    const { api, handleResponse, handleProgress } = makeApiPlumbing();
    let connected = false;
    let initTimer = setTimeout(() => {
      if (!connected) {
        clearInterval(readyTimer);
        window.removeEventListener("message", onMessage);
        reject(new Error("Timed out waiting for lameta:init from host"));
      }
    }, timeoutMs);
    async function onMessage(event) {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "lameta:init") {
        if (initTimer) {
          clearTimeout(initTimer);
          initTimer = null;
        }
        if (!connected) {
          connected = true;
          resolve({ context: data.context, api });
        }
        return;
      }
      if (data.type === "lameta:response") {
        handleResponse(data);
        return;
      }
      if (data.type === "lameta:progress") {
        handleProgress(data);
        return;
      }
      if (data.type === "lameta:getTabs") {
        const { id, file, folder } = data;
        let tabs = [];
        if (tabProviderHandler) {
          try {
            tabs = (await tabProviderHandler({ file, folder, api })) || [];
          } catch {
            tabs = [];
          }
        }
        window.parent.postMessage({ type: "lameta:tabs", id, tabs }, "*");
      }
    }
    window.addEventListener("message", onMessage);
    const announce = () => window.parent.postMessage({ type: "lameta:ready" }, "*");
    announce();
    const readyTimer = setInterval(() => {
      if (connected) clearInterval(readyTimer);
      else announce();
    }, READY_RESEND_MS);
  });
}
function connectAsTabProvider(handler, timeoutMs = 1e4) {
  serveTabProvider(handler);
  return connectToLameta(timeoutMs).then(() => void 0);
}
export { READY_RESEND_MS, connectAsTabProvider, connectToLameta, serveTabProvider };
