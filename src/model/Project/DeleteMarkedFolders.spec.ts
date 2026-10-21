import { describe, it, expect, beforeAll, afterAll, vi } from "vite-plus/test";
import * as mobx from "mobx";
import temp from "temp";
import Path from "path";

let pendingDeletion: Promise<void> | undefined;
vi.mock("../../components/ConfirmDeleteDialog/ConfirmDeleteDialog", () => ({
  ShowDeleteDialog: (_description: string, deleteAction: () => void | Promise<void>) => {
    pendingDeletion = Promise.resolve(deleteAction());
  },
}));

// Trashing "fails" for any folder whose name contains "Locked".
vi.mock("../../other/crossPlatformUtilities", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../other/crossPlatformUtilities")>();
  return {
    ...original,
    asyncTrashWithContext: <T>(path: string, context: T) =>
      Promise.resolve({ succeeded: !Path.basename(path).includes("Locked"), path, context }),
  };
});

vi.mock("../../components/Notify", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../components/Notify")>();
  return { ...original, NotifyWarning: vi.fn(), NotifyError: vi.fn() };
});

import { Project } from "./Project";

mobx.configure({
  enforceActions: "never",
});

beforeAll(() => {
  temp.track();
});
afterAll(() => {
  temp.cleanupSync();
});

describe("Project.deleteMarkedFolders", () => {
  it("keeps a marked folder whose deletion failed when another marked folder was deleted", async () => {
    const project = Project.fromDirectory(temp.mkdirSync("lameta deleteMarkedFolders test"));
    const keeper = project.addPerson("Keeper");
    const deletable = project.addPerson("Deletable");
    const locked = project.addPerson("Locked");
    deletable.marked = true;
    locked.marked = true;

    project.deleteMarkedFolders("person");
    await pendingDeletion;

    expect(project.persons.items).toContain(keeper);
    expect(project.persons.items).not.toContain(deletable);
    expect(project.persons.items).toContain(locked);
    expect(locked.wasDeleted).toBe(false);
  });
});
