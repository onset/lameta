import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
});
