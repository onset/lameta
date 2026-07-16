import { describe, it, afterEach, expect } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import * as os from "os";
import {
  normalizePath,
  isMacOSMetadataFile,
  getAllFilesSync
} from "./crossPlatformUtilities";

describe("Linked file", () => {
  it("normalizePath converts to forward slashes", () => {
    expect(normalizePath("c:\\foo\\bar")).toBe("c:/foo/bar");
    expect(normalizePath("foo/bar\\baz")).toBe("foo/bar/baz");
  });
});

describe("isMacOSMetadataFile", () => {
  it("detects AppleDouble sidecar files", () => {
    expect(isMacOSMetadataFile("._foo.jpg")).toBe(true);
    expect(isMacOSMetadataFile("._foo.jpg.meta")).toBe(true);
    expect(isMacOSMetadataFile("._MySession.session")).toBe(true);
  });
  it("detects .DS_Store", () => {
    expect(isMacOSMetadataFile(".DS_Store")).toBe(true);
  });
  it("uses the basename so full paths work", () => {
    expect(isMacOSMetadataFile("/some/dir/._foo.jpg.meta")).toBe(true);
    expect(isMacOSMetadataFile("C:\\some\\dir\\.DS_Store")).toBe(true);
    expect(isMacOSMetadataFile("C:\\some\\dir\\foo.jpg")).toBe(false);
  });
  it("does not flag normal files", () => {
    expect(isMacOSMetadataFile("foo.jpg")).toBe(false);
    expect(isMacOSMetadataFile("foo.jpg.meta")).toBe(false);
    expect(isMacOSMetadataFile("MySession.session")).toBe(false);
    // a leading single dot (hidden but not AppleDouble) is not our concern here
    expect(isMacOSMetadataFile(".gitignore")).toBe(false);
  });
});

describe("getAllFilesSync", () => {
  let dir: string;
  afterEach(() => {
    if (dir) fs.removeSync(dir);
  });

  it("skips macOS AppleDouble and .DS_Store files (issue #68)", () => {
    dir = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-issue68-"));
    fs.writeFileSync(Path.join(dir, "foo.jpg"), "content");
    fs.writeFileSync(Path.join(dir, "foo.jpg.meta"), "<file></file>");
    // the junk macOS creates on non-HFS volumes:
    fs.writeFileSync(Path.join(dir, "._foo.jpg"), "binary");
    fs.writeFileSync(Path.join(dir, "._foo.jpg.meta"), "binary");
    fs.writeFileSync(Path.join(dir, ".DS_Store"), "binary");

    const names = getAllFilesSync(dir)
      .map((p) => Path.basename(p))
      .sort();
    expect(names).toEqual(["foo.jpg", "foo.jpg.meta"]);
  });
});
