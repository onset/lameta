import { getFileNameParts } from "./RenameFileDialog";
jest.mock("@electron/remote", () => ({ exec: jest.fn() })); //See commit msg for info

describe("Rename file parts", () => {
  it("like files look when first added", () => {
    const parts = getFileNameParts("foo.mp3", "MySession");
    expect(parts.prefix).toBe("MySession");
    expect(parts.core).toBe("_foo");
    expect(parts.suffix).toBe(".mp3");
  });
  it("already in normal form", () => {
    const parts = getFileNameParts("MySession_foo.mp3", "MySession");
    expect(parts.prefix).toBe("MySession");
    expect(parts.core).toBe("_foo");
    expect(parts.suffix).toBe(".mp3");
    expect(parts.suffixWithNoLink).toBe(".mp3");
  });
  it("already in normal form without underscore", () => {
    const parts = getFileNameParts("MySession1.mp3", "MySession");
    expect(parts.prefix).toBe("MySession");
    expect(parts.core).toBe("_1");
    expect(parts.suffix).toBe(".mp3");
    expect(parts.suffixWithNoLink).toBe(".mp3");
  });
  it("no extension", () => {
    const parts = getFileNameParts("foo", "MySession");
    expect(parts.prefix).toBe("MySession");
    expect(parts.core).toBe("_foo");
    expect(parts.suffix).toBe(""); // don't show the link part
    expect(parts.suffixWithNoLink).toBe("");
  });
  it("no extension with link", () => {
    const parts = getFileNameParts("foo.link", "MySession");
    expect(parts.prefix).toBe("MySession");
    expect(parts.core).toBe("_foo");
    expect(parts.suffix).toBe(".link");
    expect(parts.suffixWithNoLink).toBe("");
  });

  it("is a link form", () => {
    const parts = getFileNameParts("MySession_foo.mp3.link", "MySession");
    expect(parts.prefix).toBe("MySession");
    expect(parts.core).toBe("_foo");
    expect(parts.suffix).toBe(".mp3.link"); // don't show the link part
    expect(parts.suffixWithNoLink).toBe(".mp3");
  });
});
