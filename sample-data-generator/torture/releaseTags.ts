// Which version compare-exports.ts compares with when it is not told: the newest version that
// testers or users have, which is the newest beta or release. Alphas are left out.

interface Version {
  tag: string;
  numbers: [number, number, number];
  isRelease: boolean;
}

// "v3.0.21-beta" and "3.0.18-beta" are betas, "v2.3.18" is a release; anything else, such as
// "v3.0.17-alpha" or "video-broke", is neither
function parseBetaOrRelease(tag: string): Version | undefined {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(-beta)?$/.exec(tag);
  if (!m) return undefined;
  return { tag, numbers: [Number(m[1]), Number(m[2]), Number(m[3])], isRelease: !m[4] };
}

// A release comes after the beta of the same number. Of two tags for one version, the one
// with the "v" prefix wins, because that is how lameta names its tags.
function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] - b.numbers[i];
  if (a.isRelease !== b.isRelease) return a.isRelease ? 1 : -1;
  return Number(a.tag.startsWith("v")) - Number(b.tag.startsWith("v"));
}

export function newestBetaOrRelease(tags: string[]): string | undefined {
  const versions = tags
    .map((t) => parseBetaOrRelease(t.trim()))
    .filter((v): v is Version => v !== undefined);
  if (versions.length === 0) return undefined;
  return versions.reduce((best, v) => (compareVersions(v, best) > 0 ? v : best)).tag;
}
