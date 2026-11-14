import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { connectToLameta, READY_RESEND_MS } from "./lametaPluginClient";

// The client kit runs inside a plugin iframe. We stand in for the iframe's `window` and capture
// the `lameta:ready` messages it posts to its parent.
describe("connectToLameta handshake", () => {
  let posted: any[];
  let listener: ((e: any) => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    posted = [];
    listener = undefined;
    vi.stubGlobal("window", {
      parent: { postMessage: (m: any) => posted.push(m) },
      addEventListener: (_t: string, l: any) => (listener = l),
      removeEventListener: () => {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const readyCount = () => posted.filter((m) => m.type === "lameta:ready").length;

  it("posts ready at once and again every interval until init arrives", () => {
    void connectToLameta().catch(() => {});
    expect(readyCount()).toBe(1);
    vi.advanceTimersByTime(READY_RESEND_MS * 3);
    expect(readyCount()).toBe(4);
  });

  it("stops resending ready once init arrives", async () => {
    const connection = connectToLameta();
    vi.advanceTimersByTime(READY_RESEND_MS);
    listener!({ data: { type: "lameta:init", context: { role: "tab" } } });
    await expect(connection).resolves.toMatchObject({ context: { role: "tab" } });
    const before = readyCount();
    vi.advanceTimersByTime(READY_RESEND_MS * 5);
    expect(readyCount()).toBe(before);
  });

  async function connect() {
    const connection = connectToLameta();
    listener!({ data: { type: "lameta:init", context: { role: "tab" } } });
    return (await connection).api;
  }
  const lastRequest = () => posted.filter((m) => m.type === "lameta:request").pop();

  it("sends selectFile with one argument, or with the tab id when given", async () => {
    const api = await connect();
    void api.selectFile("a.eaf");
    expect(lastRequest()).toMatchObject({ method: "selectFile", params: ["a.eaf"] });
    void api.selectFile("a.eaf", { tabId: "segments" });
    expect(lastRequest()).toMatchObject({
      method: "selectFile",
      params: ["a.eaf", { tabId: "segments" }],
    });
  });

  it("sends saveFile with exactly the bytes of a typed array view", async () => {
    const api = await connect();
    const backing = new Uint8Array([9, 1, 2, 3, 9]);
    void api.saveFile("out.bin", backing.subarray(1, 4), { rememberFolderKey: "k" });
    const r = lastRequest();
    expect(r.method).toBe("saveFile");
    expect(r.params[0]).toBe("out.bin");
    expect([...new Uint8Array(r.params[1])]).toEqual([1, 2, 3]);
    expect(r.params[2]).toEqual({ rememberFolderKey: "k" });
  });

  it("sends the project-settings calls", async () => {
    const api = await connect();
    void api.getProjectSettings();
    expect(lastRequest()).toMatchObject({ method: "getProjectSettings", params: [] });
    void api.setProjectSettings({ font: "Charis SIL" });
    expect(lastRequest()).toMatchObject({
      method: "setProjectSettings",
      params: [{ font: "Charis SIL" }],
    });
  });

  it("stops resending ready when the connection times out", async () => {
    const connection = connectToLameta(1000).catch((e) => e);
    vi.advanceTimersByTime(1000);
    expect(await connection).toBeInstanceOf(Error);
    const before = readyCount();
    vi.advanceTimersByTime(READY_RESEND_MS * 5);
    expect(readyCount()).toBe(before);
  });
});
