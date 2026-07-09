import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getCloudFileStatus,
  getCloudFileProvider,
  setAttributeReaderForTests,
  setPinWriterForTests,
  isLocallyAvailable,
  isUnderCloudSyncRoot,
  setCloudSyncRootsForTests
} from "./cloudFileStatus";

describe("getCloudFileStatus", () => {
  afterEach(() => {
    setAttributeReaderForTests(undefined);
    setPinWriterForTests(undefined);
  });

  it("returns cloudOnly when IS_OFFLINE and IS_RECALL_ON_DATA_ACCESS are set", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: true,
      IS_RECALL_ON_DATA_ACCESS: true,
      IS_RECALL_ON_OPEN: false,
      IS_PINNED: false
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("cloudOnly");
  });

  it("returns cloudOnly when only IS_RECALL_ON_OPEN is set", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: false,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: true,
      IS_PINNED: false
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

  it("returns hydrating when placeholder attrs are set and IS_PINNED is true", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: true,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: false,
      IS_PINNED: true
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("hydrating");
  });

  it("returns cloudOnly when placeholder attrs are set and IS_PINNED is false", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: true,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: false,
      IS_PINNED: false
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("cloudOnly");
  });

  it("returns localPinned when no placeholder attrs are set and IS_PINNED is true", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: false,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: false,
      IS_PINNED: true
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("localPinned");
  });
});

describe("getCloudFileProvider().setPinned", () => {
  afterEach(() => {
    setAttributeReaderForTests(undefined);
    setPinWriterForTests(undefined);
  });

  it("calls the writer with (path, true) when pinning", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    setPinWriterForTests(writer);

    await getCloudFileProvider().setPinned("C:\\fake\\path.mp3", true);

    expect(writer).toHaveBeenCalledWith("C:\\fake\\path.mp3", true);
  });

  it("calls the writer with (path, false) when unpinning", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    setPinWriterForTests(writer);

    await getCloudFileProvider().setPinned("C:\\fake\\path.mp3", false);

    expect(writer).toHaveBeenCalledWith("C:\\fake\\path.mp3", false);
  });

  it("propagates a rejection from the writer", async () => {
    setPinWriterForTests(() => Promise.reject(new Error("write failed")));

    await expect(
      getCloudFileProvider().setPinned("C:\\fake\\path.mp3", true)
    ).rejects.toThrow(/write failed/);
  });

  it("reports canPin true when the attribute-reader seam is set", () => {
    setAttributeReaderForTests(() => undefined);
    expect(getCloudFileProvider().capabilities.canPin).toBe(true);
  });
});

describe("isLocallyAvailable", () => {
  it("is true only for the two hydrated states", () => {
    expect(isLocallyAvailable("local")).toBe(true);
    expect(isLocallyAvailable("localPinned")).toBe(true);
    expect(isLocallyAvailable("cloudOnly")).toBe(false);
    expect(isLocallyAvailable("hydrating")).toBe(false);
    expect(isLocallyAvailable("unknown")).toBe(false);
  });
});

describe("isUnderCloudSyncRoot", () => {
  afterEach(() => {
    setCloudSyncRootsForTests(undefined);
  });

  it("matches files under a sync root, case- and separator-insensitively", () => {
    setCloudSyncRootsForTests(["C:\\Users\\me\\OneDrive"]);
    expect(isUnderCloudSyncRoot("C:\\Users\\me\\OneDrive\\proj\\a.mp3")).toBe(
      true
    );
    expect(isUnderCloudSyncRoot("c:/users/me/onedrive/proj/a.mp3")).toBe(true);
  });

  it("does not match sibling folders that merely share the root as a name prefix", () => {
    setCloudSyncRootsForTests(["C:\\Users\\me\\OneDrive"]);
    expect(
      isUnderCloudSyncRoot("C:\\Users\\me\\OneDriveBackup\\a.mp3")
    ).toBe(false);
    expect(isUnderCloudSyncRoot("C:\\Elsewhere\\a.mp3")).toBe(false);
  });

  it("tolerates a trailing slash on the configured root", () => {
    setCloudSyncRootsForTests(["C:\\Users\\me\\OneDrive\\"]);
    expect(isUnderCloudSyncRoot("C:\\Users\\me\\OneDrive\\a.mp3")).toBe(true);
  });

  it("returns false when there are no sync roots", () => {
    setCloudSyncRootsForTests([]);
    expect(isUnderCloudSyncRoot("C:\\Users\\me\\OneDrive\\a.mp3")).toBe(false);
  });
});
