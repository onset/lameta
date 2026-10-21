import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { ProjectProblems } from "./ProjectProblems";

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
    // "fishing" is not capitalised
    expect(problems.problemsOf(keyword).map((p) => p.checkId)).toEqual(["pattern"]);
    session.properties.setText("keyword", "Fishing");
    vi.advanceTimersByTime(500);
    expect(problems.problemsOf(keyword)).toEqual([]);

    stop();
    expect(problems.problems).toEqual([]);
  });
});
