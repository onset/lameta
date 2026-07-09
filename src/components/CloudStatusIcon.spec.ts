import { describe, it, expect } from "vitest";
import { getCloudDisplayStatus } from "./CloudStatusIcon";

describe("getCloudDisplayStatus", () => {
  it("shows the blue cloud for a cloud-only file while online", () => {
    expect(getCloudDisplayStatus("cloudOnly", true, true)).toBe("cloudOnly");
  });

  it("shows the offline cloud for a cloud-only file while offline", () => {
    expect(getCloudDisplayStatus("cloudOnly", false, true)).toBe(
      "cloudOnlyOffline"
    );
  });

  it("shows sync arrows while hydrating online", () => {
    expect(getCloudDisplayStatus("hydrating", true, true)).toBe("hydrating");
  });

  it("shows the offline cloud while hydrating offline, since the download cannot progress", () => {
    expect(getCloudDisplayStatus("hydrating", false, true)).toBe(
      "cloudOnlyOffline"
    );
  });

  // Checkmarks for locally-available files are currently disabled (see the
  // commented-out cases in getCloudDisplayStatus); if re-enabled, these
  // should go back to expecting "local" / "localPinned" under a sync root.
  it("shows nothing for hydrated files, even under a sync root", () => {
    expect(getCloudDisplayStatus("local", true, true)).toBeUndefined();
    expect(getCloudDisplayStatus("localPinned", true, true)).toBeUndefined();
    expect(getCloudDisplayStatus("local", true, false)).toBeUndefined();
    expect(getCloudDisplayStatus("localPinned", true, false)).toBeUndefined();
  });

  it("still shows cloud states outside a detected sync root (attributes prove they are cloud files)", () => {
    expect(getCloudDisplayStatus("cloudOnly", true, false)).toBe("cloudOnly");
    expect(getCloudDisplayStatus("hydrating", true, false)).toBe("hydrating");
  });

  it("shows nothing when the status is unknown", () => {
    expect(getCloudDisplayStatus("unknown", true, true)).toBeUndefined();
    expect(getCloudDisplayStatus("unknown", false, true)).toBeUndefined();
  });
});
