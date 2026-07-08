import { describe, it, expect } from "vitest";
import { decideMediaStatsFlow, IMediaStatsCacheHost } from "./MediaStats";

function makeHost(
  isCloudFileNotPresent: boolean,
  cached: Record<string, string> | undefined
): IMediaStatsCacheHost {
  return {
    isCloudFileNotPresent,
    getCachedMediaStats: () => cached
  };
}

describe("decideMediaStatsFlow", () => {
  it("blocks (no probe) when cloud-only and there is no cache", () => {
    const flow = decideMediaStatsFlow(makeHost(true, undefined));
    expect(flow.kind).toBe("blocked");
  });

  it("shows cached stats flagged as recorded-while-cloud-only when cloud-only but a cache exists", () => {
    const cached = { Length: "1:02", Format: "MPEG Audio" };
    const flow = decideMediaStatsFlow(makeHost(true, cached));
    expect(flow.kind).toBe("cached");
    expect(flow.kind === "cached" && flow.stats).toEqual(cached);
    expect(flow.kind === "cached" && flow.recordedWhileCloudOnly).toBe(true);
  });

  it("shows cached stats not flagged as recorded-while-cloud-only when local and a cache exists", () => {
    const cached = { Length: "1:02", Format: "MPEG Audio" };
    const flow = decideMediaStatsFlow(makeHost(false, cached));
    expect(flow.kind).toBe("cached");
    expect(flow.kind === "cached" && flow.stats).toEqual(cached);
    expect(flow.kind === "cached" && flow.recordedWhileCloudOnly).toBe(false);
  });

  it("goes to the probe path when local and there is no cache", () => {
    const flow = decideMediaStatsFlow(makeHost(false, undefined));
    expect(flow.kind).toBe("probe");
  });
});
