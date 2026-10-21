import { describe, expect, it } from "vite-plus/test";
import { delimiter, join, normalize, sep } from "./browserPath";

describe("browserPath", () => {
  it("uses a separator and delimiter consistent with the runtime platform", () => {
    expect(sep).toBe(process.platform === "win32" ? "\\" : "/");
    expect(delimiter).toBe(sep === "\\" ? ";" : ":");
  });

  it("joins relative paths using the runtime separator", () => {
    expect(join("alpha", "beta", "gamma")).toBe(
      normalize(["alpha", "beta", "gamma"].join(sep))
    );
  });

  it("preserves explicit POSIX paths", () => {
    expect(join("/tmp", "lameta", "export")).toBe("/tmp/lameta/export");
  });
});