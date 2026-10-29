import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import * as fs from "fs-extra";
import * as os from "os";
import * as Path from "path";
import { Session } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { Project, ProjectHolder } from "../Project/Project";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";
import { NotifyError } from "../../components/Notify";

vi.mock("../../components/Notify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../components/Notify")>()),
  NotifyError: vi.fn()
}));

// lameta saves a metadata file by truncating it and then writing, so a save that is cut
// off (power loss, a drive pulled out, an I/O error) leaves the file empty. xml2js parses
// an empty file to null (Sentry LAMETA-37A, LAMETA-383). Whatever lameta does with such a
// file, it must never write over it, because the user's only way back is to restore the
// file from a backup or another copy of the project.

const goodSessionXml = `<?xml version="1.0" encoding="utf-8"?>
<Session>
  <title type="string">The real title</title>
  <description type="string">Fieldwork that must survive</description>
</Session>`;

const unreadableContents: { [name: string]: string } = {
  "zero bytes": "",
  "only whitespace": "  \r\n  ",
  "truncated XML": goodSessionXml.substring(0, 80),
  "only NUL bytes": "\0".repeat(512)
};

let dir: string;

beforeAll(() => {
  setupLanguageFinderForTests();
});

beforeEach(() => {
  dir = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-unreadable-metadata-"));
});

afterEach(() => {
  new ProjectHolder().setProject(null);
  fs.removeSync(dir);
});

function snapshotFiles(root: string): Map<string, Buffer> {
  const snapshot = new Map<string, Buffer>();
  const walk = (d: string) => {
    for (const name of fs.readdirSync(d)) {
      const p = Path.join(d, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else snapshot.set(Path.relative(root, p), fs.readFileSync(p));
    }
  };
  walk(root);
  return snapshot;
}

function expectUnchanged(root: string, before: Map<string, Buffer>) {
  const after = snapshotFiles(root);
  expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
  for (const [relativePath, bytes] of before) {
    expect(
      after.get(relativePath)!.equals(bytes),
      `${relativePath} changed`
    ).toBe(true);
  }
}

describe("a session whose .session file cannot be read", () => {
  for (const [kind, contents] of Object.entries(unreadableContents)) {
    it(`does not load and leaves the file alone when it has ${kind}`, () => {
      const sessionDir = Path.join(dir, "tha016");
      fs.ensureDirSync(sessionDir);
      fs.writeFileSync(Path.join(sessionDir, "tha016.session"), contents);
      fs.writeFileSync(Path.join(sessionDir, "tha016.wav"), "not really audio");
      const before = snapshotFiles(dir);

      expect(() =>
        Session.fromDirectory(sessionDir, new EncounteredVocabularyRegistry())
      ).toThrow(/tha016\.session/);

      expectUnchanged(dir, before);
    });
  }
});

describe("a session whose media file's .meta cannot be read", () => {
  for (const [kind, contents] of Object.entries(unreadableContents)) {
    it(`does not load and leaves both files alone when the .meta has ${kind}`, () => {
      const sessionDir = Path.join(dir, "tha093");
      fs.ensureDirSync(sessionDir);
      fs.writeFileSync(Path.join(sessionDir, "tha093.session"), goodSessionXml);
      fs.writeFileSync(Path.join(sessionDir, "tha093.wav"), "not really audio");
      fs.writeFileSync(Path.join(sessionDir, "tha093.wav.meta"), contents);
      const before = snapshotFiles(dir);

      expect(() =>
        Session.fromDirectory(sessionDir, new EncounteredVocabularyRegistry())
      ).toThrow(/tha093\.wav\.meta/);

      expectUnchanged(dir, before);
    });
  }
});

describe("a project with a folder whose metadata file cannot be read", () => {
  let projectDir: string;
  let sessionCount: number;
  let personCount: number;

  beforeEach(() => {
    vi.mocked(NotifyError).mockClear();
    projectDir = Path.join(dir, "project");
    fs.copySync("sample data/Edolo sample", projectDir);
    // lameta finds the project file by the folder name
    fs.renameSync(
      Path.join(projectDir, "Edolo sample.sprj"),
      Path.join(projectDir, "project.sprj")
    );
    sessionCount = fs.readdirSync(Path.join(projectDir, "Sessions")).length;
    personCount = fs.readdirSync(Path.join(projectDir, "People")).length;
  });

  function addFolder(kind: "Sessions" | "People", contents: string) {
    const name = kind === "Sessions" ? "tha016" : "Unreadable Person";
    const folder = Path.join(projectDir, kind, name);
    fs.ensureDirSync(folder);
    const extension = kind === "Sessions" ? ".session" : ".person";
    fs.writeFileSync(Path.join(folder, name + extension), contents);
    return folder;
  }

  function expectLeftOutAndUntouched(
    project: Project,
    folder: string,
    before: Map<string, Buffer>
  ) {
    expect(project.loadingError).toBeUndefined();
    expect(project.sessions.items.length).toBe(sessionCount);
    expect(project.persons.items.length).toBe(personCount);
    expect(
      [...project.sessions.items, ...project.persons.items].some(
        (f) => f.directory === folder
      )
    ).toBe(false);
    expect(NotifyError).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(Path.basename(folder))
    );
    // saving everything, and replacing the project, are when lameta writes what it loaded
    project.saveAllFilesInFolder();
    new ProjectHolder().setProject(null);
    expectUnchanged(folder, before);
  }

  for (const [kind, contents] of Object.entries(unreadableContents)) {
    it(`opens without the session and leaves its file alone when the .session has ${kind}`, () => {
      const folder = addFolder("Sessions", contents);
      const before = snapshotFiles(folder);
      const holder = new ProjectHolder();
      holder.setProject(Project.fromDirectory(projectDir));
      expect(holder.loadedProject).toBeTruthy();
      expectLeftOutAndUntouched(holder.loadedProject!, folder, before);
    });

    it(`opens without the person and leaves its file alone when the .person has ${kind}`, () => {
      const folder = addFolder("People", contents);
      const before = snapshotFiles(folder);
      const holder = new ProjectHolder();
      holder.setProject(Project.fromDirectory(projectDir));
      expect(holder.loadedProject).toBeTruthy();
      expectLeftOutAndUntouched(holder.loadedProject!, folder, before);
    });
  }

  it("opens without the session when it is loaded asynchronously", async () => {
    const folder = addFolder("Sessions", "");
    const before = snapshotFiles(folder);
    const holder = new ProjectHolder();
    holder.setProject(await Project.fromDirectoryAsync(projectDir));
    expect(holder.loadedProject).toBeTruthy();
    expectLeftOutAndUntouched(holder.loadedProject!, folder, before);
  });

  it("opens without the person when it is loaded asynchronously", async () => {
    const folder = addFolder("People", "");
    const before = snapshotFiles(folder);
    const holder = new ProjectHolder();
    holder.setProject(await Project.fromDirectoryAsync(projectDir));
    expect(holder.loadedProject).toBeTruthy();
    expectLeftOutAndUntouched(holder.loadedProject!, folder, before);
  });

  it("opens without a session whose media file's .meta is empty, leaving both files alone", () => {
    const folder = addFolder("Sessions", goodSessionXml);
    fs.writeFileSync(Path.join(folder, "tha016.wav"), "not really audio");
    fs.writeFileSync(Path.join(folder, "tha016.wav.meta"), "");
    const before = snapshotFiles(folder);
    const holder = new ProjectHolder();
    holder.setProject(Project.fromDirectory(projectDir));
    expect(holder.loadedProject).toBeTruthy();
    expectLeftOutAndUntouched(holder.loadedProject!, folder, before);
  });

  it("says nothing when every folder can be read", () => {
    const project = Project.fromDirectory(projectDir);
    expect(project.loadingError).toBeUndefined();
    expect(project.sessions.items.length).toBe(sessionCount);
    expect(NotifyError).not.toHaveBeenCalled();
  });
});
