import { normalizePath } from "./crossPlatformUtilities";
vi.mock("@electron/remote", () => ({ exec: vi.fn() })); //See commit msg for info

describe("Linked file", () => {
  it("normalizePath converts to forward slashes", () => {
    expect(normalizePath("c:\\foo\\bar")).toBe("c:/foo/bar");
    expect(normalizePath("foo/bar\\baz")).toBe("foo/bar/baz");
  });
});
