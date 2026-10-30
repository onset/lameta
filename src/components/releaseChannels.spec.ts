import { describe, expect, it } from "vitest";
import { getNewerReleases, newestOfEachChannel, sortNewestFirst } from "./releaseChannels";

const r = (tag_name: string, published_at: string) => ({
  tag_name,
  published_at,
});

const releases = [
  r("v4.0.52-beta", "2027-01-01T00:00:00Z"),
  r("v4.0.0", "2027-01-05T00:00:00Z"),
  r("v4.0.53-beta", "2027-01-10T00:00:00Z"),
  r("v4.0.1", "2027-01-20T00:00:00Z"),
  r("v4.0.12-alpha", "2027-01-21T00:00:00Z"),
];

const tags = (list: { tag_name: string }[]) => list.map((x) => x.tag_name);

describe("getNewerReleases", () => {
  it("tells a beta user about a stable release published after their beta", () => {
    expect(tags(getNewerReleases(releases, "4.0.52-beta"))).toEqual([
      "v4.0.0",
      "v4.0.53-beta",
      "v4.0.1",
    ]);
  });

  it("does not offer a stable release published before the running beta", () => {
    expect(tags(getNewerReleases(releases, "4.0.53-beta"))).toEqual(["v4.0.1"]);
  });

  it("offers a release user only newer releases", () => {
    expect(tags(getNewerReleases(releases, "4.0.0"))).toEqual(["v4.0.1"]);
  });

  it("offers an alpha user every channel", () => {
    expect(tags(getNewerReleases(releases, "4.0.11-alpha"))).toEqual(["v4.0.12-alpha"]);
    const withRunning = [r("v4.0.11-alpha", "2027-01-02T00:00:00Z"), ...releases];
    expect(tags(getNewerReleases(withRunning, "4.0.11-alpha"))).toEqual([
      "v4.0.0",
      "v4.0.53-beta",
      "v4.0.1",
      "v4.0.12-alpha",
    ]);
  });

  it("compares only within its channel when the running build was never published", () => {
    expect(tags(getNewerReleases(releases, "4.0.40-beta"))).toEqual([
      "v4.0.52-beta",
      "v4.0.53-beta",
    ]);
  });
});

describe("newestOfEachChannel", () => {
  it("picks the newest release of each channel", () => {
    const newest = newestOfEachChannel(sortNewestFirst(releases));
    expect(tags([...newest])).toEqual(["v4.0.12-alpha", "v4.0.1", "v4.0.53-beta"]);
  });

  it("picks the higher-numbered beta even when a lower one was published after it", () => {
    const lateDraft = [...releases, r("v4.0.51-beta", "2027-01-25T00:00:00Z")];
    const newest = newestOfEachChannel(sortNewestFirst(lateDraft));
    expect(tags([...newest])).toEqual(["v4.0.12-alpha", "v4.0.1", "v4.0.53-beta"]);
  });
});
