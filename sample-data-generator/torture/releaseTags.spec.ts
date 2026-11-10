import { describe, it, expect } from "vite-plus/test";
import { newestBetaOrRelease } from "./releaseTags";

describe("newestBetaOrRelease", () => {
  it("picks the newest beta or release, leaving out alphas and other tags", () => {
    expect(
      newestBetaOrRelease([
        "v2.3.18",
        "v3.0.20-beta",
        "v3.0.21-beta",
        "v3.0.22-alpha",
        "3.0.18-beta",
        "video-broke",
      ]),
    ).toBe("v3.0.21-beta");
  });

  it("compares the numbers as numbers", () => {
    expect(newestBetaOrRelease(["v3.0.9-beta", "v3.0.10-beta"])).toBe("v3.0.10-beta");
  });

  it("puts a release after the beta of the same number", () => {
    expect(newestBetaOrRelease(["v3.1.0", "v3.1.0-beta"])).toBe("v3.1.0");
  });

  it("prefers the tag with the v prefix when two name one version", () => {
    expect(newestBetaOrRelease(["3.0.18-beta", "v3.0.18-beta"])).toBe("v3.0.18-beta");
  });

  it("is undefined when there is no beta or release", () => {
    expect(newestBetaOrRelease(["v3.0.17-alpha", "video-broke"])).toBeUndefined();
  });
});
