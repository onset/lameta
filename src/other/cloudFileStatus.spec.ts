import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs-extra";
import * as temp from "temp";
import {
  getCloudFileStatus,
  hydrateFile,
  setAttributeReaderForTests
} from "./cloudFileStatus";

describe("getCloudFileStatus", () => {
  afterEach(() => {
    setAttributeReaderForTests(undefined);
  });

  it("returns cloudOnly when IS_OFFLINE and IS_RECALL_ON_DATA_ACCESS are set", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: true,
      IS_RECALL_ON_DATA_ACCESS: true,
      IS_RECALL_ON_OPEN: false
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("cloudOnly");
  });

  it("returns cloudOnly when only IS_RECALL_ON_OPEN is set", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: false,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: true
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("cloudOnly");
  });

  it("returns local when attributes indicate a normal, hydrated file", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: false,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: false
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("local");
  });

  it("returns unknown when the reader returns undefined", () => {
    setAttributeReaderForTests(() => undefined);
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("unknown");
  });

  it("returns unknown when the reader throws", () => {
    setAttributeReaderForTests(() => {
      throw new Error("boom");
    });
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("unknown");
  });
});

describe("hydrateFile", () => {
  let filePath: string;

  beforeEach(() => {
    filePath = temp.path({ suffix: ".bin" }) as string;
    fs.writeFileSync(filePath, "pretend cloud-only file contents");
  });

  afterEach(() => {
    setAttributeReaderForTests(undefined);
    try {
      fs.removeSync(filePath);
    } catch (e) {
      // ignore cleanup errors
    }
  });

  // Real (short) timers are used here rather than vi.useFakeTimers(), because
  // hydrateFile's initial open()/read() is genuine, unmocked fs I/O -- under
  // load (e.g. the full test suite) that real I/O can be slow enough that a
  // fixed number of fake-timer advances races it and flakes.
  it("resolves once polling observes the file has become local", async () => {
    let pollCount = 0;
    setAttributeReaderForTests(() => {
      pollCount++;
      const isLocalNow = pollCount > 3;
      return {
        IS_OFFLINE: !isLocalNow,
        IS_RECALL_ON_DATA_ACCESS: !isLocalNow,
        IS_RECALL_ON_OPEN: false
      };
    });

    await hydrateFile(filePath, { pollIntervalMs: 10 });

    expect(pollCount).toBeGreaterThan(3);
  });

  it("rejects when the AbortSignal is aborted", async () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: true,
      IS_RECALL_ON_DATA_ACCESS: true,
      IS_RECALL_ON_OPEN: false
    }));

    const controller = new AbortController();
    const promise = hydrateFile(filePath, {
      pollIntervalMs: 10,
      signal: controller.signal
    });
    const expectation = expect(promise).rejects.toThrow();

    setTimeout(() => controller.abort(), 25);

    await expectation;
  });

  it("rejects after timeoutMs elapses when the file never becomes local", async () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: true,
      IS_RECALL_ON_DATA_ACCESS: true,
      IS_RECALL_ON_OPEN: false
    }));

    const promise = hydrateFile(filePath, {
      pollIntervalMs: 10,
      timeoutMs: 30
    });

    await expect(promise).rejects.toThrow(/timed out/);
  });

  it("rejects after repeated 'unknown' status instead of polling forever", async () => {
    // simulates fswin being unreadable / erroring on every call
    setAttributeReaderForTests(() => undefined);

    const promise = hydrateFile(filePath, { pollIntervalMs: 10 });

    await expect(promise).rejects.toThrow(/consecutive/);
  });

  it("does not give up on 'unknown' status if it recovers before the threshold", async () => {
    let pollCount = 0;
    setAttributeReaderForTests(() => {
      pollCount++;
      // "unknown" (undefined) a couple of times, then recover to local --
      // should NOT trip the consecutive-unknown failure.
      if (pollCount <= 2) {
        return undefined;
      }
      return {
        IS_OFFLINE: false,
        IS_RECALL_ON_DATA_ACCESS: false,
        IS_RECALL_ON_OPEN: false
      };
    });

    await hydrateFile(filePath, { pollIntervalMs: 10 });

    expect(pollCount).toBeGreaterThan(2);
  });

  it("does not leak an abort listener on the signal after each poll", async () => {
    let pollCount = 0;
    setAttributeReaderForTests(() => {
      pollCount++;
      const isLocalNow = pollCount > 20;
      return {
        IS_OFFLINE: !isLocalNow,
        IS_RECALL_ON_DATA_ACCESS: !isLocalNow,
        IS_RECALL_ON_OPEN: false
      };
    });

    const controller = new AbortController();
    const addSpy = vi.spyOn(controller.signal, "addEventListener");
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");

    await hydrateFile(filePath, {
      pollIntervalMs: 1,
      signal: controller.signal
    });

    // Each poll iteration calls sleep() once with this signal, which adds an
    // "abort" listener; on normal (non-abort) resolution it must remove that
    // same listener, or a multi-hour hydration would leak one per poll and
    // eventually hit Node's MaxListenersExceededWarning.
    expect(pollCount).toBeGreaterThan(20);
    // one sleep() (and thus one addEventListener) per poll that wasn't yet local
    expect(addSpy.mock.calls.length).toBeGreaterThan(0);
    expect(removeSpy).toHaveBeenCalledTimes(addSpy.mock.calls.length);
  });
});
