import { describe, it, expect } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { Contribution } from "../model/file/File";
import { checkProjectFolders } from "./lametaChecks";
import { combineProblems } from "./problems";
import { IRulesFileProblem } from "./rulesSandboxMain";

mobx.configure({ enforceActions: "never" });
temp.track();

// `addToEtr009`: the name of a file to put in ETR009's folder first. lameta renames a
// file that the user adds, so a name that breaks the rules can only come from a
// file that was there already.
function loadEdolo(addToEtr009?: string, change?: (dir: string) => void): Project {
  const dir = Path.join(temp.mkdirSync("lameta checks"), "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  if (addToEtr009) fs.writeFileSync(Path.join(dir, "Sessions", "ETR009", addToEtr009), "x");
  change?.(dir);
  return Project.fromDirectory(dir);
}
// the sample's own problem: Hatton, a contributor that no person record matches
const notHatton = (p: { subject?: string }) => p.subject !== "Hatton";

describe("checkProjectFolders", () => {
  it("finds the Edolo sample's contributor who has no person record", () => {
    expect(
      checkProjectFolders(loadEdolo()).map((p) => [p.checkId, p.subject, p.target.fileName]),
    ).toEqual([
      ["contributorWithoutPerson", "Hatton", "ETR009_Careful.mp3"],
      ["contributorWithoutPerson", "Hatton", "ETR009_Tiny.mp4"],
    ]);
  });

  it("reports a contributor who has no matching person, once per file", () => {
    const project = loadEdolo();
    const session = project.sessions.items[0] as Session;
    session.metadataFile!.contributions.push(
      new Contribution("Nobody Known", "speaker", ""),
      new Contribution("Nobody Known", "recorder", ""),
      new Contribution("nobody known", "researcher", ""),
    );
    expect(
      checkProjectFolders(project)
        .filter(notHatton)
        .map((p) => [p.checkId, p.severity, p.subject, p.target]),
    ).toEqual([
      [
        "contributorWithoutPerson",
        "error",
        "Nobody Known",
        {
          folderType: "session",
          folderId: session.id,
          fieldKey: "contributions",
        },
      ],
    ]);
  });

  it("finds a person by their name or their code", () => {
    const project = loadEdolo();
    const person = project.persons.items[0];
    const name = person.properties.getTextStringOrEmpty("name");
    person.properties.setText("code", "XYZ");
    const session = project.sessions.items[0] as Session;
    session.metadataFile!.contributions.push(
      new Contribution(name, "speaker", ""),
      new Contribution("xyz", "recorder", ""),
    );
    expect(checkProjectFolders(project).filter(notHatton)).toEqual([]);
  });

  it("reports a file name that breaks the archive's file naming rules", () => {
    const project = loadEdolo("a file with spaces.txt");
    const session = project.sessions.items[0] as Session;
    const problems = checkProjectFolders(project).filter(notHatton);
    expect(problems.map((p) => [p.checkId, p.severity, p.target])).toEqual([
      [
        "fileNameNotAllowed",
        "warning",
        {
          folderType: "session",
          folderId: session.id,
          fileName: "a file with spaces.txt",
        },
      ],
    ]);
    // it says what name export gives the file
    expect(problems[0].reason).toContain("a_file_with_spaces.txt");

    // a rules file reporting the same thing at the same place shows it once
    const fromRules: IRulesFileProblem = {
      checkId: "fileName",
      severity: "warning",
      subject: problems[0].subject,
      message: problems[0].text,
      target: problems[0].target,
      from: "checkSession",
      sessionId: session.id,
    };
    expect(combineProblems(problems, [fromRules]).map((p) => p.checkId)).toEqual(["fileName"]);
  });

  describe("metadata files that lameta could not read", () => {
    const unreadable = (project: Project) =>
      checkProjectFolders(project)
        .filter((p) => p.checkId === "metadataUnreadable")
        .map((p) => [p.severity, p.subject, p.target]);

    it("reports a session whose .session could not be read", () => {
      const project = loadEdolo(undefined, (dir) =>
        fs.writeFileSync(Path.join(dir, "Sessions", "ETR009", "ETR009.session"), ""),
      );
      expect(unreadable(project)).toEqual([
        ["error", "ETR009.session", { folderType: "session", folderId: "ETR009" }],
      ]);
    });

    it("reports a person whose .person could not be read", () => {
      const project = loadEdolo(undefined, (dir) =>
        fs.writeFileSync(Path.join(dir, "People", "Awi_Heole", "Awi_Heole.person"), "<Person>"),
      );
      expect(unreadable(project)).toEqual([
        ["error", "Awi_Heole.person", { folderType: "person", folderId: "Awi_Heole" }],
      ]);
    });

    it("reports a file whose .meta could not be read", () => {
      const project = loadEdolo(undefined, (dir) =>
        fs.writeFileSync(Path.join(dir, "Sessions", "ETR009", "SceneHouse.JPG.meta"), "<Meta"),
      );
      expect(unreadable(project)).toEqual([
        [
          "error",
          "SceneHouse.JPG.meta",
          { folderType: "session", folderId: "ETR009", fileName: "SceneHouse.JPG" },
        ],
      ]);
    });

    it("reports the project's .sprj", () => {
      const project = loadEdolo(undefined, (dir) =>
        fs.writeFileSync(Path.join(dir, "Edolo sample.sprj"), ""),
      );
      expect(unreadable(project)).toEqual([
        ["error", "Edolo sample.sprj", { folderType: "project" }],
      ]);
    });

    it("reports a project document whose .meta could not be read", () => {
      const project = loadEdolo(undefined, (dir) =>
        fs.writeFileSync(Path.join(dir, "OtherDocuments", "some other doc.txt.meta"), "<Meta"),
      );
      expect(unreadable(project)).toEqual([
        [
          "error",
          "some other doc.txt.meta",
          { folderType: "project", documents: "other", fileName: "some other doc.txt" },
        ],
      ]);
    });
  });
});
