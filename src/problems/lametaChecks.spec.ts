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
function loadEdolo(addToEtr009?: string): Project {
  const dir = Path.join(temp.mkdirSync("lameta checks"), "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  if (addToEtr009) fs.writeFileSync(Path.join(dir, "Sessions", "ETR009", addToEtr009), "x");
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
});
