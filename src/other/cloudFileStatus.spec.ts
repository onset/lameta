import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getCloudFileStatus,
  hydrateFile,
  setAttributeReaderForTests,
  setHydrationRunnerForTests,
  HydrationRunner
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
  afterEach(() => {
    setAttributeReaderForTests(undefined);
    setHydrationRunnerForTests(undefined);
  });

  function abortError(): Error {
    const e = new Error("Aborted");
    e.name = "AbortError";
    return e;
  }

  // A runner that never finishes on its own -- it only settles (by rejecting)
  // when its signal aborts. Stands in for a hydration still in progress.
  const runnerPendingUntilAbort: HydrationRunner = (_path, { signal }) =>
    new Promise((_resolve, reject) => {
      if (signal?.aborted) return reject(abortError());
      signal?.addEventListener("abort", () => reject(abortError()), {
        once: true
      });
    });

  it("resolves when the hydration runner completes, forwarding progress", async () => {
    const progress: Array<[number, number]> = [];
    setHydrationRunnerForTests(async (_path, { onProgress }) => {
      onProgress?.(50, 100);
      onProgress?.(100, 100);
    });

    await hydrateFile("C:/fake/media.bin", {
      onProgress: (bytes, total) => progress.push([bytes, total])
    });

    expect(progress).toEqual([
      [50, 100],
      [100, 100]
    ]);
  });

  it("throws AbortError immediately (without starting a hydration) if the signal is already aborted", async () => {
    let started = false;
    setHydrationRunnerForTests(async () => {
      started = true;
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      hydrateFile("C:/fake/media.bin", { signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(started).toBe(false);
  });

  it("rejects with an AbortError when the signal is aborted mid-hydration", async () => {
    setHydrationRunnerForTests(runnerPendingUntilAbort);
    const controller = new AbortController();

    const promise = hydrateFile("C:/fake/media.bin", {
      signal: controller.signal
    });
    const expectation = expect(promise).rejects.toMatchObject({
      name: "AbortError"
    });
    setTimeout(() => controller.abort(), 10);

    await expectation;
  });

  it("rejects with a timeout error when the hydration does not finish within timeoutMs", async () => {
    setHydrationRunnerForTests(runnerPendingUntilAbort);

    await expect(
      hydrateFile("C:/fake/media.bin", { timeoutMs: 20 })
    ).rejects.toThrow(/timed out/);
  });

  it("propagates a hydration failure such as the cloud recall 'UNKNOWN' error", async () => {
    setHydrationRunnerForTests(async () => {
      const e: any = new Error("UNKNOWN: unknown error, read");
      e.code = "UNKNOWN";
      throw e;
    });

    await expect(hydrateFile("C:/fake/media.bin")).rejects.toThrow(/UNKNOWN/);
  });

  it("removes its abort listener from the caller's signal after resolving (no leak)", async () => {
    setHydrationRunnerForTests(async () => {
      /* resolves immediately */
    });
    const controller = new AbortController();
    const addSpy = vi.spyOn(controller.signal, "addEventListener");
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");

    await hydrateFile("C:/fake/media.bin", { signal: controller.signal });

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
