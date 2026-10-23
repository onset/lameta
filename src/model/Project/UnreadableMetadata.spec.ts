import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { Project } from "./Project";
import { exportablePersons, exportableSessions, findPersonToExport } from "./exportableFolders";
import { Session } from "./Session/Session";
import { Person } from "./Person/Person";
import { makeCsvForPeople, makeCsvForSessions } from "../../export/CsvExporter";
import ImdiBundler from "../../export/ImdiBundler";
import { getRoCrate } from "../../export/ROCrate/RoCrateExporter";
import { IMDIMode } from "../../export/ImdiGenerator";
import * as NotifyModule from "../../components/Notify";
import * as CloudFileStatusModule from "../../other/cloudFileStatus";

temp.track();

// One metadata file that lameta cannot read (a truncated or zero-byte file from an
// interrupted cloud sync, a file saved in another encoding, a file from a newer
// lameta) must not keep the rest of the project from opening, and lameta must
// never write over it.
describe("a project with metadata files that lameta cannot read", () => {
  let projectDirectory: string;

  beforeEach(() => {
    projectDirectory = Path.join(temp.mkdirSync("unreadableMetadata"), "Torture");
    fs.mkdirSync(projectDirectory);
    fs.writeFileSync(
      Path.join(projectDirectory, "Torture.sprj"),
      `<?xml version="1.0" encoding="utf-8"?><Project><Title>Torture</Title></Project>`,
    );
    writeSession("Good", `<Session><id type="string">Good</id></Session>`);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function writeSession(id: string, xml: string | Buffer, fileName = id + ".session") {
    const dir = Path.join(projectDirectory, "Sessions", id);
    fs.mkdirpSync(dir);
    fs.writeFileSync(Path.join(dir, fileName), xml);
    return Path.join(dir, fileName);
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
  function session(project: Project, id: string): Session {
    const s = (project.sessions.items as Session[]).find((s) => s.id === id);
    expect(s, `session ${id}`).toBeDefined();
    return s!;
  }

  const unreadableSessions: [string, string | Buffer][] = [
    ["zero byte", ""],
    ["truncated", `<?xml version="1.0"?><Session><title type="string">unterminated`],
    ["UTF-16", Buffer.from("﻿<Session><id>Utf16</id></Session>", "utf16le")],
  ];
  for (const [what, xml] of unreadableSessions) {
    it(`opens and lists a ${what} .session under its folder name, with the reason`, () => {
      const path = writeSession("Broken", xml);
      const before = fs.readFileSync(path);

      const project = open();

      expect(session(project, "Good")).toBeDefined();
      const broken = session(project, "Broken");
      expect(broken.metadataFile!.metadataReadProblem).toBeTruthy();
      broken.saveAllFilesInFolder();
      project.saveAllFilesInFolder();
      expect(fs.readFileSync(path)).toEqual(before);
    });
  }

  it("lists a session under its folder name when Retry downloads a file that it cannot read", () => {
    const dir = Path.join(projectDirectory, "Sessions", "Evicted");
    fs.mkdirpSync(dir);
    const sessionPath = Path.join(dir, "Evicted.session");
    // the cloud provider has evicted the file, so lameta leaves it unread until Retry
    const evicted = vi
      .spyOn(CloudFileStatusModule, "isMissingCloudPlaceholder")
      .mockImplementation((path) => path === sessionPath);
    const project = open();
    evicted.mockRestore();
    expect(
      (project.sessions.items as Session[]).find((s) => s.directory === dir)!.metadataFile!
        .cloudMetadataUnavailable,
    ).toBe(true);

    fs.writeFileSync(sessionPath, "");
    project.retryFailedCloudReads();

    expect(session(project, "Evicted").metadataFile!.metadataReadProblem).toBeTruthy();
  });

  it("opens with an unreadable .sprj and never writes over it", () => {
    const sprj = Path.join(projectDirectory, "Torture.sprj");
    fs.writeFileSync(sprj, "");

    const project = open();

    expect(project.metadataFile!.metadataReadProblem).toBeTruthy();
    expect(session(project, "Good")).toBeDefined();
    project.saveFolderMetaData();
    expect(fs.readFileSync(sprj, "utf8")).toBe("");
  });

  it("opens when the .sprj cannot be read at all", () => {
    const sprj = Path.join(projectDirectory, "Torture.sprj");
    fs.rmSync(sprj);
    fs.mkdirSync(sprj);

    const project = open();

    expect(project.metadataFile!.metadataReadProblem).toBeTruthy();
    expect(fs.statSync(sprj).isDirectory()).toBe(true);
  });

  it("names the version that a file from a newer lameta needs", () => {
    writeSession(
      "Future",
      `<Session minimum_lameta_version_to_read="99.0.0"><id type="string">Future</id></Session>`,
    );

    const project = open();

    expect(session(project, "Future").metadataFile!.metadataReadProblem).toContain("99.0.0");
  });

  it("opens with an unreadable .person and lists it under its folder name", () => {
    const path = writePerson("Zero Byte", "");

    const project = open();

    const person = (project.persons.items as Person[]).find((p) =>
      p.importIdMatchesThisFolder("Zero Byte"),
    );
    expect(person?.metadataFile!.metadataReadProblem).toBeTruthy();
    person!.saveAllFilesInFolder();
    expect(fs.readFileSync(path, "utf8")).toBe("");
  });

  it("opens with an unreadable .meta and keeps its media file in the list", () => {
    const dir = Path.join(projectDirectory, "Sessions", "Good");
    fs.writeFileSync(Path.join(dir, "corrupt.wav"), "pretend audio");
    const metaPath = Path.join(dir, "corrupt.wav.meta");
    const corrupt = `<?xml version="1.0"?><MetaData><notes>unterminated`;
    fs.writeFileSync(metaPath, corrupt);

    const project = open();

    const file = session(project, "Good").files.find((f) =>
      f.pathInFolderToLinkFileOrLocalCopy.endsWith("corrupt.wav"),
    );
    expect(file?.metadataReadProblem).toBeTruthy();
    project.saveAllFilesInFolder();
    session(project, "Good").saveAllFilesInFolder();
    expect(fs.readFileSync(metaPath, "utf8")).toBe(corrupt);
  });

  it("treats a sub folder named like a metadata file as a folder, not as the metadata file", () => {
    const dir = Path.join(projectDirectory, "Sessions", "Folder Named Session");
    fs.mkdirpSync(Path.join(dir, "notes.session"));

    const project = open();

    expect(fs.statSync(Path.join(dir, "notes.session")).isDirectory()).toBe(true);
    expect(
      (project.sessions.items as Session[]).some(
        (s) => s.directory === dir && !s.metadataFile!.metadataReadProblem,
      ),
    ).toBe(true);
  });

  it("shows no notification while loading", () => {
    writeSession("Broken", "");
    const spies = (["NotifyException", "NotifyError", "NotifyWarning"] as const).map((name) =>
      vi.spyOn(NotifyModule, name).mockImplementation(() => {}),
    );

    open();

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  describe("export", () => {
    function openWithBrokenSessionAndPerson(): Project {
      writeSession(
        "Uses Broken",
        `<Session><id type="string">Uses Broken</id><contributions><contributor><name>Broken Person</name><role>speaker</role></contributor><contributor><name>Good Person</name><role>speaker</role></contributor></contributions></Session>`,
      );
      writeSession("Broken", "");
      writePerson("Good Person", `<Person><name type="string">Good Person</name></Person>`);
      writePerson("Broken Person", "");
      return open();
    }

    it("leaves out sessions and people whose metadata file could not be read", () => {
      const project = openWithBrokenSessionAndPerson();

      expect(
        exportableSessions(project)
          .map((s) => s.id)
          .sort(),
      ).toEqual(["Good", "Uses Broken"]);
      expect(exportablePersons(project).map((p) => p.getIdToUseForReferences())).toEqual([
        "Good Person",
      ]);
      expect(findPersonToExport(project, "Broken Person")).toBeUndefined();
      expect(findPersonToExport(project, "Good Person")).toBeDefined();
      // the UI still lists and finds them
      expect(project.findPerson("Broken Person")).toBeDefined();
    });

    it("leaves them out of the IMDI export", async () => {
      const project = openWithBrokenSessionAndPerson();

      const generator = ImdiBundler.generateExportData(
        project,
        temp.mkdirSync("unreadableMetadataImdi"),
        IMDIMode.RAW_IMDI,
        false,
        () => true,
      );
      const xml: string[] = [];
      for (let r = await generator.next(); ; r = await generator.next()) {
        xml.push(r.value.imdiXml);
        if (r.done) break;
      }
      const all = xml.join("\n");
      expect(all).toContain("Uses Broken");
      expect(all).not.toMatch(/<Name>Broken<\/Name>/);
      // the contributor is exported as a person that lameta does not know
      expect(all).toContain('Could not find a person with name "Broken Person"');
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
      expect(sessionsCsv).not.toMatch(/^Broken,/m);
      const peopleCsv = makeCsvForPeople(project);
      expect(peopleCsv).toContain("Good Person");
      expect(peopleCsv).not.toContain("Broken Person");
    });
  });
});
