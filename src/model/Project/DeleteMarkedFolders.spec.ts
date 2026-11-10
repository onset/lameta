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

// Trashing "fails" for any folder whose name contains "Locked", and rejects for "Broken".
vi.mock("../../other/crossPlatformUtilities", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../other/crossPlatformUtilities")>();
  return {
    ...original,
    asyncTrashWithContext: <T>(path: string, context: T) =>
      Path.basename(path).includes("Broken")
        ? Promise.reject(new Error("trash failed"))
        : Promise.resolve({ succeeded: !Path.basename(path).includes("Locked"), path, context }),
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

  it("goes on saving a folder whose deletion rejected", async () => {
    const project = Project.fromDirectory(temp.mkdirSync("lameta deleteMarkedFolders test"));
    const broken = project.addPerson("Broken");
    const deletable = project.addPerson("Deletable");
    broken.marked = true;
    deletable.marked = true;

    project.deleteMarkedFolders("person");
    await pendingDeletion;

    expect(project.persons.items).toContain(broken);
    expect(project.persons.items).not.toContain(deletable);
    expect(broken.beingDeleted).toBe(false);

    broken.properties.setText("description", "edited after the failed delete");
    broken.saveAllFilesInFolder();
    const reloaded = Project.fromDirectory(project.directory);
    const person = reloaded.persons.items.find((p) => p.directory === broken.directory);
    expect(person?.properties.getTextStringOrEmpty("description")).toBe(
      "edited after the failed delete",
    );
  });
});
