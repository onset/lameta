import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs-extra";
import * as os from "os";
import * as Path from "path";
import { observable } from "mobx";
import { PluginHostBridge, PluginBridgeOptions } from "./PluginHostBridge";
import { PluginInitContext } from "./PluginApiTypes";

// Contract tests for the host side of the plugin postMessage API. The renderer's global
// `window` is replaced by a mock (src/vitest.mock.ts) whose addEventListener is a vi.fn(), so we
// capture the bridge's registered "message" listener and drive it with synthetic events, and we
// capture the responses the bridge posts to a fake iframe.contentWindow. Filesystem work runs
// against a real temp directory. This verifies the actual on-the-wire behavior a plugin sees.

const te = new TextEncoder();
const td = new TextDecoder();

function makeContext(overrides: Partial<PluginInitContext> = {}): PluginInitContext {
  return {
    apiVersion: 1,
    plugin: { id: "org.test.plugin", version: "1.0.0", grantedPermissions: [] },
    file: {
      path: "",
      name: "foo.wav",
      extension: "wav",
      mimeType: "audio/wav",
      lametaType: "Audio",
      uri: "file:///foo.wav"
    },
    folder: { type: "session", directory: "" },
    ui: { languageCode: "en", appVersion: "3.0.0" },
    ...overrides
  };
}

interface Harness {
  posted: { msg: any; transfer?: Transferable[] }[];
  contentWindow: any;
  loadHandlers: Array<() => void>;
  bridge: PluginHostBridge;
  listener: (e: any) => void;
  send: (data: any) => void;
  request: (method: string, params?: any[]) => Promise<any>;
  raw: (method: string, params?: any[]) => Promise<{ result?: any; error?: string }>;
}

let nextReqId = 1;

function makeHarness(opts: Partial<PluginBridgeOptions>): Harness {
  const posted: { msg: any; transfer?: Transferable[] }[] = [];
  const contentWindow: any = {
    postMessage: (msg: any, _origin: string, transfer?: Transferable[]) =>
      posted.push({ msg, transfer })
  };
  const loadHandlers: Array<() => void> = [];
  const iframe: any = {
    contentWindow,
    addEventListener: (type: string, fn: () => void) => {
      if (type === "load") loadHandlers.push(fn);
    },
    removeEventListener: () => {}
  };

  const full: PluginBridgeOptions = {
    iframe,
    context: makeContext(),
    filePath: "",
    fileName: "foo.wav",
    folderDirectory: "",
    pluginId: "org.test.plugin",
    permissions: [],
    ...opts
  };

  const callsBefore = (window.addEventListener as any).mock.calls.length;
  const bridge = new PluginHostBridge(full);
  bridge.attach();
  // Grab the message listener this attach() registered.
  const newCalls = (window.addEventListener as any).mock.calls.slice(callsBefore);
  const messageCall = newCalls.find((c: any[]) => c[0] === "message");
  const listener = messageCall![1] as (e: any) => void;

  const send = (data: any) => listener({ data, source: contentWindow });

  const raw = async (method: string, params: any[] = []) => {
    const id = nextReqId++;
    send({ type: "lameta:request", id, method, params });
    // handleRequest is async (real fs); poll the captured responses.
    for (let i = 0; i < 200; i++) {
      const hit = posted.find(
        (p) => p.msg?.type === "lameta:response" && p.msg.id === id
      );
      if (hit) return hit.msg as { result?: any; error?: string };
      await new Promise((r) => setTimeout(r, 2));
    }
    throw new Error(`no response for ${method}`);
  };
  const request = async (method: string, params: any[] = []) => {
    const r = await raw(method, params);
    if (r.error) throw new Error(r.error);
    return r.result;
  };

  return { posted, contentWindow, loadHandlers, bridge, listener, send, request, raw };
}

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-bridge-"));
});
afterEach(() => {
  try {
    fs.removeSync(tmp);
  } catch {}
});

/** Options wired to a real media file at <tmp>/foo.wav with companionFiles granted. */
function mediaOpts(perms: string[] = ["companionFiles"]): Partial<PluginBridgeOptions> {
  const filePath = Path.join(tmp, "foo.wav");
  fs.writeFileSync(filePath, "MEDIA-BYTES");
  return {
    filePath,
    fileName: "foo.wav",
    folderDirectory: tmp,
    permissions: perms,
    context: makeContext({
      file: {
        path: filePath,
        name: "foo.wav",
        extension: "wav",
        mimeType: "audio/wav",
        lametaType: "Audio",
        uri: "file:///foo.wav"
      },
      folder: { type: "session", directory: tmp }
    })
  };
}

describe("PluginHostBridge — handshake", () => {
  it("answers lameta:ready with lameta:init carrying the context", () => {
    const h = makeHarness(mediaOpts());
    h.send({ type: "lameta:ready" });
    const init = h.posted.find((p) => p.msg?.type === "lameta:init");
    expect(init).toBeTruthy();
    expect(init!.msg.context.apiVersion).toBe(1);
    expect(init!.msg.context.plugin.id).toBe("org.test.plugin");
  });

  it("also posts init on the iframe load event (covers a missed early ready)", () => {
    const h = makeHarness(mediaOpts());
    expect(h.loadHandlers.length).toBe(1);
    h.loadHandlers[0]();
    expect(h.posted.some((p) => p.msg?.type === "lameta:init")).toBe(true);
  });

  it("ignores messages that are not from its own iframe", () => {
    const h = makeHarness(mediaOpts());
    const before = h.posted.length;
    // A "ready" whose event.source is some OTHER window must be ignored.
    const otherWindow = { postMessage: () => {} };
    h.listener({ data: { type: "lameta:ready" }, source: otherWindow });
    expect(h.posted.length).toBe(before);
  });

  it("REGRESSION: the init context is structured-cloneable even when grantedPermissions is a MobX observable array", () => {
    // The real bug: postMessage(structured clone) threw DataCloneError on the observable Proxy,
    // so init never reached the iframe and the plugin hung "waiting for lameta:init".
    const perms = observable(["companionFiles"]);
    const h = makeHarness({
      ...mediaOpts(),
      permissions: ["companionFiles"],
      context: makeContext({
        plugin: {
          id: "org.test.plugin",
          version: "1.0.0",
          grantedPermissions: perms as unknown as string[]
        }
      })
    });
    h.send({ type: "lameta:ready" });
    const init = h.posted.find((p) => p.msg?.type === "lameta:init")!;
    const gp = init.msg.context.plugin.grantedPermissions;
    expect(gp).toEqual(["companionFiles"]);
    // The fix deep-plains the context, so the posted permissions must be a fresh COPY, not the
    // MobX observable that was passed in (posting that Proxy is what threw DataCloneError), and
    // the whole context must survive structuredClone (what postMessage does under the hood).
    expect(gp).not.toBe(perms);
    expect(() => structuredClone(init.msg.context)).not.toThrow();
  });
});

describe("PluginHostBridge — selected file access", () => {
  it("getFileBytes returns the whole file", async () => {
    const h = makeHarness(mediaOpts());
    const buf: ArrayBuffer = await h.request("getFileBytes");
    expect(td.decode(new Uint8Array(buf))).toBe("MEDIA-BYTES");
  });

  it("readFileRange returns a slice and clamps length to EOF", async () => {
    const h = makeHarness(mediaOpts());
    const slice: ArrayBuffer = await h.request("readFileRange", [0, 5]);
    expect(td.decode(new Uint8Array(slice))).toBe("MEDIA");
    // length past EOF is clamped, not an error
    const rest: ArrayBuffer = await h.request("readFileRange", [6, 9999]);
    expect(td.decode(new Uint8Array(rest))).toBe("BYTES");
  });

  it("readFileRange rejects negative / non-integer args", async () => {
    const h = makeHarness(mediaOpts());
    const r = await h.raw("readFileRange", [-1, 4]);
    expect(r.error).toMatch(/non-negative integers/);
  });
});

describe("PluginHostBridge — sidecars", () => {
  it("writeSidecar then readSidecar round-trips; listSidecars reports it", async () => {
    const h = makeHarness(mediaOpts());
    expect(await h.request("readSidecar", ["notes"])).toBeNull();
    await h.request("writeSidecar", ['{"x":1}', "notes"]);
    expect(await h.request("readSidecar", ["notes"])).toBe('{"x":1}');
    expect(await h.request("listSidecars")).toContain("notes");
  });
});

describe("PluginHostBridge — companions permission gating", () => {
  it("rejects every companions call without the companionFiles permission", async () => {
    const h = makeHarness(mediaOpts([])); // no permission
    const r = await h.raw("companions.exists", ["foo.wav.annotations.eaf"]);
    expect(r.error).toMatch(/companionFiles permission/);
  });
});

describe("PluginHostBridge — companions.* round-trips (generic scoping)", () => {
  it("writeText/readText/exists/stat/rename/delete a companion", async () => {
    const h = makeHarness(mediaOpts());
    const eaf = "foo.wav.annotations.eaf";
    expect(await h.request("companions.exists", [eaf])).toBe(false);
    await h.request("companions.writeText", [eaf, "<eaf/>"]);
    expect(await h.request("companions.exists", [eaf])).toBe(true);
    expect(await h.request("companions.readText", [eaf])).toBe("<eaf/>");
    const stat = await h.request("companions.stat", [eaf]);
    expect(stat.size).toBeGreaterThan(0);
    // atomic write leaves no stray temp files behind
    expect(fs.readdirSync(tmp).some((n) => n.includes(".tmp"))).toBe(false);

    await h.request("companions.rename", [eaf, "foo.wav.annotations.pfsx"]);
    expect(await h.request("companions.exists", [eaf])).toBe(false);
    expect(await h.request("companions.exists", ["foo.wav.annotations.pfsx"])).toBe(
      true
    );

    await h.request("companions.delete", ["foo.wav.annotations.pfsx"]);
    expect(await h.request("companions.exists", ["foo.wav.annotations.pfsx"])).toBe(
      false
    );
  });

  it("writeBytes/readBytes round-trips a segment wav one level deep", async () => {
    const h = makeHarness(mediaOpts());
    const rel = "foo.wav_Annotations/0.75_to_1.25_Careful.wav";
    const bytes = te.encode("WAVDATA").buffer;
    await h.request("companions.writeBytes", [rel, bytes]);
    const back: ArrayBuffer = await h.request("companions.readBytes", [rel]);
    expect(td.decode(new Uint8Array(back))).toBe("WAVDATA");
  });

  it("list() with no arg returns stem-family files in the directory", async () => {
    const h = makeHarness(mediaOpts());
    await h.request("companions.writeText", ["foo.wav.annotations.eaf", "x"]);
    fs.writeFileSync(Path.join(tmp, "unrelated.txt"), "y");
    const list: { name: string }[] = await h.request("companions.list");
    const names = list.map((e) => e.name);
    expect(names).toContain("foo.wav.annotations.eaf");
    expect(names).not.toContain("unrelated.txt");
  });

  it("list(subdir) lists all files inside an allowed annotations dir", async () => {
    const h = makeHarness(mediaOpts());
    await h.request("companions.writeBytes", [
      "foo.wav_Annotations/seg.wav",
      te.encode("a").buffer
    ]);
    await h.request("companions.writeText", [
      "foo.wav_Annotations/seg.txt",
      "note"
    ]);
    const list: { name: string }[] = await h.request("companions.list", [
      "foo.wav_Annotations"
    ]);
    const names = list.map((e) => e.name).sort();
    expect(names).toEqual(["seg.txt", "seg.wav"]);
  });

  it("rejects a companion path outside the file's stem family", async () => {
    const h = makeHarness(mediaOpts());
    const r = await h.raw("companions.readText", ["other.mp3.annotations.eaf"]);
    expect(r.error).toMatch(/not an allowed companion path/);
  });

  it("rejects traversal and absolute companion paths", async () => {
    const h = makeHarness(mediaOpts());
    expect((await h.raw("companions.readText", ["../evil"])).error).toBeTruthy();
    expect(
      (await h.raw("companions.writeText", ["/etc/passwd", "x"])).error
    ).toBeTruthy();
  });

  it("refuses to delete a directory", async () => {
    const h = makeHarness(mediaOpts());
    await h.request("companions.writeBytes", [
      "foo.wav_Annotations/seg.wav",
      te.encode("a").buffer
    ]);
    const r = await h.raw("companions.delete", ["foo.wav_Annotations"]);
    expect(r.error).toMatch(/refusing to delete a directory/);
  });

  it("anchors on the media when the SELECTED file is the .eaf", async () => {
    // Selecting <media>.annotations.eaf must still reach the media + its _Annotations.
    fs.writeFileSync(Path.join(tmp, "foo.wav"), "MEDIA-BYTES"); // the underlying media
    const eafPath = Path.join(tmp, "foo.wav.annotations.eaf");
    fs.writeFileSync(eafPath, "<eaf/>");
    const h = makeHarness({
      filePath: eafPath,
      fileName: "foo.wav.annotations.eaf",
      folderDirectory: tmp,
      permissions: ["companionFiles"],
      context: makeContext({
        file: {
          path: eafPath,
          name: "foo.wav.annotations.eaf",
          extension: "eaf",
          mimeType: "text/xml",
          lametaType: "ELAN",
          uri: "file:///foo.wav.annotations.eaf"
        },
        folder: { type: "session", directory: tmp }
      })
    });
    // the media file itself is reachable
    expect(await h.request("companions.readText", ["foo.wav"])).toBe("MEDIA-BYTES");
    // and its segment recordings
    await h.request("companions.writeBytes", [
      "foo.wav_Annotations/seg.wav",
      te.encode("s").buffer
    ]);
    expect(await h.request("companions.exists", ["foo.wav_Annotations/seg.wav"])).toBe(
      true
    );
  });
});

describe("PluginHostBridge — selectFile", () => {
  it("invokes onSelectFile for a bare filename and returns its result", async () => {
    const calls: string[] = [];
    const h = makeHarness({
      ...mediaOpts(),
      onSelectFile: (rel: string) => {
        calls.push(rel);
        return true;
      }
    });
    expect(await h.request("selectFile", ["foo.wav.annotations.eaf"])).toBe(true);
    expect(calls).toEqual(["foo.wav.annotations.eaf"]);
  });

  it("rejects traversal / absolute / nested selectFile targets", async () => {
    const h = makeHarness({ ...mediaOpts(), onSelectFile: () => true });
    expect((await h.raw("selectFile", ["../x"])).error).toMatch(/bare file name/);
    expect((await h.raw("selectFile", ["C:/x"])).error).toMatch(/bare file name/);
    expect((await h.raw("selectFile", ["sub/x"])).error).toMatch(/bare file name/);
  });

  it("rejects selectFile when the host provides no handler", async () => {
    const h = makeHarness(mediaOpts()); // no onSelectFile
    const r = await h.raw("selectFile", ["foo.wav.annotations.eaf"]);
    expect(r.error).toMatch(/not supported/);
  });
});

describe("PluginHostBridge — unknown method", () => {
  it("returns an error for an unknown method", async () => {
    const h = makeHarness(mediaOpts());
    const r = await h.raw("bogusMethod", []);
    expect(r.error).toMatch(/Unknown plugin API method/);
  });
});

describe("PluginHostBridge — tab provider (getTabs)", () => {
  function providerHarness() {
    return makeHarness({
      role: "tabProvider",
      permissions: ["companionFiles"],
      filePath: "",
      fileName: "",
      folderDirectory: "",
      context: {
        apiVersion: 1,
        plugin: {
          id: "org.test.plugin",
          version: "1.0.0",
          grantedPermissions: ["companionFiles"]
        },
        ui: { languageCode: "en", appVersion: "3.0.0" },
        role: "tabProvider"
      } as any
    });
  }
  const fileQuery = (name: string, extension: string) => ({
    file: {
      name,
      extension,
      mimeType: "application/octet-stream",
      lametaType: extension === "eaf" ? "ELAN" : "Audio",
      path: Path.join(tmp, name),
      uri: "file:///" + name
    },
    folder: { type: "session", directory: tmp }
  });

  it("sends getTabs and resolves with the provider's returned tabs", async () => {
    const h = providerHarness();
    const p = h.bridge.getTabs(fileQuery("foo.wav", "wav"));
    const q = h.posted.find((m) => m.msg?.type === "lameta:getTabs")!;
    expect(q.msg.file.name).toBe("foo.wav");
    h.send({
      type: "lameta:tabs",
      id: q.msg.id,
      tabs: [{ id: "start", label: "SayMore: Start Annotating" }]
    });
    expect(await p).toEqual([{ id: "start", label: "SayMore: Start Annotating" }]);
  });

  it("scopes the provider's companions.* to the QUERIED file while a query is in flight", async () => {
    const h = providerHarness();
    fs.writeFileSync(Path.join(tmp, "foo.wav"), "MEDIA"); // the media beside the eaf
    // Query for the .eaf; the provider decides live by checking the media companion.
    const p = h.bridge.getTabs(fileQuery("foo.wav.annotations.eaf", "eaf"));
    // The provider (simulated) asks: does the media exist? Scope must anchor on foo.
    const exists = await h.raw("companions.exists", ["foo.wav"]);
    expect(exists.result).toBe(true);
    const nope = await h.raw("companions.exists", ["bar.wav"]); // different stem -> rejected
    expect(nope.error).toBeTruthy();
    // Then the provider answers.
    const q = h.posted.find((m) => m.msg?.type === "lameta:getTabs")!;
    h.send({
      type: "lameta:tabs",
      id: q.msg.id,
      tabs: [{ id: "segments", label: "Segments", claimDefault: true }]
    });
    expect(await p).toEqual([
      { id: "segments", label: "Segments", claimDefault: true }
    ]);
  });

  it("treats a malformed tabs response as [] (never a hang)", async () => {
    const h = providerHarness();
    const p = h.bridge.getTabs(fileQuery("foo.wav", "wav"));
    const q = h.posted.find((m) => m.msg?.type === "lameta:getTabs")!;
    h.send({ type: "lameta:tabs", id: q.msg.id, tabs: "not-an-array" });
    expect(await p).toEqual([]);
  });

  it("posts a tab-provider init (role tabProvider) on ready", () => {
    const h = providerHarness();
    h.send({ type: "lameta:ready" });
    const init = h.posted.find((m) => m.msg?.type === "lameta:init")!;
    expect(init.msg.context.role).toBe("tabProvider");
    expect((init.msg.context as any).file).toBeUndefined();
  });
});

describe("PluginHostBridge — write-completion guarantee on teardown", () => {
  it("completes an in-flight write even if the iframe is torn down before the response", async () => {
    const opts = mediaOpts();
    const h = makeHarness(opts);
    // Dispatch a write, then IMMEDIATELY simulate teardown: detach the bridge and drop the
    // iframe's contentWindow (as when the user switches files and the iframe is destroyed).
    // The request was already received, so its disk write must still complete; the response
    // post has nowhere to go and must be dropped silently (never throw).
    h.send({
      type: "lameta:request",
      id: 99999,
      method: "companions.writeText",
      params: ["foo.wav.annotations.eaf", "PERSISTED"]
    });
    h.bridge.detach();
    (h.contentWindow as any).postMessage = () => {
      throw new Error("window is gone");
    };
    const target = Path.join(tmp, "foo.wav.annotations.eaf");
    let ok = false;
    for (let i = 0; i < 200; i++) {
      if (fs.existsSync(target) && fs.readFileSync(target, "utf8") === "PERSISTED") {
        ok = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 2));
    }
    expect(ok).toBe(true); // the write finished despite teardown, and no throw escaped
  });
});
