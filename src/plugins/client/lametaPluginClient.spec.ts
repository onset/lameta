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

  it("stops resending ready when the connection times out", async () => {
    const connection = connectToLameta(1000).catch((e) => e);
    vi.advanceTimersByTime(1000);
    expect(await connection).toBeInstanceOf(Error);
    const before = readyCount();
    vi.advanceTimersByTime(READY_RESEND_MS * 5);
    expect(readyCount()).toBe(before);
  });
});
