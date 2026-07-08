import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AutoFetchCloudFiles,
  mbToBytes,
  AutoFetchableFile
} from "./autoFetchCloudFiles";

function makeFile(
  overrides: { cloudStatus?: string; sizeBytes?: number } = {}
): AutoFetchableFile & { fetchCount: number } {
  const file: any = {
    cloudStatus: overrides.cloudStatus ?? "cloudOnly",
    fetchCount: 0,
    getSizeInBytes: () => overrides.sizeBytes ?? 1024,
    makeAvailableOffline: async () => {
      file.fetchCount++;
      file.cloudStatus = "local";
    }
  };
  return file;
}

describe("AutoFetchCloudFiles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fetch before the dwell time elapses", () => {
    const scheduler = new AutoFetchCloudFiles(1500, 2);
    const file = makeFile();
    scheduler.onSelectionChanged(file, mbToBytes(10));
    vi.advanceTimersByTime(1000);
    expect(file.fetchCount).toBe(0);
  });

  it("fetches once the dwell time elapses on a small cloud-only file", async () => {
    const scheduler = new AutoFetchCloudFiles(1500, 2);
    const file = makeFile();
    scheduler.onSelectionChanged(file, mbToBytes(10));
    await vi.advanceTimersByTimeAsync(1500);
    expect(file.fetchCount).toBe(1);
  });

  it("does not fetch rows arrow-keyed past before the selection rests", async () => {
    const scheduler = new AutoFetchCloudFiles(1500, 2);
    const passedThrough = [makeFile(), makeFile(), makeFile()];
    const landedOn = makeFile();
    for (const f of passedThrough) {
      scheduler.onSelectionChanged(f, mbToBytes(10));
      vi.advanceTimersByTime(200); // much less than the dwell time
    }
    scheduler.onSelectionChanged(landedOn, mbToBytes(10));
    await vi.advanceTimersByTimeAsync(1500);

    passedThrough.forEach((f) => expect(f.fetchCount).toBe(0));
    expect(landedOn.fetchCount).toBe(1);
  });

  it("does not fetch when the file size is at or above the threshold", async () => {
    const scheduler = new AutoFetchCloudFiles(1500, 2);
    const file = makeFile({ sizeBytes: mbToBytes(20) });
    scheduler.onSelectionChanged(file, mbToBytes(10));
    await vi.advanceTimersByTimeAsync(1500);
    expect(file.fetchCount).toBe(0);
  });

  it("never fetches when the threshold is 0 (never)", async () => {
    const scheduler = new AutoFetchCloudFiles(1500, 2);
    const file = makeFile({ sizeBytes: 1 });
    scheduler.onSelectionChanged(file, 0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(file.fetchCount).toBe(0);
  });

  it("always fetches regardless of size when the threshold is Infinity (always)", async () => {
    const scheduler = new AutoFetchCloudFiles(1500, 2);
    const file = makeFile({ sizeBytes: mbToBytes(5000) });
    scheduler.onSelectionChanged(file, Infinity);
    await vi.advanceTimersByTimeAsync(1500);
    expect(file.fetchCount).toBe(1);
  });

  it("does not fetch a file that is not cloudOnly", async () => {
    const scheduler = new AutoFetchCloudFiles(1500, 2);
    const file = makeFile({ cloudStatus: "local" });
    scheduler.onSelectionChanged(file, mbToBytes(10));
    await vi.advanceTimersByTimeAsync(1500);
    expect(file.fetchCount).toBe(0);
  });

  it("caps concurrent auto-fetches at maxConcurrent", async () => {
    const scheduler = new AutoFetchCloudFiles(100, 2);
    const resolvers: Array<() => void> = [];
    function makeSlowFile() {
      const file: any = {
        cloudStatus: "cloudOnly",
        getSizeInBytes: () => 1,
        makeAvailableOffline: () =>
          new Promise<void>((resolve) => {
            resolvers.push(() => {
              file.cloudStatus = "local";
              resolve();
            });
          })
      };
      return file;
    }
    const files = [makeSlowFile(), makeSlowFile(), makeSlowFile()];

    for (const f of files) {
      scheduler.onSelectionChanged(f, mbToBytes(10));
      await vi.advanceTimersByTimeAsync(150);
    }

    // Only 2 (the cap) should have actually started fetching.
    expect(scheduler.inFlight).toBe(2);
    expect(resolvers.length).toBe(2);

    resolvers[0]();
    await vi.advanceTimersByTimeAsync(0);
    expect(scheduler.inFlight).toBe(1);
  });
});
