import { describe, it, expect } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { Contribution } from "../model/file/File";
import { checkProjectFolders } from "./lametaChecks";
import { combineProblems } from "./problems";
import { IRulesFileProblem } from "./rulesSandboxMain";
import { languageNameForExport } from "../export/languageNameForExport";
import { resetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";

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
// adds a session folder that holds only its .session, with this XML in it
function addSession(dir: string, id: string, xml = "<Session></Session>") {
  fs.mkdirSync(Path.join(dir, "Sessions", id));
  fs.writeFileSync(Path.join(dir, "Sessions", id, id + ".session"), xml);
}
// the severity and target of each problem that one check found
const found = (project: Project, checkId: string) =>
  checkProjectFolders(project)
    .filter((p) => p.checkId === checkId)
    .map((p) => [p.severity, p.target]);

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

  describe("a session that has no files", () => {
    it("reports a session that has only its .session", () => {
      const project = loadEdolo(undefined, (dir) => addSession(dir, "ETR010"));
      expect(found(project, "sessionWithoutFiles")).toEqual([
        ["error", { folderType: "session", folderId: "ETR010" }],
      ]);
    });

    it("does not report a session that has one file", () => {
      const project = loadEdolo(undefined, (dir) => {
        addSession(dir, "ETR010");
        fs.writeFileSync(Path.join(dir, "Sessions", "ETR010", "ETR010_notes.txt"), "x");
      });
      expect(found(project, "sessionWithoutFiles")).toEqual([]);
    });
  });

  describe("a session that has no contributors", () => {
    const withNotes = (dir: string) => {
      addSession(dir, "ETR010");
      fs.writeFileSync(Path.join(dir, "Sessions", "ETR010", "ETR010_notes.txt"), "x");
    };
    const etr010 = (project: Project) =>
      (project.sessions.items as Session[]).find((s) => s.id === "ETR010")!;

    it("reports a session in which no file has a contributor", () => {
      const project = loadEdolo(undefined, withNotes);
      expect(found(project, "sessionWithoutContributors")).toEqual([
        ["error", { folderType: "session", folderId: "ETR010", fieldKey: "contributions" }],
      ]);
    });

    it("reports a session whose only contribution has no name", () => {
      const project = loadEdolo(undefined, withNotes);
      etr010(project).metadataFile!.contributions.push(new Contribution(" ", "speaker", ""));
      expect(found(project, "sessionWithoutContributors")).toHaveLength(1);
    });

    it("does not report a session whose contributor is only on one of its other files", () => {
      const project = loadEdolo(undefined, withNotes);
      const notes = etr010(project).files.find(
        (f) => f.getTextProperty("filename") === "ETR010_notes.txt",
      )!;
      notes.contributions.push(new Contribution("Awi Heole", "speaker", ""));
      expect(found(project, "sessionWithoutContributors")).toEqual([]);
    });

    it("does not report the Edolo sample's session", () => {
      expect(found(loadEdolo(), "sessionWithoutContributors")).toEqual([]);
    });
  });

  describe("one language code with different names in different sessions", () => {
    // A session for each value of its subject languages field. The sample's ETR009
    // already has "etr: Edolo".
    const withLanguages =
      (...values: string[]) =>
      (dir: string) =>
        values.forEach((value, i) =>
          addSession(
            dir,
            `ETR01${i}`,
            `<Session><languages type="string">${value}</languages></Session>`,
          ),
        );
    const reported = (project: Project) =>
      checkProjectFolders(project)
        .filter((p) => p.checkId === "languageNameVariations")
        .map((p) => [p.severity, p.target]);
    const at = (folderId: string, fieldKey = "languages") => ({
      folderType: "session",
      folderId,
      fieldKey,
    });

    it("reports the session that uses the less common name, as a warning", () => {
      const project = loadEdolo(undefined, withLanguages("etr:Edolo", "etr:Etoro", "etr:Edolo"));
      expect(reported(project)).toEqual([["warning", at("ETR011")]]);
    });

    it("reports every session when two names are equally common", () => {
      const project = loadEdolo(undefined, withLanguages("tpi:Tok Pisin", "eng;tpi:Pisin"));
      expect(reported(project)).toEqual([
        ["warning", at("ETR010")],
        ["warning", at("ETR011")],
      ]);
    });

    it("compares a working language with subject languages", () => {
      const project = loadEdolo(undefined, (dir) => {
        withLanguages("etr:Edolo", "etr:Edolo")(dir);
        addSession(
          dir,
          "ETR020",
          `<Session><workingLanguages type="string">etr:Etoro</workingLanguages></Session>`,
        );
      });
      expect(reported(project)).toEqual([["warning", at("ETR020", "workingLanguages")]]);
    });

    it("counts a session that names the language in both of its fields once", () => {
      const project = loadEdolo(undefined, (dir) => {
        addSession(
          dir,
          "ETR010",
          `<Session><languages type="string">tpi:Tok Pisin</languages><workingLanguages type="string">tpi:Tok Pisin</workingLanguages></Session>`,
        );
        addSession(
          dir,
          "ETR011",
          `<Session><languages type="string">tpi:Pisin</languages></Session>`,
        );
      });
      expect(reported(project)).toEqual([
        ["warning", at("ETR010")],
        ["warning", at("ETR010", "workingLanguages")],
        ["warning", at("ETR011")],
      ]);
    });

    it("does not report names that differ only in capitalisation", () => {
      const project = loadEdolo(undefined, withLanguages("etr:Edolo", "etr:edolo"));
      expect(reported(project)).toEqual([]);
    });

    it("compares a plain code by the name that export writes for it", () => {
      const exported = languageNameForExport("tpi", loadEdolo());
      const agrees = loadEdolo(undefined, withLanguages("tpi", `tpi:${exported}`));
      expect(reported(agrees)).toEqual([]);
      const differs = loadEdolo(undefined, withLanguages("tpi", `tpi:${exported} language`));
      expect(reported(differs)).toHaveLength(2);
    });

    it("does not report different codes, and reports a field that gives one code two names once", () => {
      expect(reported(loadEdolo(undefined, withLanguages("etr:Edolo", "eng:Edolo")))).toEqual([]);
      expect(reported(loadEdolo(undefined, withLanguages("etr:Edolo;etr:Etoro")))).toHaveLength(1);
    });

    it("compares two tags of one language by the ISO 639-3 code that export writes", () => {
      const project = loadEdolo(undefined, withLanguages("en:English", "eng:Anglais"));
      expect(reported(project)).toEqual([
        ["warning", at("ETR010")],
        ["warning", at("ETR011")],
      ]);
    });

    it("does not compare a SayMore-era language name with a code", () => {
      const project = loadEdolo(undefined, withLanguages("Aka", "aka:Akan"));
      expect(reported(project)).toEqual([]);
    });

    it("is an error in a configuration that says so, such as ELAR", () => {
      const project = loadEdolo(undefined, (dir) => {
        withLanguages("etr:Edolo", "etr:Etoro", "etr:Edolo")(dir);
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
      });
      try {
        expect(reported(project)).toEqual([["error", at("ETR011")]]);
      } finally {
        resetOtherConfigurationSettings();
      }
    });
  });

  describe("a contributor who has no consent on record", () => {
    // Awi Heole and Ilawi Amosa contribute to ETR009 and have a consent file. Igali
    // Sagali has none, and contributes to no session.
    const igaliIn = (project: Project) =>
      (project.persons.items as Person[]).find((p) => p.displayName === "Igali Sagali")!;

    it("does not report a person who contributes to no session", () => {
      expect(found(loadEdolo(), "contributorWithoutConsent")).toEqual([]);
    });

    it("reports a contributor who has no file with Consent in its name, as a warning", () => {
      const project = loadEdolo();
      const igali = igaliIn(project);
      (project.sessions.items[0] as Session).metadataFile!.contributions.push(
        new Contribution("Igali Sagali", "speaker", ""),
      );
      const problems = checkProjectFolders(project).filter(
        (p) => p.checkId === "contributorWithoutConsent",
      );
      expect(problems.map((p) => [p.severity, p.subject, p.target])).toEqual([
        [
          "warning",
          "Igali Sagali",
          { folderType: "person", folderId: igali.getIdToUseForReferences() },
        ],
      ]);
      expect(problems[0].reason).toBeTruthy();
    });

    it("finds a contributor named by code, on a media file", () => {
      const project = loadEdolo();
      igaliIn(project).properties.setText("code", "IGS");
      const mp3 = (project.sessions.items[0] as Session).files.find(
        (f) => f.getTextProperty("filename") === "ETR009_Careful.mp3",
      )!;
      mp3.contributions.push(new Contribution("igs", "speaker", ""));
      expect(found(project, "contributorWithoutConsent")).toHaveLength(1);
    });

    it("reports a contributor whose consent file is gone", () => {
      const project = loadEdolo(undefined, (dir) =>
        fs.removeSync(Path.join(dir, "People", "Awi_Heole", "Awi_Heole_Consent.JPG")),
      );
      expect(
        checkProjectFolders(project)
          .filter((p) => p.checkId === "contributorWithoutConsent")
          .map((p) => p.subject),
      ).toEqual(["Awi Heole"]);
    });
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
