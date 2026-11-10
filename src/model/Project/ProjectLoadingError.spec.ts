import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs-extra";
import * as os from "os";
import * as Path from "path";
import { Project, ProjectHolder } from "./Project";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

// A project that fails to load (here, because a file stands where its Sessions folder
// should be) comes back from
// Project.fromDirectory as a stub that has only `loadingError`. HomePage hands
// that stub to ProjectHolder.setProject and then builds the main menu, which
// asks Project for its metadata language slots. Sentry LAMETA-2RM.

let projectDir: string;
let sprjPath: string;

beforeAll(() => {
  setupLanguageFinderForTests();
});

beforeEach(() => {
  projectDir = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-loading-error-"));
  fs.copySync("sample data/Edolo sample", projectDir);
  // lameta finds the project file by the folder name
  sprjPath = Path.join(projectDir, Path.basename(projectDir) + ".sprj");
  fs.renameSync(Path.join(projectDir, "Edolo sample.sprj"), sprjPath);
  fs.writeFileSync(
    sprjPath,
    fs
      .readFileSync(sprjPath, "utf8")
      .replace(
        "<Project>",
        "<Project>\n\t<metadataLanguages>spa:Spanish;eng:English</metadataLanguages>",
      ),
  );
});

afterEach(() => {
  new ProjectHolder().setProject(null);
  fs.removeSync(projectDir);
});

describe("a project that fails to load", () => {
  beforeEach(() => {
    const sessions = Path.join(projectDir, "Sessions");
    fs.removeSync(sessions);
    fs.writeFileSync(sessions, "");
  });

  it("is reported through loadingError", () => {
    const project = Project.fromDirectory(projectDir);
    expect(project.loadingError).toContain("Sessions");
  });

  it("is reported through loadingError when loaded asynchronously", async () => {
    const project = await Project.fromDirectoryAsync(projectDir);
    expect(project.loadingError).toContain("Sessions");
  });

  it("keeps its loadingError on the ProjectHolder so HomePage can show it", () => {
    const holder = new ProjectHolder();
    holder.setProject(Project.fromDirectory(projectDir));
    expect(holder.project?.loadingError).toContain("Sessions");
  });

  it("is not the ProjectHolder's loadedProject, so nothing tries to save it", () => {
    const holder = new ProjectHolder();
    holder.setProject(Project.fromDirectory(projectDir));
    expect(holder.loadedProject).toBeNull();
    // replacing the stub must not try to save it
    expect(() => holder.setProject(null)).not.toThrow();
  });

  // Sentry LAMETA-2RB: HomePage's window-blur handler called saveAllFilesInFolder()
  // on ProjectHolder.project. A project with more than ten sessions loads
  // asynchronously after HomePage has mounted and registered that handler, so
  // the stub reaches the holder while the handler is live.
  it("has no saveAllFilesInFolder when loaded asynchronously", async () => {
    const holder = new ProjectHolder();
    holder.setProject(await Project.fromDirectoryAsync(projectDir));
    expect(() => holder.project!.saveAllFilesInFolder()).toThrow(
      /saveAllFilesInFolder is not a function/,
    );
  });

  it("is not the ProjectHolder's loadedProject when loaded asynchronously", async () => {
    const holder = new ProjectHolder();
    holder.setProject(await Project.fromDirectoryAsync(projectDir));
    expect(holder.loadedProject).toBeNull();
  });

  it("is skipped by saveLoadedProject when loaded asynchronously", async () => {
    const holder = new ProjectHolder();
    holder.setProject(await Project.fromDirectoryAsync(projectDir));
    expect(() => holder.saveLoadedProject()).not.toThrow();
  });

  it("still lets the main menu get metadata language slots", () => {
    new ProjectHolder().setProject(Project.fromDirectory(projectDir));
    const slots = Project.getMetadataLanguageSlots();
    expect(slots.map((s) => s.tag)).toEqual(["en"]);
  });

  it("still lets the main menu get metadata language slots when loaded asynchronously", async () => {
    new ProjectHolder().setProject(await Project.fromDirectoryAsync(projectDir));
    const slots = Project.getMetadataLanguageSlots();
    expect(slots.map((s) => s.tag)).toEqual(["en"]);
  });

  it("gives empty default metadata, subject and working languages", () => {
    new ProjectHolder().setProject(Project.fromDirectory(projectDir));
    expect(Project.getDefaultMetadataLanguages()).toBe("");
    expect(Project.getDefaultSubjectLanguages()).toBe("");
    expect(Project.getDefaultWorkingLanguages()).toBe("");
  });

  it("does not stay the current project when loaded without a ProjectHolder", () => {
    Project.fromDirectory(projectDir);
    expect(Project.getDefaultMetadataLanguages()).toBe("");
  });

  it("does not stay the current project when loaded asynchronously without a ProjectHolder", async () => {
    await Project.fromDirectoryAsync(projectDir);
    expect(Project.getDefaultMetadataLanguages()).toBe("");
  });
});

describe("a project that loads", () => {
  it("is the current project that the language accessors read", () => {
    const project = Project.fromDirectory(projectDir);
    expect(project.loadingError).toBeUndefined();
    const holder = new ProjectHolder();
    holder.setProject(project);
    expect(holder.loadedProject).toBe(project);
    expect(Project.getMetadataLanguageSlots().map((s) => s.tag)).toEqual(["es", "en"]);
  });

  it("is saved by saveLoadedProject", () => {
    const project = Project.fromDirectory(projectDir);
    const holder = new ProjectHolder();
    holder.setProject(project);
    const save = vi.spyOn(project, "saveAllFilesInFolder");
    holder.saveLoadedProject();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
