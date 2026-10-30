import Semver from "semver";

// Which GitHub releases a running copy of lameta should tell its user about.
//
// Each channel numbers its versions separately (README.md, "Publishing"): beta can be at
// 4.0.53-beta while release is at 4.0.2. So version numbers only say which is newer within one
// channel; across channels, a release is newer if it was published later.

export type Channel = "alpha" | "beta" | "release";

export interface IReleaseSummary {
  tag_name: string;
  published_at: string;
}

export function getChannel(version: string): Channel {
  if (version.includes("alpha")) return "alpha";
  if (version.includes("beta")) return "beta";
  return "release";
}

// this isn't ideal... once someone goes up to a release, they'll never be
// informed about betas. To improve this, we will need some more UI so that
// people can specify what channels they are interested in hearing about.
export function getChannelsToRecommend(current: Channel): Channel[] {
  if (current === "alpha") return ["alpha", "beta", "release"];
  if (current === "beta") return ["beta", "release"];
  return ["release"];
}

export function getNewerReleases<T extends IReleaseSummary>(
  releases: T[],
  currentVersion: string,
): T[] {
  const currentChannel = getChannel(currentVersion);
  const channels = getChannelsToRecommend(currentChannel);
  // undefined when running a build that was never published, such as a developer's
  const running = releases.find((r) => r.tag_name.replace(/^v/, "") === currentVersion);
  return releases.filter((r) => {
    const channel = getChannel(r.tag_name);
    if (!channels.includes(channel)) return false;
    if (channel === currentChannel) return Semver.compare(r.tag_name, currentVersion) > 0;
    return running !== undefined && Date.parse(r.published_at) > Date.parse(running.published_at);
  });
}

export function sortNewestFirst<T extends IReleaseSummary>(releases: T[]): T[] {
  return [...releases].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
}

// The highest-numbered release of each channel in the list, which are the ones worth a Download
// link. By number, not date: a draft published late can be older than one published before it.
export function newestOfEachChannel<T extends IReleaseSummary>(releases: T[]): Set<T> {
  const highest = new Map<Channel, T>();
  for (const r of releases) {
    const channel = getChannel(r.tag_name);
    const best = highest.get(channel);
    if (!best || Semver.compare(r.tag_name, best.tag_name) > 0) highest.set(channel, r);
  }
  // in the list's own order
  return new Set(releases.filter((r) => highest.get(getChannel(r.tag_name)) === r));
}
