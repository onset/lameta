import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as fs from "fs-extra";
import * as os from "os";
import * as Path from "path";
import { Project, ProjectHolder } from "./Project";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

// A project that fails to load (here, because one session file is empty, which
// makes readMetadataFile throw "Got null xmlAsObject") comes back from
// Project.fromDirectory as a stub that has only `loadingError`. HomePage hands
// that stub to ProjectHolder.setProject and then builds the main menu, which
// asks Project for its metadata language slots. Sentry LAMETA-2RM.

let projectDir: string;

beforeAll(() => {
  setupLanguageFinderForTests();
});

beforeEach(() => {
  projectDir = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-loading-error-"));
  fs.copySync("sample data/Edolo sample", projectDir);
  // lameta finds the project file by the folder name
  const sprjPath = Path.join(projectDir, Path.basename(projectDir) + ".sprj");
  fs.renameSync(Path.join(projectDir, "Edolo sample.sprj"), sprjPath);
  fs.writeFileSync(
    sprjPath,
    fs
      .readFileSync(sprjPath, "utf8")
      .replace(
        "<Project>",
        "<Project>\n\t<metadataLanguages>spa:Spanish;eng:English</metadataLanguages>"
      )
  );
  const brokenSessionDir = Path.join(projectDir, "Sessions", "broken");
  fs.ensureDirSync(brokenSessionDir);
  fs.writeFileSync(Path.join(brokenSessionDir, "broken.session"), "");
});

afterEach(() => {
  new ProjectHolder().setProject(null);
  fs.removeSync(projectDir);
});

describe("a project that fails to load", () => {
  it("is reported through loadingError", () => {
    const project = Project.fromDirectory(projectDir);
    expect(project.loadingError).toContain("broken.session");
  });

  it("is reported through loadingError when loaded asynchronously", async () => {
    const project = await Project.fromDirectoryAsync(projectDir);
    expect(project.loadingError).toContain("broken.session");
  });

  it("keeps its loadingError on the ProjectHolder so HomePage can show it", () => {
    const holder = new ProjectHolder();
    holder.setProject(Project.fromDirectory(projectDir));
    expect(holder.project?.loadingError).toContain("broken.session");
  });

  it("is not the ProjectHolder's loadedProject, so nothing tries to save it", () => {
    const holder = new ProjectHolder();
    holder.setProject(Project.fromDirectory(projectDir));
    expect(holder.loadedProject).toBeNull();
    // replacing the stub must not try to save it
    expect(() => holder.setProject(null)).not.toThrow();
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
    fs.removeSync(Path.join(projectDir, "Sessions", "broken"));
    const project = Project.fromDirectory(projectDir);
    expect(project.loadingError).toBeUndefined();
    const holder = new ProjectHolder();
    holder.setProject(project);
    expect(holder.loadedProject).toBe(project);
    expect(Project.getMetadataLanguageSlots().map((s) => s.tag)).toEqual([
      "es",
      "en"
    ]);
  });
});
