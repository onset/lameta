import { describe, expect, it } from "vitest";
import { latestByChannel, nextVersion, parseTag } from "./nextVersion.mjs";

describe("nextVersion", () => {
  it("starts a channel at 0 when it has no release for this major.minor", () => {
    expect(nextVersion("4.0.52-beta", "release", ["v4.0.52-beta"])).toBe("4.0.0");
  });

  it("counts only the releases of its own channel", () => {
    const tags = ["v4.0.52-beta", "v4.0.0", "v4.0.1", "v4.0.9-alpha"];
    expect(nextVersion("4.0.1", "beta", tags)).toBe("4.0.53-beta");
    expect(nextVersion("4.0.52-beta", "release", tags)).toBe("4.0.2");
    expect(nextVersion("4.0.0", "alpha", tags)).toBe("4.0.10-alpha");
  });

  it("counts only the releases of the major.minor in package.json", () => {
    const tags = ["v4.0.52-beta", "v3.9.80-beta"];
    expect(nextVersion("4.1.0", "beta", tags)).toBe("4.1.0-beta");
    expect(nextVersion("4.0", "beta", tags)).toBe("4.0.53-beta");
  });

  it("reads tags with and without the v, and old numbered prerelease tags", () => {
    const tags = ["3.0.18-beta", "v3.0.22-beta", "v3.0.17-alpha", "0.8.0-beta.1"];
    expect(nextVersion("3.0.21-beta", "beta", tags)).toBe("3.0.23-beta");
    expect(nextVersion("3.0.21-beta", "alpha", tags)).toBe("3.0.18-alpha");
  });

  it("ignores tags that name no channel", () => {
    expect(parseTag("v4.0.1-rc")).toBeUndefined();
    expect(parseTag("app-v4.0.1")).toBeUndefined();
    expect(nextVersion("4.0.0", "release", ["v4.0.5-rc"])).toBe("4.0.0");
  });

  it("refuses a package.json version without major.minor", () => {
    expect(() => nextVersion("four", "beta", [])).toThrow(/major.minor/);
  });
});

describe("latestByChannel", () => {
  it("gives the highest-numbered tag of each channel", () => {
    expect(
      latestByChannel(["v2.3.18", "v3.0.9-alpha", "v3.0.17-alpha", "v3.0.22-beta", "v3.0.21-beta"]),
    ).toEqual({
      release: "v2.3.18",
      alpha: "v3.0.17-alpha",
      beta: "v3.0.22-beta",
    });
  });
});
