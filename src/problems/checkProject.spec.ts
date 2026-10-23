import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { checkProject, IProjectCheck, whyExportIsBlocked } from "./checkProject";
import { IProblem } from "./problems";
import { checkProjectFields } from "./fieldRules";
import { rulesFileProblems } from "./RulesFileProblems";

mobx.configure({ enforceActions: "never" });
temp.track();

describe("checkProject", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the problems it found when the rules file check fails", async () => {
    const dir = Path.join(temp.mkdirSync("check project"), "Edolo sample");
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
    const project = Project.fromDirectory(dir);
    expect(checkProjectFields(project).length).toBeGreaterThan(0);
    vi.spyOn(rulesFileProblems, "checkNow").mockRejectedValue(new Error("broken"));

    const check = await checkProject(project);

    expect(check.problems.length).toBeGreaterThanOrEqual(checkProjectFields(project).length);
    expect(check.rulesFileErrors.map((e) => e.kind)).toEqual(["load"]);
  });
});

describe("whyExportIsBlocked", () => {
  const error = { severity: "error" } as IProblem;
  const warning = { severity: "warning" } as IProblem;
  const complete: IProjectCheck = { problems: [], rulesFileErrors: [] };
  const incomplete: IProjectCheck = {
    problems: [],
    rulesFileErrors: [{ kind: "imdi", message: "x", sessionId: "ETR009" }],
  };

  it("blocks a blocked format when there are errors", () => {
    expect(whyExportIsBlocked("imdi", ["imdi"], complete, [warning, error])).toEqual(["errors"]);
  });
  it("blocks a blocked format when the check could not finish, even with no errors", () => {
    expect(whyExportIsBlocked("imdi", ["imdi"], incomplete, [warning])).toEqual([
      "incompleteCheck",
    ]);
  });
  it("does not block a blocked format with only warnings and a complete check", () => {
    expect(whyExportIsBlocked("imdi", ["imdi"], complete, [warning])).toEqual([]);
  });
  it("does not block other formats", () => {
    expect(whyExportIsBlocked("csv", ["imdi"], incomplete, [error])).toEqual([]);
  });
});
