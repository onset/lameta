import { RenameFileDialog } from "./RenameFileDialog";
jest.mock("@electron/remote", () => ({ exec: jest.fn() })); //See commit msg for info

describe("Rename file parts", () => {
  it("like files look when first added", () => {
    const parts = RenameFileDialog.getFileNameParts("foo.mp3", "project");
    expect(parts.prefix).toBe("project_");
    expect(parts.core).toBe("foo");
    expect(parts.suffix).toBe(".mp3");
  });
  it("already in normal form", () => {
    const parts = RenameFileDialog.getFileNameParts(
      "project_foo.mp3",
      "project"
    );
    expect(parts.prefix).toBe("project_");
    expect(parts.core).toBe("foo");
    expect(parts.suffix).toBe(".mp3");
    expect(parts.suffixWithNoLink).toBe(".mp3");
  });
  it("no extension", () => {
    const parts = RenameFileDialog.getFileNameParts("foo", "project");
    expect(parts.prefix).toBe("project_");
    expect(parts.core).toBe("foo");
    expect(parts.suffix).toBe(""); // don't show the link part
    expect(parts.suffixWithNoLink).toBe("");
  });
  it("no extension with link", () => {
    const parts = RenameFileDialog.getFileNameParts("foo.link", "project");
    expect(parts.prefix).toBe("project_");
    expect(parts.core).toBe("foo");
    expect(parts.suffix).toBe(".link");
    expect(parts.suffixWithNoLink).toBe("");
  });

  it("is a link form", () => {
    const parts = RenameFileDialog.getFileNameParts(
      "project_foo.mp3.link",
      "project"
    );
    expect(parts.prefix).toBe("project_");
    expect(parts.core).toBe("foo");
    expect(parts.suffix).toBe(".mp3.link"); // don't show the link part
    expect(parts.suffixWithNoLink).toBe(".mp3");
  });
});
