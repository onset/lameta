// How much work each user action does as the project grows. Each test builds the same
// generated project (sample-data-generator/torture/bulk.ts) at two sizes, counts the
// records an action reads, writes, checks or indexes, and asserts how that count grows.
// Times are not asserted: they depend on the machine and on what else it is doing.
// A test marked `it.fails` describes the behavior lameta should have; the finding
// number points into perf-findings.md.

import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "./Project";
import { Session } from "./Session/Session";
import { Person } from "./Person/Person";
import { File } from "../file/File";
import { FieldSet } from "../field/FieldSet";
import { FolderSearchTermsIndex } from "../Folder/FolderSearchTermsIndex";
import { ProjectProblems } from "../../problems/ProjectProblems";
import { checkProjectFolders } from "../../problems/lametaChecks";
import { ProjectWriter } from "../../../sample-data-generator/torture/writer";
import { ContentMaker } from "../../../sample-data-generator/torture/content";
import { writeProject } from "../../../sample-data-generator/torture/cases";
import { writeBulk } from "../../../sample-data-generator/torture/bulk";

mobx.configure({ enforceActions: "never" });
temp.track();

const kSmall = 10;
const kLarge = 100;

const built = new Map<number, string>();
// a generated project with `sessions` sessions and people in proportion, under ELAR
function projectFolder(sessions: number): string {
  let dir = built.get(sessions);
  if (!dir) {
    dir = Path.join(temp.mkdirSync("scaling"), `Scaling ${sessions}`);
    const ctx = {
      w: new ProjectWriter(dir),
      content: new ContentMaker(undefined),
      archiveConfiguration: "ELAR",
    };
    writeProject(ctx, Path.basename(dir));
    writeBulk(ctx, sessions, Math.max(1, Math.round(sessions * 0.3)));
    built.set(sessions, dir);
  }
  return dir;
}

function open(sessions: number): Project {
  return Project.fromDirectory(projectFolder(sessions));
}

// counts calls of `method` on `owner` while `action` runs
function count<T extends object>(owner: T, method: keyof T, action: () => void): number {
  const spy = vi.spyOn(owner, method as any);
  try {
    action();
    return spy.mock.calls.length;
  } finally {
    spy.mockRestore();
  }
}

// [count at kSmall, count at kLarge]
function atBothSizes(measure: (sessions: number) => number): [number, number] {
  return [measure(kSmall), measure(kLarge)];
}

function typeInto(session: Session, key: string, text: string) {
  for (let i = 1; i <= text.length; i++) session.properties.setText(key, text.slice(0, i));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("work per action as the project grows", () => {
  it("opening reads the metadata of each file once", () => {
    const [small, large] = atBothSizes((n) =>
      count(File.prototype, "readMetadataFile", () => open(n)),
    );
    // the project's own files are read too, the same number at every size
    expect(large - small).toBe(
      countFilesWithMetadata(projectFolder(kLarge)) - countFilesWithMetadata(projectFolder(kSmall)),
    );
  });

  it("selecting a session reads nothing from disk", () => {
    atBothSizes((n) => {
      const project = open(n);
      const reads = count(File.prototype, "readMetadataFile", () => {
        project.sessions.selectedIndex = n - 1;
      });
      expect(reads).toBe(0);
      return reads;
    });
  });

  it("a keystroke serializes only the file being edited", () => {
    const [small, large] = atBothSizes((n) => {
      const project = open(n);
      const session = project.sessions.items[0] as Session;
      return count(File.prototype, "getXml", () => typeInto(session, "title", "abc"));
    });
    expect(large).toBe(small);
  });

  it("saving after an edit writes only the edited file", () => {
    const [small, large] = atBothSizes((n) => {
      const project = open(n);
      const session = project.sessions.items[0] as Session;
      typeInto(session, "title", "abc");
      return count(File.prototype, "getXml", () => session.saveAllFilesInFolder());
    });
    expect(large).toBe(small);
  });

  // finding 1: tab switches and window blur save the whole project
  it.fails("saving the project with nothing changed looks at no file (finding 1)", () => {
    const [small, large] = atBothSizes((n) => {
      const project = open(n);
      return count(fs, "existsSync", () => project.saveAllFilesInFolder());
    });
    expect(large).toBe(small);
  });

  // finding 2: once the list has been searched, every keystroke anywhere rebuilds the index
  it.fails("after a search, a keystroke re-indexes only the edited folder (finding 2)", () => {
    const [small, large] = atBothSizes((n) => {
      const project = open(n);
      project.sessions.filter("studio");
      const session = project.sessions.items[0] as Session;
      return count(FolderSearchTermsIndex.prototype as any, "makeBlob", () =>
        typeInto(session, "title", "abc"),
      );
    });
    expect(large).toBe(small);
  });

  // finding 3: the field and lameta checks walk every record after any edit
  it.fails("the problems recheck after one edit reads only the edited record (finding 3)", () => {
    vi.useFakeTimers();
    const [small, large] = atBothSizes((n) => {
      const project = open(n);
      const problems = new ProjectProblems();
      const stop = problems.watch(project);
      const session = project.sessions.items[0] as Session;
      const reads = count(FieldSet.prototype, "values", () => {
        session.properties.setText("title", "changed");
        vi.advanceTimersByTime(500);
      });
      stop();
      return reads;
    });
    expect(large).toBe(small);
  });

  it("matching contributors to people grows no faster than the project", () => {
    const [small, large] = atBothSizes((n) => {
      const project = open(n);
      return count(Person.prototype, "getIdToUseForReferences", () => checkProjectFolders(project));
    });
    expect(large).toBeLessThanOrEqual(small * (kLarge / kSmall) * 1.5);
  });
});

// every file in a session or person folder except a .meta, which describes another file
function countFilesWithMetadata(dir: string): number {
  let n = 0;
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = Path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (!e.name.endsWith(".meta")) n++;
    }
  };
  walk(Path.join(dir, "Sessions"));
  walk(Path.join(dir, "People"));
  return n;
}
