import { describe, it, beforeAll, expect, afterAll } from "vite-plus/test";
import * as temp from "temp";
import { Project } from "../model/Project/Project";
import ImdiBundler from "./ImdiBundler";
import { IMDIMode } from "./ImdiGenerator";
import fs from "fs";
import * as Path from "path";
import { ExportSessionData } from "./ExportBundleTypes";
import { sanitizeForArchive } from "../other/sanitizeForArchive";
import { MainProcessImdiExport } from "../mainProcess/MainProcessImdiExport";

let project: Project;
const projectDir = temp.mkdirSync("lameta imdi bundler test");
const projectName = sanitizeForArchive(Path.basename(projectDir), "ASCII");
const targetDir = temp.mkdirSync("lameta imdi bundler test output");
beforeAll(async () => {
  temp.track();
  project = Project.fromDirectory(projectDir);
  await project.descriptionFolder.addFileForTestAsync("test.txt");
  await project.otherDocsFolder.addFileForTestAsync("test.txt");
  project.addSession();
  try {
    await ImdiBundler.saveImdiBundleToFolder(
      project,
      targetDir,
      IMDIMode.OPEX,
      true,
      // oxlint-disable-next-line @typescript-eslint/no-unused-vars
      (f) => true,
    );
  } catch (e) {
    expect(e).toBeUndefined();
  }
});
afterAll(() => {
  temp.cleanupSync();
});

describe("opex file placement", () => {
  it("should have a project opex inside of the project folder", () => {
    const p = Path.join(targetDir, projectName, projectName + ".opex"); //?
    expect(fs.existsSync(p)).toBe(true);
  });
  /* this would just be too expensive to set up at this point
  
  it("should have a consent opex inside of the Consent folder", () => {
    const p = Path.join(
      targetDir,
      projectName,
      "ConsentDocuments",
      "ConsentDocuments.opex"
    ); //?
    expect(fs.existsSync(p)).toBe(true);
  });
  */
  it("should have a DescriptionDocuments opex inside of the Description folder", () => {
    const p = Path.join(
      targetDir,
      projectName,
      "DescriptionDocuments",
      "DescriptionDocuments.opex",
    );
    expect(fs.existsSync(p)).toBe(true);
  });
  it("should have a OtherDocuments opex inside of the OtherDocuments folder", () => {
    const p = Path.join(targetDir, projectName, "OtherDocuments", "OtherDocuments.opex");
    expect(fs.existsSync(p)).toBe(true);
  });
  it("should have a session opex inside of the session folder", () => {
    const p = Path.join(targetDir, projectName, "New_Session", "New_Session.opex");
    expect(fs.existsSync(p)).toBe(true);
  });

  it("should have a ConsentDocuments folder", () => {
    // console.log("targetDir: " + targetDir);
    // // list all the files and directories in targetDir directory to the console
    // fs.readdirSync(targetDir).forEach((file) => {
    //   console.log(" /" + file);
    // });
    // console.log("target/project ");
    // // list all the files and directories in targetDir directory to the console
    // fs.readdirSync(Path.join(targetDir, projectName)).forEach((file) => {
    //   console.log(" /" + file);
    // });

    const p = Path.join(targetDir, projectName, "ConsentDocuments");
    expect(fs.existsSync(p)).toBe(true);
  });
  it("should have an imdi file in the ConsentDocuments folder", () => {
    const p = Path.join(targetDir, projectName, "ConsentDocuments", "ConsentDocuments.opex");
    expect(fs.existsSync(p)).toBe(true);
  });
});

describe("generateExportData async generator", () => {
  let generatorProject: Project;
  let generatorProjectDir: string;
  let generatorTargetDir: string;

  beforeAll(async () => {
    generatorProjectDir = temp.mkdirSync("lameta generator test");
    generatorTargetDir = temp.mkdirSync("lameta generator test output");
    generatorProject = Project.fromDirectory(generatorProjectDir);
    await generatorProject.descriptionFolder.addFileForTestAsync("desc.txt");
    await generatorProject.otherDocsFolder.addFileForTestAsync("other.txt");
    generatorProject.addSession();
    generatorProject.addSession();
  });

  it("should yield ExportSessionData for each folder", async () => {
    const generator = ImdiBundler.generateExportData(
      generatorProject,
      generatorTargetDir,
      IMDIMode.OPEX,
      true,
      () => true,
    );

    const yieldedData: ExportSessionData[] = [];
    let result = await generator.next();
    while (!result.done) {
      yieldedData.push(result.value as ExportSessionData);
      result = await generator.next();
    }

    // Should yield: OtherDocuments, DescriptionDocuments, ConsentDocuments (may be empty), 2 sessions
    // At minimum we should get OtherDocuments and DescriptionDocuments
    expect(yieldedData.length).toBeGreaterThanOrEqual(2);

    // Check that each yielded data has required fields
    for (const data of yieldedData) {
      expect(data.displayName).toBeDefined();
      expect(data.imdiXml).toBeDefined();
      expect(data.imdiPath).toBeDefined();
      expect(data.directoriesToCreate).toBeInstanceOf(Array);
      expect(data.filesToCopy).toBeInstanceOf(Array);
    }

    // The final return value should be the corpus data
    expect(result.done).toBe(true);
    expect(result.value).toBeDefined();
    expect(result.value.imdiXml).toBeDefined();
    expect(result.value.imdiPath).toContain(".opex");
    expect(result.value.displayName).toBe(generatorProject.displayName);
  });

  it("should include file copy requests when copyInProjectFiles is true", async () => {
    const generator = ImdiBundler.generateExportData(
      generatorProject,
      generatorTargetDir,
      IMDIMode.OPEX,
      true,
      () => true,
    );

    let hasFilesToCopy = false;
    let result = await generator.next();
    while (!result.done) {
      const data = result.value as ExportSessionData;
      if (data.filesToCopy.length > 0) {
        hasFilesToCopy = true;
        // Check file copy request structure
        for (const copyReq of data.filesToCopy) {
          expect(copyReq.source).toBeDefined();
          expect(copyReq.destination).toBeDefined();
        }
      }
      result = await generator.next();
    }

    expect(hasFilesToCopy).toBe(true);
  });

  it("should not include file copy requests when copyInProjectFiles is false", async () => {
    const generator = ImdiBundler.generateExportData(
      generatorProject,
      generatorTargetDir,
      IMDIMode.OPEX,
      false, // copyInProjectFiles = false
      () => true,
    );

    let result = await generator.next();
    while (!result.done) {
      const data = result.value as ExportSessionData;
      expect(data.filesToCopy.length).toBe(0);
      result = await generator.next();
    }
  });

  it("should provide correct job info", () => {
    const jobInfo = ImdiBundler.getExportJobInfo(generatorProject, generatorTargetDir, () => true);

    expect(jobInfo.totalSessions).toBeGreaterThanOrEqual(2); // at least 2 sessions
    expect(jobInfo.rootDirectory).toBe(generatorTargetDir);
    expect(jobInfo.secondLevelDirectory).toBe(
      sanitizeForArchive(Path.basename(generatorProjectDir), "ASCII"),
    );
  });
});

// the text of each of the given elements in an IMDI document
const links = (xml: string, element: string) =>
  [...xml.matchAll(new RegExp(`<${element}[^>]*>([^<]*)</${element}>`, "g"))].map((m) => m[1]);

describe("names that Windows or the archive cannot take", () => {
  let hostileProject: Project;
  // "Tape 1" and "Tape_1" are different folders that sanitize to the same name
  const sessionFolders = [
    "COM1",
    "Trailing dot.",
    "Café".normalize("NFD"),
    "!!!",
    "Tape 1",
    "Tape_1",
  ];

  beforeAll(() => {
    const dir = Path.join(temp.mkdirSync("lameta hostile names"), "Hostile ŋ");
    fs.mkdirSync(dir);
    const sessionXml = fs.readFileSync(
      "sample data/Edolo sample/Sessions/ETR009/ETR009.session",
      "utf8",
    );
    for (const folder of sessionFolders) {
      // the \\?\ form lets Node make a folder whose name ends in a dot
      const sessionDir = "\\\\?\\" + Path.resolve(dir, "Sessions", folder);
      fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(Path.join(sessionDir, folder + ".session"), sessionXml);
      fs.writeFileSync(Path.join(sessionDir, "notes.txt"), "notes");
      // two files that sanitize to the same name
      fs.writeFileSync(Path.join(sessionDir, "a b.txt"), "a b in " + folder);
      fs.writeFileSync(Path.join(sessionDir, "a_b.txt"), "a_b in " + folder);
    }
    hostileProject = Project.fromDirectory(dir);
    hostileProject.properties.setText("title", "Interviews: Abstract Painters / 2024");
  });

  async function exportData(mode: IMDIMode) {
    const target = temp.mkdirSync("lameta hostile names output");
    const generator = ImdiBundler.generateExportData(
      hostileProject,
      target,
      mode,
      true,
      () => true,
    );
    const sessions: ExportSessionData[] = [];
    let result = await generator.next();
    while (!result.done) {
      sessions.push(result.value as ExportSessionData);
      result = await generator.next();
    }
    return { target, sessions, corpus: result.value };
  }

  function expectUsableNames(target: string, path: string) {
    for (const segment of Path.relative(target, path).split(Path.sep)) {
      expect(segment.length, path).toBeGreaterThan(0);
      expect(sanitizeForArchive(segment, "ASCII"), path).toBe(segment);
    }
  }

  it.each([
    ["IMDI", IMDIMode.RAW_IMDI],
    ["OPEX", IMDIMode.OPEX],
  ])(
    "in %s mode, writes every file under a name that Windows and the archive accept",
    async (_, mode) => {
      const { target, sessions, corpus } = await exportData(mode);
      expect(sessions.length).toBeGreaterThan(sessionFolders.length);
      for (const data of sessions) {
        expectUsableNames(target, data.imdiPath);
        data.directoriesToCreate.forEach((d) => expectUsableNames(target, d));
        data.filesToCopy.forEach((f) => expectUsableNames(target, f.destination));
      }
      expectUsableNames(target, corpus.imdiPath);
    },
  );

  it("links the corpus to each session's IMDI file, and each session to its files", async () => {
    const { sessions, corpus } = await exportData(IMDIMode.RAW_IMDI);
    const corpusLinks = links(corpus.imdiXml, "CorpusLink").map((l) =>
      Path.join(Path.dirname(corpus.imdiPath), l),
    );
    for (const data of sessions.filter((s) => s.imdiPath.endsWith(".imdi"))) {
      expect(corpusLinks).toContain(data.imdiPath);
      const destinations = data.filesToCopy.map((f) => f.destination);
      for (const link of links(data.imdiXml, "ResourceLink").filter((l) => l)) {
        expect(destinations).toContain(Path.join(Path.dirname(data.imdiPath), link));
      }
    }
  });

  it.each([
    ["IMDI", IMDIMode.RAW_IMDI],
    ["OPEX", IMDIMode.OPEX],
  ])("in %s mode, writes each session and each file to a place of its own", async (_, mode) => {
    const { sessions, corpus } = await exportData(mode);
    const writer = new MainProcessImdiExport(() => null);
    for (const data of sessions) {
      expect((await writer.writeImdiSessionData(data)).errors).toEqual([]);
    }
    await writer.writeImdiCorpusData(corpus);

    const written = [
      corpus.imdiPath,
      ...sessions.flatMap((s) => [s.imdiPath, ...s.filesToCopy.map((f) => f.destination)]),
    ];
    expect(new Set(written.map((p) => p.toLowerCase())).size).toBe(written.length);
    for (const path of written) expect(fs.existsSync(path), path).toBe(true);
    for (const data of sessions) {
      for (const copy of data.filesToCopy) {
        expect(fs.readFileSync(copy.destination, "utf8")).toBe(
          fs.readFileSync(copy.source, "utf8"),
        );
      }
    }
  });
});

describe("names that clash only after sanitizing", () => {
  // A project with sessions "Tape 1" and "Tape_1", whose files are contributed to by two
  // people with consent files "a b Consent.JPG" and "a_b Consent.JPG", and whose corpus
  // file would be named like the numbered session's file
  function makeProject(): Project {
    const dir = Path.join(temp.mkdirSync("lameta clashing names"), "Clash");
    const edolo = "sample data/Edolo sample";
    const sessionXml = fs.readFileSync(`${edolo}/Sessions/ETR009/ETR009.session`, "utf8");
    for (const folder of ["Tape 1", "Tape_1"]) {
      const sessionDir = Path.join(dir, "Sessions", folder);
      fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(Path.join(sessionDir, folder + ".session"), sessionXml);
      fs.writeFileSync(Path.join(sessionDir, "notes.txt"), "notes");
      fs.writeFileSync(
        Path.join(sessionDir, "notes.txt.meta"),
        `<?xml version="1.0" encoding="utf-8"?>
<MetaData>
  <contributions type="xml">
    <contributor><name>Awi Heole</name><role>speaker</role></contributor>
    <contributor><name>Ilawi Amosa</name><role>speaker</role></contributor>
  </contributions>
</MetaData>`,
      );
    }
    for (const [person, consent] of [
      ["Awi_Heole", "a b Consent.JPG"],
      ["Ilawi_Amosa", "a_b Consent.JPG"],
    ]) {
      const personDir = Path.join(dir, "People", person);
      fs.mkdirSync(personDir, { recursive: true });
      fs.copyFileSync(
        `${edolo}/People/${person}/${person}.person`,
        Path.join(personDir, `${person}.person`),
      );
      fs.writeFileSync(Path.join(personDir, consent), "consent of " + person);
    }
    const project = Project.fromDirectory(dir);
    project.properties.setText("name", "");
    project.properties.setText("title", "Tape_1_2");
    return project;
  }

  it("writes every session, consent file and corpus to a place of its own", async () => {
    const project = makeProject();
    const target = temp.mkdirSync("lameta clashing names output");
    const generator = ImdiBundler.generateExportData(
      project,
      target,
      IMDIMode.RAW_IMDI,
      true,
      () => true,
    );
    const sessions: ExportSessionData[] = [];
    let result = await generator.next();
    while (!result.done) {
      sessions.push(result.value as ExportSessionData);
      result = await generator.next();
    }
    const corpus = result.value;
    const consent = sessions.find((s) => s.sessionId === "ConsentDocuments")!;
    expect(consent.filesToCopy.length).toBe(2);

    const written = [corpus.imdiPath, ...sessions.map((s) => s.imdiPath)];
    expect(new Set(written.map((p) => p.toLowerCase())).size).toBe(written.length);

    const destinations = consent.filesToCopy.map((f) => f.destination);
    expect(new Set(destinations).size).toBe(2);
    for (const link of links(consent.imdiXml, "ResourceLink").filter((l) => l)) {
      expect(destinations).toContain(Path.join(Path.dirname(consent.imdiPath), link));
    }
  });
});
