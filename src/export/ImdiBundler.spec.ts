import { describe, it, beforeAll, expect, afterAll } from "vite-plus/test";
import * as temp from "temp";
import { Project } from "../model/Project/Project";
import ImdiBundler from "./ImdiBundler";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Session } from "../model/Project/Session/Session";
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
      // on Windows, the \\?\ form lets Node make a folder whose name ends in a dot
      const sessionDir =
        (process.platform === "win32" ? "\\\\?\\" : "") + Path.resolve(dir, "Sessions", folder);
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

describe("names that clash with a metadata file", () => {
  // A project with the given title, and a session for each folder, each with the given files
  function makeProject(title: string, sessions: Record<string, string[]>): Project {
    const dir = Path.join(temp.mkdirSync("lameta metadata clash"), "Clash");
    const sessionXml = fs.readFileSync(
      "sample data/Edolo sample/Sessions/ETR009/ETR009.session",
      "utf8",
    );
    for (const [folder, files] of Object.entries(sessions)) {
      const sessionDir = Path.join(dir, "Sessions", folder);
      fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(Path.join(sessionDir, folder + ".session"), sessionXml);
      for (const file of files) fs.writeFileSync(Path.join(sessionDir, file), "file " + file);
    }
    const project = Project.fromDirectory(dir);
    project.properties.setText("name", "");
    project.properties.setText("title", title);
    return project;
  }

  // exports the project as the app does, and returns what it wrote
  async function exportProject(project: Project, mode: IMDIMode) {
    const target = temp.mkdirSync("lameta metadata clash output");
    const generator = ImdiBundler.generateExportData(project, target, mode, true, () => true);
    const writer = new MainProcessImdiExport(() => null);
    const sessions: ExportSessionData[] = [];
    let result = await generator.next();
    while (!result.done) {
      const data = result.value as ExportSessionData;
      expect((await writer.writeImdiSessionData(data)).errors, data.imdiPath).toEqual([]);
      sessions.push(data);
      result = await generator.next();
    }
    await writer.writeImdiCorpusData(result.value);
    return sessions;
  }

  // "Tape 1" exports as "Tape_1_2", the name of its OPEX file's folder, so its OPEX file
  // would be "Tape_1_2.opex", the name of one of its files
  it("in OPEX mode, does not copy a file over its session's OPEX file", async () => {
    const project = makeProject("Clash", { "Tape 1": ["Tape_1_2.opex"], Tape_1: [] });
    const sessions = await exportProject(project, IMDIMode.OPEX);
    const tape1 = sessions.find((s) => s.imdiPath.endsWith("Tape_1_2.opex"))!;
    expect(fs.readFileSync(tape1.imdiPath, "utf8")).toBe(tape1.imdiXml);
    expect(tape1.filesToCopy.length).toBe(1);
    const copy = tape1.filesToCopy[0].destination;
    expect(copy).not.toBe(tape1.imdiPath);
    expect(fs.readFileSync(copy, "utf8")).toBe("file Tape_1_2.opex");
    expect(tape1.imdiXml).toContain(Path.basename(copy));
  });

  // The corpus takes "Tape_1", so "Tape 1" would export as "Tape_1_2", whose IMDI file
  // "Tape_1_2.imdi" would be the folder of the session "Tape_1_2.imdi"
  it("in IMDI mode, does not name a session's IMDI file like another session's folder", async () => {
    const project = makeProject("Tape_1", { "Tape 1": [], "Tape_1_2.imdi": [] });
    const sessions = await exportProject(project, IMDIMode.RAW_IMDI);
    const documentFolders = ["OtherDocuments", "DescriptionDocuments", "ConsentDocuments"];
    const sessionData = sessions.filter((s) => !documentFolders.includes(s.sessionId));
    expect(sessionData.map((s) => Path.basename(s.imdiPath)).sort()).toEqual([
      "Tape_1_2.imdi.imdi",
      "Tape_1_3.imdi",
    ]);
    for (const data of sessionData) {
      expect(fs.readFileSync(data.imdiPath, "utf8")).toBe(data.imdiXml);
    }
  });
});

describe("consent files of the same name", () => {
  it("copies the consent file of each person, and links the IMDI to each copy", async () => {
    const dir = Path.join(temp.mkdirSync("lameta same consent"), "Same Consent");
    const edolo = "sample data/Edolo sample";
    const sessionDir = Path.join(dir, "Sessions", "ETR009");
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.copyFileSync(
      `${edolo}/Sessions/ETR009/ETR009.session`,
      Path.join(sessionDir, "ETR009.session"),
    );
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
    for (const person of ["Awi_Heole", "Ilawi_Amosa"]) {
      const personDir = Path.join(dir, "People", person);
      fs.mkdirSync(personDir, { recursive: true });
      fs.copyFileSync(
        `${edolo}/People/${person}/${person}.person`,
        Path.join(personDir, `${person}.person`),
      );
      fs.writeFileSync(Path.join(personDir, "Consent.jpg"), "consent of " + person);
    }
    const project = Project.fromDirectory(dir);
    const target = temp.mkdirSync("lameta same consent output");
    const generator = ImdiBundler.generateExportData(
      project,
      target,
      IMDIMode.RAW_IMDI,
      true,
      () => true,
    );
    const writer = new MainProcessImdiExport(() => null);
    let consent: ExportSessionData | undefined;
    let result = await generator.next();
    while (!result.done) {
      const data = result.value as ExportSessionData;
      expect((await writer.writeImdiSessionData(data)).errors).toEqual([]);
      if (data.sessionId === "ConsentDocuments") consent = data;
      result = await generator.next();
    }

    const destinations = consent!.filesToCopy.map((f) => f.destination);
    expect(destinations.length).toBe(2);
    expect(destinations.map((d) => fs.readFileSync(d, "utf8")).sort()).toEqual([
      "consent of Awi_Heole",
      "consent of Ilawi_Amosa",
    ]);
    const resourceLinks = links(consent!.imdiXml, "ResourceLink").filter((l) => l);
    expect(resourceLinks.length).toBe(2);
    for (const link of resourceLinks) {
      expect(destinations).toContain(Path.join(Path.dirname(consent!.imdiPath), link));
    }
  });
});

describe("what export writes to disk", () => {
  // The lameta-source and lameta-translations comments lead a problem in the IMDI back
  // to its field. The checks and the IMDI view need them; a deposit does not.
  it.each([
    ["IMDI", IMDIMode.RAW_IMDI],
    ["OPEX", IMDIMode.OPEX],
  ])("in %s mode, has no lameta-source or lameta-translations comments", async (_, mode) => {
    const dir = Path.join(temp.mkdirSync("lameta deposit"), "Edolo sample");
    fs.cpSync("sample data/Edolo sample", dir, { recursive: true });
    const project = Project.fromDirectory(dir);
    const target = temp.mkdirSync("lameta deposit output");
    const generator = ImdiBundler.generateExportData(project, target, mode, false, () => true);
    // write it as the app does
    const writer = new MainProcessImdiExport(() => null);
    let result = await generator.next();
    while (!result.done) {
      await writer.writeImdiSessionData(result.value as ExportSessionData);
      result = await generator.next();
    }
    await writer.writeImdiCorpusData(result.value);

    const written = (fs.readdirSync(target, { recursive: true }) as string[])
      .filter((f) => /\.(imdi|opex)$/.test(f))
      .map((f) => fs.readFileSync(Path.join(target, f), "utf8"));
    expect(written.length).toBeGreaterThan(2);
    for (const xml of written) {
      expect(xml).not.toMatch(/lameta-source|lameta-translations/);
    }
    // the same project's IMDI for the checks has them
    const forChecks = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      project.sessions.items[0] as Session,
      project,
    );
    expect(forChecks).toMatch(/lameta-source/);
  });
});
