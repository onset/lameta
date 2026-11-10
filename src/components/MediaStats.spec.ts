import { describe, it, expect } from "vite-plus/test";
import { decideMediaStatsFlow, IMediaStatsCacheHost, statsFromProbeResult } from "./MediaStats";
import type ffmpeg from "fluent-ffmpeg";

function makeHost(
  isCloudFileNotPresent: boolean,
  cached: Record<string, string> | undefined,
): IMediaStatsCacheHost {
  return {
    isCloudFileNotPresent,
    getCachedMediaStats: () => cached,
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

describe("statsFromProbeResult", () => {
  it("gives the length when ffprobe reports a duration", () => {
    const stats = statsFromProbeResult({
      format: { duration: 65, format_long_name: "WAV / WAVE" },
      streams: [{ codec_type: "audio", codec_name: "pcm_s16le", channels: 1 }],
    } as unknown as ffmpeg.FfprobeData);
    expect(stats["Length"]).not.toBe("N/A");
    expect(stats["Format"]).toBe("WAV / WAVE");
    expect(stats["Audio Codec"]).toBe("pcm_s16le");
  });

  it("still gives the other stats when ffprobe reports no duration", () => {
    const stats = statsFromProbeResult({
      format: { format_long_name: "raw MPEG audio" },
      streams: [{ codec_type: "audio", codec_name: "mp3", channels: 2 }],
    } as unknown as ffmpeg.FfprobeData);
    expect(stats["Length"]).toBe("N/A");
    expect(stats["Format"]).toBe("raw MPEG audio");
    expect(stats["Audio Codec"]).toBe("mp3");
  });

  it("copes with a result that has no format or streams", () => {
    expect(statsFromProbeResult(undefined)["Length"]).toBe("N/A");
  });
});
