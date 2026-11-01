import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { resetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import ImdiGenerator from "../export/ImdiGenerator";
import { watchImdiGeneration } from "./imdiProblems";
import { IFieldProblem } from "./fieldRules";

mobx.configure({ enforceActions: "never" });
temp.track();

// The Edolo sample in the given archive, with a second session, ETR010, and a file in
// ETR009 whose IMDI lameta cannot generate: a file with no name before its extension
// has no type, which the IMDI needs
function projectWithBadSession(archive: string): Project {
  const dir = Path.join(temp.mkdirSync("imdi problems"), "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  const second = Path.join(dir, "Sessions", "ETR010");
  fs.mkdirSync(second);
  fs.copyFileSync(
    Path.join(dir, "Sessions", "ETR009", "ETR009.session"),
    Path.join(second, "ETR010.session"),
  );
  fs.writeFileSync(Path.join(dir, "Sessions", "ETR009", ".wav"), "x");
  const sprj = Path.join(dir, "Edolo sample.sprj");
  fs.writeFileSync(
    sprj,
    fs
      .readFileSync(sprj, "utf8")
      .replace(
        "<ArchiveConfigurationName>custom</ArchiveConfigurationName>",
        `<ArchiveConfigurationName>${archive}</ArchiveConfigurationName>`,
      ),
  );
  return Project.fromDirectory(dir);
}

// Watches until the first problems are published
async function watch(project: Project) {
  let published: IFieldProblem[] | undefined;
  const stop = watchImdiGeneration(project, (p) => (published = p));
  await vi.waitFor(() => expect(published).toBeDefined(), { timeout: 10000 });
  return {
    stop,
    latest: () => published!,
    reset: () => (published = undefined),
  };
}

describe("watchImdiGeneration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetOtherConfigurationSettings();
  });

  it("reports a session whose IMDI lameta cannot generate, as an error on that session", async () => {
    const watching = await watch(projectWithBadSession("ELAR"));
    const problems = watching.latest();
    watching.stop();
    expect(problems.map((p) => [p.checkId, p.severity, p.target])).toEqual([
      ["imdiNotGenerated", "error", { folderType: "session", folderId: "ETR009" }],
    ]);
    expect(problems[0].reason).toBeTruthy();
  });

  it("does not generate while the project opens, only after a pause", async () => {
    const project = projectWithBadSession("ELAR");
    const generate = vi.spyOn(ImdiGenerator, "generateSession");
    const stop = watchImdiGeneration(project, () => {});
    expect(generate).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(2), { timeout: 10000 });
    stop();
  });

  it("generates nothing for an archive that does not take IMDI", async () => {
    const generate = vi.spyOn(ImdiGenerator, "generateSession");
    const watching = await watch(projectWithBadSession("PARADISEC"));
    watching.stop();
    expect(watching.latest()).toEqual([]);
    expect(generate).not.toHaveBeenCalled();
  });

  it("generates again only the session that changed", async () => {
    const project = projectWithBadSession("ELAR");
    const generate = vi.spyOn(ImdiGenerator, "generateSession");
    const watching = await watch(project);
    expect(generate).toHaveBeenCalledTimes(2);
    generate.mockClear();
    watching.reset();

    const session = (project.sessions.items as Session[]).find((s) => s.id === "ETR010")!;
    session.properties.setText("title", "A new title");
    await vi.waitFor(() => expect(watching.latest()).toBeDefined(), { timeout: 10000 });
    watching.stop();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][1]).toBe(session);
    // the session that could not be generated is still reported
    expect(watching.latest().map((p) => p.target)).toEqual([
      { folderType: "session", folderId: "ETR009" },
    ]);
  });
});
