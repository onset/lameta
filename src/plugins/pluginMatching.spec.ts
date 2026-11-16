import { describe, it, expect } from "vitest";
import { computeDefaultIndex, DefaultClaimant, matchesFile } from "./pluginMatching";

const audioFile = { extension: "wav", mimeType: "audio/wav", lametaType: "Audio" };

describe("matchesFile", () => {
  it("matches by lametaType", () => {
    expect(matchesFile({ lametaTypes: ["Audio"] }, audioFile)).toBe(true);
  });
  it("matches by extension (case-insensitive)", () => {
    expect(matchesFile({ extensions: ["wav"] }, { ...audioFile, lametaType: "X" })).toBe(true);
  });
  it("matches by mime wildcard", () => {
    expect(
      matchesFile(
        { mimePatterns: ["audio/*"] },
        { ...audioFile, lametaType: "X", extension: "xyz" },
      ),
    ).toBe(true);
  });
  it("matches by exact mime", () => {
    expect(
      matchesFile(
        { mimePatterns: ["audio/wav"] },
        { ...audioFile, lametaType: "X", extension: "xyz" },
      ),
    ).toBe(true);
  });
  it("does not match with no match object", () => {
    expect(matchesFile(undefined, audioFile)).toBe(false);
  });
  it("does not match when nothing hits", () => {
    expect(matchesFile({ lametaTypes: ["Video"], extensions: ["mp4"] }, audioFile)).toBe(false);
  });
});

function claimant(
  pluginId: string,
  id: string,
  claimDefault = false,
  defaultPriority?: number,
): DefaultClaimant {
  return { pluginId, tab: { id, claimDefault, defaultPriority } };
}

describe("computeDefaultIndex", () => {
  it("returns 0 (viewer) when no tab claims default", () => {
    expect(computeDefaultIndex([claimant("a.b", "t")])).toBe(0);
  });

  it("returns 1 + index of the sole claimant", () => {
    // t1 is index 1 -> default index 2
    expect(computeDefaultIndex([claimant("a.b", "t0"), claimant("a.b", "t1", true)])).toBe(2);
  });

  it("picks the highest defaultPriority among claimants", () => {
    const tabs = [claimant("a.plugin", "low", true, 10), claimant("b.plugin", "high", true, 100)];
    // Winner is high at index 1 -> 1+1 = 2
    expect(computeDefaultIndex(tabs)).toBe(2);
  });

  it("breaks priority ties by plugin id then tab id", () => {
    const tabs = [claimant("a.plugin", "t", true, 50), claimant("b.plugin", "t", true, 50)];
    // Tie in priority -> a.plugin wins -> 1+0 = 1
    expect(computeDefaultIndex(tabs)).toBe(1);
  });
});
