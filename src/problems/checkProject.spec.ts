import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { checkOfSessions, checkProject, IProjectCheck, whyExportIsBlocked } from "./checkProject";
import { IProblem } from "./problems";
import * as lametaChecks from "./lametaChecks";
import { Person } from "../model/Project/Person/Person";
import { resetTildeBirthYearWarning, tildeBirthYearWarningGiven } from "../export/ImdiGenerator";
import { resetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";

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

describe("checkProject in an ELAR project", () => {
  it("reports a session whose IMDI lameta cannot generate, which blocks the export", async () => {
    const dir = Path.join(temp.mkdirSync("check project"), "Edolo sample");
    fs.copySync("sample data/Edolo sample", dir);
    // a file with no name before its extension has no type, which the IMDI needs
    fs.writeFileSync(Path.join(dir, "Sessions", "ETR009", ".wav"), "x");
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
    const check = await checkProject(Project.fromDirectory(dir));
    expect(check.checkErrors.map((e) => e.sessionId)).toEqual(["ETR009"]);
    expect(check.checkErrors[0].message).toContain("could not generate the IMDI of session ETR009");
    expect(whyExportIsBlocked("imdi", ["imdi"], check)).toContain("incompleteCheck");
    resetOtherConfigurationSettings();
  });

  it("leaves the warning about an approximate birth year for the IMDI that the user sees", async () => {
    resetTildeBirthYearWarning();
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
    (project.persons.items[0] as Person).properties.setText("birthYear", "~1964");
    await checkProject(project);
    expect(tildeBirthYearWarningGiven()).toBe(false);
    resetOtherConfigurationSettings();
  });

  it("generates no IMDI for a project with no archive", async () => {
    const dir = Path.join(temp.mkdirSync("check project"), "Edolo sample");
    fs.copySync("sample data/Edolo sample", dir);
    fs.writeFileSync(Path.join(dir, "Sessions", "ETR009", ".wav"), "x");
    expect((await checkProject(Project.fromDirectory(dir))).checkErrors).toEqual([]);
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
