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
import ImdiGenerator from "../../export/ImdiGenerator";
import { ProjectProblems } from "../../problems/ProjectProblems";
import {
  RulesFileProblems,
  RulesSandboxExecutor,
  rulesFileProblems,
} from "../../problems/RulesFileProblems";
import { IRulesSandboxOutput } from "../../problems/rulesSandboxMain";
import { checkProject } from "../../problems/checkProject";
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
      return count(Person.prototype, "getIdToUseForReferences", () =>
        checkProjectFolders(project),
      );
    });
    expect(large).toBeLessThanOrEqual(small * (kLarge / kSmall) * 1.5);
  });

  it("the rules recheck after one edit generates IMDI for that session only", async () => {
    vi.useFakeTimers();
    for (const n of [kSmall, kLarge]) {
      const project = open(n);
      const { runner } = rulesRunner();
      const stop = runner.watch(project);
      await vi.advanceTimersByTimeAsync(10);
      expect(runner.timing.sessionsGenerated).toBe(n);
      (project.sessions.items[0] as Session).properties.setText("title", "changed");
      await vi.advanceTimersByTimeAsync(2000);
      expect(runner.timing.sessionsGenerated).toBe(1);
      stop();
    }
  });

  // finding 14: generating a session finds a person's file by scanning every folder, so each
  // session's IMDI depends on the list of sessions
  it.fails("adding a session generates IMDI for the new session only (finding 14)", async () => {
    vi.useFakeTimers();
    const generated: number[] = [];
    for (const n of [kSmall, kLarge]) {
      const project = open(n);
      const { runner } = rulesRunner();
      const stop = runner.watch(project);
      await vi.advanceTimersByTimeAsync(10);
      project.addSession();
      await vi.advanceTimersByTimeAsync(2000);
      generated.push(runner.timing.sessionsGenerated);
      stop();
    }
    expect(generated).toEqual([1, 1]);
  });

  // finding 4: every rules run sends the IMDI of every session to the sandbox
  it.fails("the rules recheck after one edit checks only that session (finding 4)", async () => {
    vi.useFakeTimers();
    const sent: number[] = [];
    for (const n of [kSmall, kLarge]) {
      const project = open(n);
      const { runner, inputs } = rulesRunner();
      const stop = runner.watch(project);
      await vi.advanceTimersByTimeAsync(10);
      (project.sessions.items[0] as Session).properties.setText("title", "changed");
      await vi.advanceTimersByTimeAsync(2000);
      sent.push(inputs[inputs.length - 1]);
      stop();
    }
    expect(sent[1]).toBe(sent[0]);
  });

  // finding 12: the first run generates the IMDI of every session in one synchronous block
  it.fails("the first rules run gives the UI thread back between batches of sessions (finding 12)", () => {
    vi.useFakeTimers();
    const [small, large] = atBothSizes((n) => {
      const project = open(n);
      const { runner } = rulesRunner();
      let stop = () => {};
      const generated = count(ImdiGenerator, "generateSession", () => {
        stop = runner.watch(project);
        // fires the first run, which goes on synchronously until its first await
        vi.advanceTimersByTime(0);
      });
      stop();
      return generated;
    });
    // a fix that yields after any batch smaller than the whole project passes this
    expect(small).toBeLessThanOrEqual(kSmall);
    expect(large).toBeLessThan(kLarge);
  });

  // finding 5: opening the export dialog generates the IMDI of every session again,
  // although the background check already holds it
  it.fails("opening the export dialog after the background check generates nothing (finding 5)", async () => {
    vi.useFakeTimers();
    const project = open(kLarge);
    // the check that the app runs in the background, whose results the dialog could use;
    // in a test it cannot reach the sandbox, but it generates the IMDI all the same
    const stop = rulesFileProblems.watch(project);
    await vi.advanceTimersByTimeAsync(10);
    expect(rulesFileProblems.timing.sessionsGenerated).toBe(kLarge);
    const spy = vi.spyOn(ImdiGenerator, "generateSession");
    await checkProject(project);
    const generated = spy.mock.calls.length;
    spy.mockRestore();
    stop();
    expect(generated).toBe(0);
  });

  // finding 6: a rules run that was in flight when the data changed still applies its results
  it.fails("a rules result about a session renamed meanwhile is not shown (finding 6)", async () => {
    vi.useFakeTimers();
    const project = open(kSmall);
    let release: () => void = () => {};
    const executor: RulesSandboxExecutor = (input) =>
      new Promise((resolve) => {
        release = () => resolve({ value: oneProblemPerSession(input.sessions) });
      });
    const runner = new RulesFileProblems(executor, () => rulesFile());
    const stop = runner.watch(project);
    await vi.advanceTimersByTimeAsync(10);
    const session = project.sessions.items[0] as Session;
    const oldId = session.id;
    session.properties.setText("id", `${oldId}_renamed`);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(runner.problems.map((p) => p.sessionId)).not.toContain(oldId);
    stop();
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

let rulesPath: string | undefined;
function rulesFile(): string {
  if (!rulesPath) {
    rulesPath = Path.join(temp.mkdirSync("scaling rules"), "rules.js");
    fs.writeFileSync(rulesPath, "export const interfaceVersion = 1;");
  }
  return rulesPath;
}

function oneProblemPerSession(sessions: Array<{ sessionId: string }>): IRulesSandboxOutput {
  return {
    problems: sessions.map((s) => ({
      checkId: "title",
      severity: "error",
      message: "m",
      from: "checkSession",
      sessionId: s.sessionId,
    })),
    errors: [],
    milliseconds: 0,
  } as IRulesSandboxOutput;
}

// a runner whose sandbox reports one problem per session and records how many
// sessions each run sent it
function rulesRunner() {
  const inputs: number[] = [];
  const runner = new RulesFileProblems(async (input) => {
    inputs.push(input.sessions.length);
    return { value: oneProblemPerSession(input.sessions) };
  }, rulesFile);
  return { runner, inputs };
}
