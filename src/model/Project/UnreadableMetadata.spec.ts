import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach
} from "vitest";
import { Project } from "./Project";
import {
  exportablePersons,
  exportableSessions,
  findPersonToExport
} from "./exportableFolders";
import { Session } from "./Session/Session";
import { Person } from "./Person/Person";
import { makeCsvForPeople, makeCsvForSessions } from "../../export/CsvExporter";
import ImdiBundler from "../../export/ImdiBundler";
import { getRoCrate } from "../../export/ROCrate/RoCrateExporter";
import { IMDIMode } from "../../export/ImdiGenerator";
import * as NotifyModule from "../../components/Notify";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

temp.track();

// One session, person or media .meta file that lameta cannot read (a truncated
// or zero-byte file from an interrupted cloud sync, a file saved in another
// encoding, a file from a newer lameta) must not keep the rest of the project
// from opening, and lameta must never write over it. Sentry LAMETA-2RM.
describe("a project with metadata files that lameta cannot read", () => {
  let projectDirectory: string;

  beforeAll(() => {
    setupLanguageFinderForTests();
  });
  beforeEach(() => {
    projectDirectory = Path.join(
      temp.mkdirSync("unreadableMetadata"),
      "Torture"
    );
    fs.mkdirSync(projectDirectory);
    fs.writeFileSync(
      Path.join(projectDirectory, "Torture.sprj"),
      `<?xml version="1.0" encoding="utf-8"?><Project><Title>Torture</Title></Project>`
    );
    writeSession("Good", `<Session><id type="string">Good</id></Session>`);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function writeSession(id: string, xml: string | Buffer) {
    const dir = Path.join(projectDirectory, "Sessions", id);
    fs.mkdirpSync(dir);
    fs.writeFileSync(Path.join(dir, id + ".session"), xml);
    return Path.join(dir, id + ".session");
  }
  function writePerson(name: string, xml: string) {
    const dir = Path.join(projectDirectory, "People", name);
    fs.mkdirpSync(dir);
    fs.writeFileSync(Path.join(dir, name + ".person"), xml);
    return Path.join(dir, name + ".person");
  }
  function open(): Project {
    const project = Project.fromDirectory(projectDirectory);
    expect(project.loadingError).toBeUndefined();
    return project;
  }
  function sessionInFolder(project: Project, folderName: string): Session {
    const dir = Path.join(projectDirectory, "Sessions", folderName);
    const s = (project.sessions.items as Session[]).find(
      (s) => s.directory === dir
    );
    expect(s, `session in ${folderName}`).toBeDefined();
    return s!;
  }

  const unreadableSessions: [string, string | Buffer][] = [
    ["zero byte", ""],
    [
      "truncated",
      `<?xml version="1.0"?><Session><title type="string">unterminated`
    ],
    ["UTF-16", Buffer.from("﻿<Session><id>Utf16</id></Session>", "utf16le")]
  ];
  for (const [what, xml] of unreadableSessions) {
    it(`opens with a ${what} .session, lists it with the reason, and never writes over it`, () => {
      const path = writeSession("Broken", xml);
      const before = fs.readFileSync(path);

      const project = open();

      expect(sessionInFolder(project, "Good").id).toBe("Good");
      const broken = sessionInFolder(project, "Broken");
      expect(broken.metadataFile!.metadataReadProblem).toBeTruthy();
      broken.saveAllFilesInFolder();
      project.saveAllFilesInFolder();
      expect(fs.readFileSync(path)).toEqual(before);
    });
  }

  it("opens with an unreadable .session when loaded asynchronously", async () => {
    writeSession("Broken", "");

    const project = await Project.fromDirectoryAsync(projectDirectory);

    expect(project.loadingError).toBeUndefined();
    expect(
      sessionInFolder(project, "Broken").metadataFile!.metadataReadProblem
    ).toBeTruthy();
    expect(sessionInFolder(project, "Good").id).toBe("Good");
  });

  it("names the version that a file from a newer lameta needs", () => {
    writeSession(
      "Future",
      `<Session minimum_lameta_version_to_read="99.0.0"><id type="string">Future</id></Session>`
    );

    const project = open();

    expect(
      sessionInFolder(project, "Future").metadataFile!.metadataReadProblem
    ).toContain("99.0.0");
  });

  it("opens with an unreadable .person, lists it, and never writes over it", () => {
    const path = writePerson("Zero Byte", "");

    const project = open();

    const person = (project.persons.items as Person[]).find(
      (p) => p.directory === Path.dirname(path)
    );
    expect(person?.metadataFile!.metadataReadProblem).toBeTruthy();
    person!.saveAllFilesInFolder();
    project.saveAllFilesInFolder();
    expect(fs.readFileSync(path, "utf8")).toBe("");
  });

  it("opens with an unreadable .meta, keeps its media file in the list, and never writes over it", () => {
    const dir = Path.join(projectDirectory, "Sessions", "Good");
    fs.writeFileSync(Path.join(dir, "corrupt.wav"), "pretend audio");
    const metaPath = Path.join(dir, "corrupt.wav.meta");
    const corrupt = `<?xml version="1.0"?><MetaData><notes>unterminated`;
    fs.writeFileSync(metaPath, corrupt);

    const project = open();

    const file = sessionInFolder(project, "Good").files.find((f) =>
      f.pathInFolderToLinkFileOrLocalCopy.endsWith("corrupt.wav")
    );
    expect(file?.metadataReadProblem).toBeTruthy();
    sessionInFolder(project, "Good").saveAllFilesInFolder();
    project.saveAllFilesInFolder();
    expect(fs.readFileSync(metaPath, "utf8")).toBe(corrupt);
  });

  it("shows no notification while loading", () => {
    writeSession("Broken", "");
    writePerson("Broken Person", "");
    const spies = (
      ["NotifyException", "NotifyError", "NotifyWarning"] as const
    ).map((name) => vi.spyOn(NotifyModule, name).mockImplementation(() => {}));

    open();

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  describe("export", () => {
    function openWithBrokenSessionAndPerson(): Project {
      writeSession(
        "Uses Broken",
        `<Session><id type="string">Uses Broken</id><contributions><contributor><name>Broken Person</name><role>speaker</role></contributor><contributor><name>Good Person</name><role>speaker</role></contributor></contributions></Session>`
      );
      writeSession("Broken", "");
      writePerson(
        "Good Person",
        `<Person><name type="string">Good Person</name></Person>`
      );
      writePerson("Broken Person", "");
      return open();
    }

    it("leaves out sessions and people whose metadata file could not be read", () => {
      const project = openWithBrokenSessionAndPerson();

      expect(
        exportableSessions(project)
          .map((s) => s.id)
          .sort()
      ).toEqual(["Good", "Uses Broken"]);
      expect(
        exportablePersons(project).map((p) => p.getIdToUseForReferences())
      ).toEqual(["Good Person"]);
      expect(findPersonToExport(project, "Broken Person")).toBeUndefined();
      expect(findPersonToExport(project, "Good Person")).toBeDefined();
    });

    it("leaves them out of the IMDI export", async () => {
      const project = openWithBrokenSessionAndPerson();

      const generator = ImdiBundler.generateExportData(
        project,
        temp.mkdirSync("unreadableMetadataImdi"),
        IMDIMode.RAW_IMDI,
        false,
        () => true
      );
      const xml: string[] = [];
      for (let r = await generator.next(); ; r = await generator.next()) {
        xml.push(r.value.imdiXml);
        if (r.done) break;
      }
      const all = xml.join("\n");
      expect(all).toContain("<Name>Good</Name>");
      // IMDI names may not contain spaces
      expect(all).toMatch(/<Name>Uses.Broken<\/Name>/);
      expect(all).not.toContain("<Name>Broken</Name>");
      expect(all).toContain("Good Person");
    });

    it("leaves them out of the RO-Crate export", async () => {
      const project = openWithBrokenSessionAndPerson();

      const ids = JSON.stringify(await getRoCrate(project, project))
        .match(/"@id":"[^"]*"/g)!
        .join("\n");
      expect(ids).toContain("Sessions/Uses%20Broken/");
      expect(ids).not.toContain("Sessions/Broken/");
      expect(ids).toContain("People/Good%20Person/");
      expect(ids).not.toContain("People/Broken%20Person/");
    });

    it("leaves them out of the CSV export", () => {
      const project = openWithBrokenSessionAndPerson();

      const sessionsCsv = makeCsvForSessions(project, () => true);
      expect(sessionsCsv).toContain("Uses Broken");
      expect(sessionsCsv).not.toMatch(/(^|\n)Broken,/);
      const peopleCsv = makeCsvForPeople(project);
      expect(peopleCsv).toContain("Good Person");
      expect(peopleCsv).not.toContain("Broken Person");
    });
  });
});
