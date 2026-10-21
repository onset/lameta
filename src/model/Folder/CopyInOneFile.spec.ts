import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vite-plus/test";
import * as mobx from "mobx";
import temp from "temp";
import fs from "fs";
import Path from "path";

const media = vi.hoisted(() => ({ folder: "" }));
vi.mock("../Project/MediaFolderAccess", async (importOriginal) => {
  const original = await importOriginal<typeof import("../Project/MediaFolderAccess")>();
  return { ...original, getMediaFolderOrEmptyForThisProjectAndMachine: () => media.folder };
});

vi.mock("../../components/Notify", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../components/Notify")>();
  return {
    ...original,
    NotifyWarning: vi.fn(),
    NotifyError: vi.fn(),
    NotifyException: vi.fn(),
  };
});

import { Project } from "../Project/Project";
import { Session } from "../Project/Session/Session";
import { CopyManager } from "../../other/CopyManager";

mobx.configure({ enforceActions: "never" });

let session: Session;
let sourceDir: string;

beforeAll(() => {
  temp.track();
});
afterAll(() => {
  temp.cleanupSync();
});
beforeEach(() => {
  media.folder = "";
  const project = Project.fromDirectory(temp.mkdirSync("lameta copyInOneFile test"));
  session = project.addSession();
  sourceDir = temp.mkdirSync("lameta copyInOneFile source");
});

function makeSource(name: string): string {
  const path = Path.join(sourceDir, name);
  fs.writeFileSync(path, "test");
  return path;
}

describe("Folder.copyInOneFileAsync", () => {
  it("rejects a file of a type that cannot be added", async () => {
    await expect(session.copyInOneFileAsync(makeSource("x.session"))).rejects.toThrow();
  });

  it("rejects when a file with that name is already in the folder", async () => {
    const source = makeSource("notes.txt");
    await session.copyInOneFileAsync(source);
    await expect(session.copyInOneFileAsync(source)).rejects.toThrow();
  });

  it("resolves after adding a link to a file in the media folder", async () => {
    media.folder = sourceDir;
    const filesBefore = session.files.length;
    await expect(session.copyInOneFileAsync(makeSource("big.wav"))).resolves.toBeUndefined();
    expect(session.files.length).toBe(filesBefore + 1);
  });

  it("rejects and drops the pending file when the copy fails", async () => {
    const spy = vi
      .spyOn(CopyManager, "safeAsyncCopyFileWithErrorNotification")
      .mockRejectedValue("copy failed");
    const filesBefore = session.files.length;
    await expect(session.copyInOneFileAsync(makeSource("notes.txt"))).rejects.toThrow();
    expect(session.files.length).toBe(filesBefore);
    spy.mockRestore();
  });
});
