import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as fs from "fs-extra";
import * as os from "os";
import * as Path from "path";
import { Project, ProjectHolder } from "./Project";
import { Folder } from "../Folder/Folder";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

// The user moves, renames or deletes the project folder while lameta has the
// project open, then lameta saves (on blur, tab change, closing the project...).
// Sentry LAMETA-25D: ENOENT from readdirSync in findZombieMetadataFiles.

let parentDir: string;
let projectDir: string;
let missingFolders: Folder[];
const originalHandler = Folder.onDirectoryMissingWhenSaving;

beforeAll(() => {
  setupLanguageFinderForTests();
});

beforeEach(() => {
  parentDir = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-missing-folder-"));
  projectDir = Path.join(parentDir, "TestProject");
  fs.copySync("sample data/Edolo sample", projectDir);
  // lameta finds the project file by the folder name
  fs.renameSync(
    Path.join(projectDir, "Edolo sample.sprj"),
    Path.join(projectDir, "TestProject.sprj")
  );
  missingFolders = [];
  Folder.onDirectoryMissingWhenSaving = (folder) => missingFolders.push(folder);
});

afterEach(() => {
  Folder.onDirectoryMissingWhenSaving = originalHandler;
  new ProjectHolder().setProject(null);
  fs.removeSync(parentDir);
});

function loadThenMoveProjectFolder(): Project {
  const project = Project.fromDirectory(projectDir);
  expect(project.loadingError).toBeUndefined();
  fs.moveSync(projectDir, Path.join(parentDir, "Moved"));
  return project;
}

describe("saving a project whose folder has gone", () => {
  it("does not throw from saveAllFilesInFolder", () => {
    const project = loadThenMoveProjectFolder();
    expect(() => project.saveAllFilesInFolder()).not.toThrow();
  });

  it("does not throw from saveFolderMetaData", () => {
    const project = loadThenMoveProjectFolder();
    project.properties.setText("title", "changed");
    expect(() => project.saveFolderMetaData()).not.toThrow();
  });

  it("does not recreate the folder", () => {
    const project = loadThenMoveProjectFolder();
    project.properties.setText("title", "changed");
    project.sessions.items[0].properties.setText("title", "changed");
    project.saveAllFilesInFolder();
    expect(fs.existsSync(projectDir)).toBe(false);
  });

  it("reports the missing folder", () => {
    const project = loadThenMoveProjectFolder();
    project.saveAllFilesInFolder();
    expect(missingFolders).toContain(project);
  });

  it("reports the missing folder when only the metadata is saved", () => {
    const project = loadThenMoveProjectFolder();
    project.saveFolderMetaData();
    expect(missingFolders).toEqual([project]);
  });

  it("reports the missing folder when a session in it is saved", () => {
    const project = loadThenMoveProjectFolder();
    const session = project.sessions.items[0];
    session.properties.setText("title", "changed");
    expect(() => session.saveAllFilesInFolder()).not.toThrow();
    expect(missingFolders).toEqual([session]);
  });

  it("reports the missing folder when a session's own folder has gone", () => {
    const project = Project.fromDirectory(projectDir);
    const session = project.sessions.items[0];
    fs.moveSync(session.directory, session.directory + "-renamed");
    session.properties.setText("title", "changed");
    session.saveAllFilesInFolder();
    expect(missingFolders).toEqual([session]);
    expect(fs.existsSync(session.directory)).toBe(false);
  });

  it("does not report when the folder is still there", () => {
    const project = Project.fromDirectory(projectDir);
    project.properties.setText("title", "changed");
    project.saveAllFilesInFolder();
    expect(missingFolders).toEqual([]);
  });

  it("saves again once the folder is back", () => {
    const project = loadThenMoveProjectFolder();
    project.properties.setText("title", "changed while missing");
    project.saveAllFilesInFolder();
    fs.moveSync(Path.join(parentDir, "Moved"), projectDir);
    project.saveAllFilesInFolder();
    expect(
      fs.readFileSync(Path.join(projectDir, "TestProject.sprj"), "utf8")
    ).toContain("changed while missing");
  });

  it("lets ProjectHolder close the project without throwing", () => {
    const holder = new ProjectHolder();
    holder.setProject(Project.fromDirectory(projectDir));
    fs.moveSync(projectDir, Path.join(parentDir, "Moved"));
    expect(() => holder.setProject(null)).not.toThrow();
    expect(holder.project).toBeNull();
  });
});

// HomePage wires Folder.onDirectoryMissingWhenSaving to
// ProjectHolder.closeProjectWhoseFolderIsMissing and shows a dialog when it returns true.
describe("closing a project whose folder has gone", () => {
  let holder: ProjectHolder;
  let timesToldUser: number;

  beforeEach(() => {
    holder = new ProjectHolder();
    timesToldUser = 0;
    Folder.onDirectoryMissingWhenSaving = () => {
      if (holder.closeProjectWhoseFolderIsMissing()) timesToldUser++;
    };
    holder.setProject(Project.fromDirectory(projectDir));
  });

  it("closes the project and tells the user once when the project folder has gone", () => {
    fs.moveSync(projectDir, Path.join(parentDir, "Moved"));
    holder.loadedProject!.properties.setText("title", "changed");
    holder.loadedProject!.saveAllFilesInFolder();
    expect(holder.project).toBeNull();
    expect(timesToldUser).toBe(1);
  });

  it("closes the project and tells the user once when a session folder has gone", () => {
    const session = holder.loadedProject!.sessions.items[0];
    fs.moveSync(session.directory, session.directory + "-renamed");
    session.properties.setText("title", "changed");
    session.saveAllFilesInFolder();
    expect(holder.project).toBeNull();
    expect(timesToldUser).toBe(1);
  });

  it("saves the rest of the project while closing when only a session folder has gone", () => {
    const project = holder.loadedProject!;
    const session = project.sessions.items[0];
    fs.moveSync(session.directory, session.directory + "-renamed");
    project.properties.setText("title", "kept");
    session.saveAllFilesInFolder();
    expect(
      fs.readFileSync(Path.join(projectDir, "TestProject.sprj"), "utf8")
    ).toContain("kept");
  });

  it("does not tell the user again when later saves find the folder gone", () => {
    const project = holder.loadedProject!;
    fs.moveSync(projectDir, Path.join(parentDir, "Moved"));
    project.saveAllFilesInFolder();
    project.saveAllFilesInFolder();
    project.sessions.items[0].saveAllFilesInFolder();
    expect(timesToldUser).toBe(1);
  });

  it("does nothing for a session whose folder is gone because it is being deleted", () => {
    const project = holder.loadedProject!;
    const session = project.sessions.items[0];
    session.beingDeleted = true; // as deleteFolder sets it while trashing the folder
    fs.removeSync(session.directory);
    session.saveAllFilesInFolder();
    project.saveAllFilesInFolder();
    expect(holder.project).not.toBeNull();
    expect(timesToldUser).toBe(0);
  });

  it("deleting a session leaves the project open", async () => {
    const project = holder.loadedProject!;
    const session = project.sessions.items[0];
    await project.deleteFolder(session, true);
    project.saveAllFilesInFolder();
    expect(holder.project).not.toBeNull();
    expect(timesToldUser).toBe(0);
  });

  it("does nothing while the folder is still there", () => {
    holder.loadedProject!.saveAllFilesInFolder();
    expect(holder.project).not.toBeNull();
    expect(timesToldUser).toBe(0);
  });

  it("does nothing when the project's document folders were never created", () => {
    holder.setProject(null);
    fs.removeSync(Path.join(projectDir, "DescriptionDocuments"));
    fs.removeSync(Path.join(projectDir, "OtherDocuments"));
    holder.setProject(Project.fromDirectory(projectDir));
    holder.loadedProject!.saveAllFilesInFolder();
    expect(holder.project).not.toBeNull();
    expect(timesToldUser).toBe(0);
  });
});
