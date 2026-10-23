import { describe, it, expect } from "vite-plus/test";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import { CopyManager, toExtendedLengthPath } from "./CopyManager";

temp.track();

describe("toExtendedLengthPath", () => {
  it("gives a drive path the \\\\?\\ form, with backslashes", () => {
    expect(toExtendedLengthPath("C:/a/b c.wav")).toBe("\\\\?\\C:\\a\\b c.wav");
  });
  it("gives a network path the \\\\?\\UNC\\ form", () => {
    expect(toExtendedLengthPath("\\\\server\\share\\a.wav")).toBe(
      "\\\\?\\UNC\\server\\share\\a.wav",
    );
  });
  it("leaves a path that already has the form alone", () => {
    expect(toExtendedLengthPath("\\\\?\\C:\\a.wav")).toBe("\\\\?\\C:\\a.wav");
  });
});

describe.runIf(process.platform === "win32")("safeAsyncCopyFileWithErrorNotification", () => {
  // the \\?\ form lets Node make paths that Windows otherwise refuses
  const make = (path: string, content: string) => {
    fs.mkdirSync("\\\\?\\" + Path.dirname(path), { recursive: true });
    fs.writeFileSync("\\\\?\\" + path, content);
  };
  const read = (path: string) => fs.readFileSync("\\\\?\\" + path, "utf8");

  it("copies a file whose path is longer than 260 characters", async () => {
    const deep = Path.join(temp.mkdirSync("long path copy"), "d".repeat(120), "e".repeat(120));
    const source = Path.join(deep, "source.txt");
    make(source, "long");
    const destination = Path.join(deep, "copy.txt");
    expect(source.length).toBeGreaterThan(260);

    await CopyManager.safeAsyncCopyFileWithErrorNotification(source, destination);

    expect(read(destination)).toBe("long");
  });

  it.each(["ends in dot.", "ends in space.wav "])(
    "copies a file whose name is %j",
    async (name) => {
      const dir = temp.mkdirSync("dot copy");
      const source = Path.join(dir, name);
      make(source, name);
      const destination = Path.join(dir, "out", name);

      await CopyManager.safeAsyncCopyFileWithErrorNotification(source, destination);

      expect(read(destination)).toBe(name);
    },
  );
});
