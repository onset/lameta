import { normalizePath } from "./crossPlatformUtilities";
jest.mock("@electron/remote", () => ({ exec: jest.fn() })); //See commit msg for info

describe("Linked file", () => {
  it("normalizePath converts to forward slashes", () => {
    expect(normalizePath("c:\\foo\\bar")).toBe("c:/foo/bar");
    expect(normalizePath("foo/bar\\baz")).toBe("foo/bar/baz");
  });
});
