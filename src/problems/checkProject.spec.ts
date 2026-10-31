import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { checkOfSessions, checkProject, IProjectCheck, whyExportIsBlocked } from "./checkProject";
import { IProblem } from "./problems";
import * as lametaChecks from "./lametaChecks";

mobx.configure({ enforceActions: "never" });
temp.track();

describe("checkProject", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reports that it could not check the project when a check fails", async () => {
    const dir = Path.join(temp.mkdirSync("check project"), "Edolo sample");
    fs.copySync("sample data/Edolo sample", dir);
    const project = Project.fromDirectory(dir);
    vi.spyOn(lametaChecks, "checkProjectFolders").mockImplementation(() => {
      throw new Error("broken");
    });

    const check = await checkProject(project);

    expect(check.checkErrors).toHaveLength(1);
    expect(whyExportIsBlocked("imdi", ["imdi"], check)).toEqual(["incompleteCheck"]);
  });
});

describe("whyExportIsBlocked", () => {
  const error = { severity: "error" } as IProblem;
  const warning = { severity: "warning" } as IProblem;
  const complete: IProjectCheck = { problems: [], checkErrors: [] };
  const incomplete: IProjectCheck = {
    problems: [],
    checkErrors: [{ message: "x", sessionId: "ETR009" }],
  };

  it("blocks a blocked format when there are errors", () => {
    expect(
      whyExportIsBlocked("imdi", ["imdi"], { ...complete, problems: [warning, error] }),
    ).toEqual(["errors"]);
  });
  it("blocks a blocked format when the check could not finish, even with no errors", () => {
    expect(whyExportIsBlocked("imdi", ["imdi"], { ...incomplete, problems: [warning] })).toEqual([
      "incompleteCheck",
    ]);
  });
  it("does not block a blocked format with only warnings and a complete check", () => {
    expect(whyExportIsBlocked("imdi", ["imdi"], { ...complete, problems: [warning] })).toEqual([]);
  });
  it("does not block other formats", () => {
    expect(whyExportIsBlocked("csv", ["imdi"], { ...incomplete, problems: [error] })).toEqual([]);
  });
  it("does not count what was found in a session that is not exported", () => {
    const check: IProjectCheck = {
      problems: [{ ...error, sessionId: "ETR010" }],
      checkErrors: [{ message: "x", sessionId: "ETR010" }],
    };
    expect(whyExportIsBlocked("imdi", ["imdi"], checkOfSessions(check, new Set()))).toEqual([]);
    expect(
      whyExportIsBlocked("imdi", ["imdi"], checkOfSessions(check, new Set(["ETR010"]))),
    ).toEqual(["errors", "incompleteCheck"]);
  });
  it("still counts an error that belongs to no session", () => {
    const check: IProjectCheck = {
      problems: [],
      checkErrors: [{ message: "x" }],
    };
    expect(whyExportIsBlocked("imdi", ["imdi"], checkOfSessions(check, new Set()))).toEqual([
      "incompleteCheck",
    ]);
  });
});
