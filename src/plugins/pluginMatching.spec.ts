import { describe, it, expect } from "vitest";
import {
  getPluginTabsForFile,
  computeDefaultIndex,
  tabMatchesFile,
  MatchablePlugin
} from "./pluginMatching";
import { PluginManifest, PluginTabManifest } from "./PluginManifest";

function plugin(
  id: string,
  tabs: Partial<PluginTabManifest>[]
): MatchablePlugin {
  const manifest: PluginManifest = {
    id,
    name: id,
    version: "1.0.0",
    apiVersion: 1,
    infoUrl: "https://example.org",
    permissions: [],
    tabs: tabs.map((t, i) => ({
      id: t.id ?? `tab${i}`,
      label: t.label ?? "L",
      entry: t.entry ?? "index.html",
      match: t.match,
      claimDefault: t.claimDefault ?? false,
      defaultPriority: t.defaultPriority ?? 0
    }))
  };
  return { manifest };
}

const audioFile = { extension: "wav", mimeType: "audio/wav", lametaType: "Audio" };

describe("tabMatchesFile", () => {
  it("matches by lametaType", () => {
    expect(
      tabMatchesFile(
        { id: "t", label: "L", entry: "i", match: { lametaTypes: ["Audio"] } },
        audioFile
      )
    ).toBe(true);
  });
  it("matches by extension (case-insensitive)", () => {
    expect(
      tabMatchesFile(
        { id: "t", label: "L", entry: "i", match: { extensions: ["wav"] } },
        { ...audioFile, lametaType: "X" }
      )
    ).toBe(true);
  });
  it("matches by mime wildcard", () => {
    expect(
      tabMatchesFile(
        { id: "t", label: "L", entry: "i", match: { mimePatterns: ["audio/*"] } },
        { ...audioFile, lametaType: "X", extension: "xyz" }
      )
    ).toBe(true);
  });
  it("matches by exact mime", () => {
    expect(
      tabMatchesFile(
        {
          id: "t",
          label: "L",
          entry: "i",
          match: { mimePatterns: ["audio/wav"] }
        },
        { ...audioFile, lametaType: "X", extension: "xyz" }
      )
    ).toBe(true);
  });
  it("does not match a tab with no match object", () => {
    expect(
      tabMatchesFile({ id: "t", label: "L", entry: "i" }, audioFile)
    ).toBe(false);
  });
  it("does not match when nothing hits", () => {
    expect(
      tabMatchesFile(
        {
          id: "t",
          label: "L",
          entry: "i",
          match: { lametaTypes: ["Video"], extensions: ["mp4"] }
        },
        audioFile
      )
    ).toBe(false);
  });
});

describe("getPluginTabsForFile", () => {
  it("returns matching tabs ordered by plugin id then manifest order", () => {
    const plugins = [
      plugin("zzz.plugin", [
        { id: "z1", match: { lametaTypes: ["Audio"] } },
        { id: "z2", match: { lametaTypes: ["Audio"] } }
      ]),
      plugin("aaa.plugin", [{ id: "a1", match: { lametaTypes: ["Audio"] } }])
    ];
    const result = getPluginTabsForFile(audioFile, plugins);
    expect(result.map((r) => `${r.pluginId}/${r.tab.id}`)).toEqual([
      "aaa.plugin/a1",
      "zzz.plugin/z1",
      "zzz.plugin/z2"
    ]);
  });

  it("omits non-matching tabs", () => {
    const plugins = [
      plugin("a.b", [
        { id: "audio", match: { lametaTypes: ["Audio"] } },
        { id: "video", match: { lametaTypes: ["Video"] } }
      ])
    ];
    const result = getPluginTabsForFile(audioFile, plugins);
    expect(result.map((r) => r.tab.id)).toEqual(["audio"]);
  });

  it("returns empty when nothing matches", () => {
    const plugins = [
      plugin("a.b", [{ id: "video", match: { lametaTypes: ["Video"] } }])
    ];
    expect(getPluginTabsForFile(audioFile, plugins)).toEqual([]);
  });

  it("carries the plugin's permissions into each matched tab", () => {
    const p = plugin("a.b", [{ id: "t", match: { lametaTypes: ["Audio"] } }]);
    p.manifest.permissions = ["companionFiles"];
    const result = getPluginTabsForFile(audioFile, [p]);
    expect(result[0].permissions).toEqual(["companionFiles"]);
  });
});

describe("computeDefaultIndex", () => {
  it("returns 0 (viewer) when no tab claims default", () => {
    const plugins = [
      plugin("a.b", [{ id: "t", match: { lametaTypes: ["Audio"] } }])
    ];
    const matched = getPluginTabsForFile(audioFile, plugins);
    expect(computeDefaultIndex(matched)).toBe(0);
  });

  it("returns 1 + index of the sole claimant", () => {
    const plugins = [
      plugin("a.b", [
        { id: "t0", match: { lametaTypes: ["Audio"] } },
        { id: "t1", match: { lametaTypes: ["Audio"] }, claimDefault: true }
      ])
    ];
    const matched = getPluginTabsForFile(audioFile, plugins);
    // matched = [t0, t1]; t1 is index 1 -> default index 2
    expect(computeDefaultIndex(matched)).toBe(2);
  });

  it("picks the highest defaultPriority among claimants", () => {
    const plugins = [
      plugin("a.plugin", [
        {
          id: "low",
          match: { lametaTypes: ["Audio"] },
          claimDefault: true,
          defaultPriority: 10
        }
      ]),
      plugin("b.plugin", [
        {
          id: "high",
          match: { lametaTypes: ["Audio"] },
          claimDefault: true,
          defaultPriority: 100
        }
      ])
    ];
    const matched = getPluginTabsForFile(audioFile, plugins);
    // matched order: a.plugin/low (idx0), b.plugin/high (idx1). Winner is high -> 1+1 = 2
    expect(computeDefaultIndex(matched)).toBe(2);
  });

  it("breaks priority ties by plugin id then tab id", () => {
    const plugins = [
      plugin("b.plugin", [
        {
          id: "t",
          match: { lametaTypes: ["Audio"] },
          claimDefault: true,
          defaultPriority: 50
        }
      ]),
      plugin("a.plugin", [
        {
          id: "t",
          match: { lametaTypes: ["Audio"] },
          claimDefault: true,
          defaultPriority: 50
        }
      ])
    ];
    const matched = getPluginTabsForFile(audioFile, plugins);
    // order: a.plugin/t (idx0), b.plugin/t (idx1). Tie in priority -> a.plugin wins -> 1+0 = 1
    expect(computeDefaultIndex(matched)).toBe(1);
  });
});
