import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { ProjectProblems } from "./ProjectProblems";
import { startedTyping, stoppedTyping } from "./whileTyping";

mobx.configure({ enforceActions: "never" });
temp.track();

function loadEdoloUnderElar(): Project {
  const dir = Path.join(temp.mkdirSync("project problems"), "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  const sprj = Path.join(dir, "Edolo sample.sprj");
  fs.writeFileSync(
    sprj,
    fs
      .readFileSync(sprj, "utf8")
      .replace(
        "<ArchiveConfigurationName>custom</ArchiveConfigurationName>",
        "<ArchiveConfigurationName>ELAR</ArchiveConfigurationName>",
      ),
  );
  return Project.fromDirectory(dir);
}

describe("ProjectProblems", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives each field its own problems, and drops them once the field is fixed", () => {
    vi.useFakeTimers();
    const project = loadEdoloUnderElar();
    const session = project.sessions.items[0] as Session;
    const keyword = session.properties.getValueOrThrow("keyword");
    const problems = new ProjectProblems();
    const stop = problems.watch(project);

    // the first check runs at once
    expect(problems.problemsOf(keyword).map((p) => p.checkId)).toEqual(["minItems"]);
    expect(problems.problems).toContain(problems.problemsOf(keyword)[0]);

    session.properties.setText("keyword", "fishing");
    // nothing changes until the user pauses
    expect(problems.problemsOf(keyword).map((p) => p.checkId)).toEqual(["minItems"]);
    vi.advanceTimersByTime(500);
    expect(problems.problemsOf(keyword)).toEqual([]);

    stop();
    expect(problems.problems).toEqual([]);
  });
  it("keeps the same list when a recheck finds the same problems", () => {
    vi.useFakeTimers();
    const project = loadEdoloUnderElar();
    const session = project.sessions.items[0] as Session;
    const problems = new ProjectProblems();
    const stop = problems.watch(project);
    const before = problems.problems;
    expect(before.length).toBeGreaterThan(0);

    // an edit that changes no problem
    session.properties.setText("title", "Another title");
    vi.advanceTimersByTime(500);
    expect(problems.problems).toBe(before);

    // an edit that removes one
    session.properties.setText("keyword", "fishing");
    vi.advanceTimersByTime(500);
    expect(problems.problems).not.toBe(before);
    expect(problems.problems.length).toBe(before.length - 1);

    stop();
  });
  it("checks again only once the user leaves the field they are typing in", () => {
    vi.useFakeTimers();
    const project = loadEdoloUnderElar();
    const session = project.sessions.items[0] as Session;
    const keyword = session.properties.getValueOrThrow("keyword");
    const problems = new ProjectProblems();
    const stop = problems.watch(project);
    expect(problems.problemsOf(keyword).map((p) => p.checkId)).toEqual(["minItems"]);

    const editor = {};
    startedTyping(editor);
    for (const text of ["f", "fi", "fis", "fish"]) {
      session.properties.setText("keyword", text);
      vi.advanceTimersByTime(300);
    }
    vi.advanceTimersByTime(5000);
    expect(problems.problemsOf(keyword).map((p) => p.checkId)).toEqual(["minItems"]);

    stoppedTyping(editor);
    vi.advanceTimersByTime(0);
    expect(problems.problemsOf(keyword)).toEqual([]);

    stop();
  });
});
