import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { normalizePath } from "./crossPlatformUtilities";

describe("Linked file", () => {
  it("normalizePath converts to forward slashes", () => {
    expect(normalizePath("c:\\foo\\bar")).toBe("c:/foo/bar");
    expect(normalizePath("foo/bar\\baz")).toBe("foo/bar/baz");
  });
});
