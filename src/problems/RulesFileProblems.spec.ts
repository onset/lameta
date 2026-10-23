import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { Contribution } from "../model/file/File";
import { makeLametaSourceReader } from "../export/lametaSourceComment";
import { RulesFileProblems } from "./RulesFileProblems";
import ImdiGenerator from "../export/ImdiGenerator";
import { rulesSandboxMain } from "./rulesSandboxMain";

mobx.configure({ enforceActions: "never" });
temp.track();

// vitest cannot import a data: URL, which is how the sandbox loads a rules file
async function loadWithoutImport(source: string) {
  const names = [
    ...source.matchAll(/export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g),
  ].map((m) => m[1]);
  return new Function(
    source.replace(/export\s+(?=const|let|var|function|class)/g, "") +
      `\nreturn { ${names.join(", ")} };`,
  )();
}

// `etr010Xml`: the contents of ETR010.session, if not a copy of ETR009's
function loadEdoloUnderElarWithTwoSessions(etr010Xml?: string): Project {
  const dir = Path.join(temp.mkdirSync("rules runner"), "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  fs.mkdirSync(Path.join(dir, "Sessions", "ETR010"));
  const etr010 = Path.join(dir, "Sessions", "ETR010", "ETR010.session");
  if (etr010Xml === undefined) {
    fs.copyFileSync(Path.join(dir, "Sessions", "ETR009", "ETR009.session"), etr010);
  } else {
    fs.writeFileSync(etr010, etr010Xml);
  }
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
  return Project.fromDirectory(dir);
}

function makeRunnerThatReportsEachSession() {
  const rulesPath = Path.join(temp.mkdirSync("rules"), "rules.js");
  fs.writeFileSync(
    rulesPath,
    `export const interfaceVersion = 1;
     export const format = "imdi";
     export function checkSession(doc, report) { report({ id: "seen", message: "seen" }); }`,
  );
  return new RulesFileProblems(
    async (input) => ({
      value: await rulesSandboxMain(input, makeLametaSourceReader, loadWithoutImport),
    }),
    () => rulesPath,
  );
}

describe("RulesFileProblems", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("checks generated IMDI and generates again only the session that changed", async () => {
    vi.useFakeTimers();
    const project = loadEdoloUnderElarWithTwoSessions();
    const rulesPath = Path.join(temp.mkdirSync("rules"), "rules.js");
    fs.writeFileSync(
      rulesPath,
      `export const interfaceVersion = 1;
       export const format = "imdi";
       export function checkSession(doc, report) {
         const title = doc.querySelector("Session > Title");
         report({ id: "title", message: "Title is " + title.textContent, node: title });
       }`,
    );
    const findRulesFile = () => rulesPath;
    const runner = new RulesFileProblems(
      async (input) => ({
        value: await rulesSandboxMain(input, makeLametaSourceReader, loadWithoutImport),
      }),
      findRulesFile,
    );
    const stop = runner.watch(project);
    await vi.advanceTimersByTimeAsync(10);

    expect(runner.errors).toEqual([]);
    expect(runner.timing.sessionsGenerated).toBe(2);
    expect(runner.problems.map((p) => [p.sessionId, p.message])).toEqual([
      ["ETR009", "Title is The story behind how we catch fish with poison bark"],
      ["ETR010", "Title is The story behind how we catch fish with poison bark"],
    ]);
    expect(runner.problems[1].target).toEqual({
      folderType: "session",
      folderId: "ETR010",
      fieldKey: "title",
    });

    const etr010 = project.sessions.items[1] as Session;
    etr010.properties.setText("title", "Changed");
    // nothing runs until the user pauses
    await vi.advanceTimersByTimeAsync(1000);
    expect(runner.problems[1].message).not.toBe("Title is Changed");
    await vi.advanceTimersByTimeAsync(1000);
    expect(runner.problems[1].message).toBe("Title is Changed");
    expect(runner.timing.sessionsGenerated).toBe(1);

    stop();
  });

  it("generates again only the session whose language changed, unless an unlisted language's code changes", async () => {
    vi.useFakeTimers();
    const project = loadEdoloUnderElarWithTwoSessions();
    const rulesPath = Path.join(temp.mkdirSync("rules"), "rules.js");
    fs.writeFileSync(rulesPath, "export const interfaceVersion = 1;");
    const findRulesFile = () => rulesPath;
    const runner = new RulesFileProblems(
      async () => ({
        value: { problems: [], errors: [], milliseconds: 0 },
      }),
      findRulesFile,
    );
    const stop = runner.watch(project);
    await vi.advanceTimersByTimeAsync(10);
    expect(runner.timing.sessionsGenerated).toBe(2);

    const [etr009, etr010] = project.sessions.items as Session[];
    etr010.properties.setText("languages", "etr;tpi");
    await vi.advanceTimersByTimeAsync(2000);
    expect(runner.timing.sessionsGenerated).toBe(1);

    // the first unlisted language takes qaa
    etr010.properties.setText("languages", "qaa-x-zebra:Zebra");
    await vi.advanceTimersByTimeAsync(2000);
    // Tolo sorts before Zebra, so Zebra's code changes, and ETR010 is generated again
    etr009.properties.setText("languages", "qaa-x-tolo:Tolo");
    await vi.advanceTimersByTimeAsync(2000);
    expect(runner.timing.sessionsGenerated).toBe(2);
    stop();
  });

  it("reports a rules file it cannot read", async () => {
    vi.useFakeTimers();
    const project = loadEdoloUnderElarWithTwoSessions();
    const findRulesFile = () => "c:/no/such/rules.js";
    const runner = new RulesFileProblems(async () => ({ value: undefined }), findRulesFile);
    const stop = runner.watch(project);
    await vi.advanceTimersByTimeAsync(10);
    expect(runner.errors.map((e) => e.kind)).toEqual(["load"]);
    stop();
  });

  it("reports a timeout", async () => {
    vi.useFakeTimers();
    const project = loadEdoloUnderElarWithTwoSessions();
    const rulesPath = Path.join(temp.mkdirSync("rules"), "rules.js");
    fs.writeFileSync(rulesPath, "export const interfaceVersion = 1;");
    const findRulesFile = () => rulesPath;
    const runner = new RulesFileProblems(async () => ({ timedOut: true }), findRulesFile);
    const stop = runner.watch(project);
    await vi.advanceTimersByTimeAsync(10);
    expect(runner.errors.map((e) => e.kind)).toEqual(["timeout"]);
    stop();
  });

  it("drops the last run's problems when a run fails", async () => {
    vi.useFakeTimers();
    const project = loadEdoloUnderElarWithTwoSessions();
    const rulesPath = Path.join(temp.mkdirSync("rules"), "rules.js");
    fs.writeFileSync(
      rulesPath,
      `export const interfaceVersion = 1;
       export const format = "imdi";
       export function checkCorpus(doc, report) { report({ id: "a", message: "a" }); }`,
    );
    const findRulesFile = () => rulesPath;
    let fail = false;
    const runner = new RulesFileProblems(async (input) => {
      if (fail) throw new Error("the sandbox is gone");
      return {
        value: await rulesSandboxMain(input, makeLametaSourceReader, loadWithoutImport),
      };
    }, findRulesFile);
    const stop = runner.watch(project);
    await vi.advanceTimersByTimeAsync(10);
    expect(runner.problems.map((p) => p.checkId)).toEqual(["a"]);

    fail = true;
    (project.sessions.items[0] as Session).properties.setText("title", "x");
    await vi.advanceTimersByTimeAsync(2000);
    expect(runner.problems).toEqual([]);
    expect(runner.errors.map((e) => e.kind)).toEqual(["load"]);
    // and the export's check reports it too
    expect((await runner.checkNow(project)).errors.map((e) => e.kind)).toEqual(["load"]);
    stop();
  });
  describe("a session whose .session lameta cannot read", () => {
    it("is not checked, at export", async () => {
      const project = loadEdoloUnderElarWithTwoSessions("");
      const { problems, errors } = await makeRunnerThatReportsEachSession().checkNow(project);
      expect(problems.map((p) => p.sessionId)).toEqual(["ETR009"]);
      expect(errors).toEqual([]);
    });

    it("is not checked, in the background", async () => {
      vi.useFakeTimers();
      const project = loadEdoloUnderElarWithTwoSessions("");
      const runner = makeRunnerThatReportsEachSession();
      const stop = runner.watch(project);
      await vi.advanceTimersByTimeAsync(10);
      expect(runner.problems.map((p) => p.sessionId)).toEqual(["ETR009"]);
      stop();
    });
  });

  describe("when one session's IMDI cannot be generated", () => {
    function failToGenerateEtr010() {
      const generateSession = ImdiGenerator.generateSession;
      vi.spyOn(ImdiGenerator, "generateSession").mockImplementation((mode, session, project) => {
        if (session.id === "ETR010") throw new Error("cannot generate");
        return generateSession(mode, session, project);
      });
    }

    it("still checks the other sessions and names that one, at export", async () => {
      const project = loadEdoloUnderElarWithTwoSessions();
      failToGenerateEtr010();
      const { problems, errors } = await makeRunnerThatReportsEachSession().checkNow(project);
      expect(problems.map((p) => p.sessionId)).toEqual(["ETR009"]);
      expect(errors.map((e) => [e.kind, e.sessionId])).toEqual([["imdi", "ETR010"]]);
    });

    it("still checks the other sessions and names that one, in the background", async () => {
      vi.useFakeTimers();
      const project = loadEdoloUnderElarWithTwoSessions();
      failToGenerateEtr010();
      const runner = makeRunnerThatReportsEachSession();
      const stop = runner.watch(project);
      await vi.advanceTimersByTimeAsync(10);
      expect(runner.problems.map((p) => p.sessionId)).toEqual(["ETR009"]);
      expect(runner.errors.map((e) => [e.kind, e.sessionId])).toEqual([["imdi", "ETR010"]]);
      stop();
    });
  });

  // A finding goes where the IMDI element's nearest lameta-source comment says. An
  // element without one of its own takes its parent's, which is the session or the
  // file with no field, and a click then opens the wrong tab.
  it("points each of ELAR's findings at the file and field that it is about", async () => {
    const project = loadEdoloUnderElarWithTwoSessions();
    project.properties.setText("metadataLanguages", "en;es");
    const [etr009, etr010] = project.sessions.items as Session[];
    etr009.properties.setText("genre", "weird stuff");
    etr009.properties.setText("access", "S");
    etr009.properties.setText("accessDescription", "asked");
    etr009.metadataFile!.contributions.push(new Contribution("Ilawi Amosa", "", ""));
    // a role that has no translation
    etr009.metadataFile!.contributions.push(new Contribution("Awi Heole", "dancer", ""));
    const mp3 = etr009.files.find((f) => f.getTextProperty("filename") === "ETR009_Careful.mp3")!;
    mp3.contributions.push(new Contribution("Awi Heole", "", ""));
    for (const file of etr010.files) file.contributions.splice(0);
    const runner = new RulesFileProblems(
      async (input) => ({
        value: await rulesSandboxMain(input, makeLametaSourceReader, loadWithoutImport),
      }),
      () => "archive-configurations/ELAR/rules.js",
    );

    const { problems, errors } = await runner.checkNow(project);
    expect(errors).toEqual([]);
    const targets = [
      ...new Set(problems.map((p) => JSON.stringify([p.checkId, p.subject, p.target]))),
    ].map((t) => JSON.parse(t));
    const etr009At = (fields: object) => ({ folderType: "session", folderId: "ETR009", ...fields });
    expect(targets).toEqual([
      ["checkMediaFiles/sessionId", "File name", etr009At({ fileName: "SceneAroundCamera.JPG" })],
      ["checkMediaFiles/sessionId", "File name", etr009At({ fileName: "SceneHouse.JPG" })],
      ["checkWrittenResources/dateStamp", "File name", etr009At({ fileName: "ETR009_AText.txt" })],
      [
        "checkWrittenResources/length",
        "File name",
        etr009At({ fileName: "ETR009_Tiny_StandardAudio.wav.annotations.eaf" }),
      ],
      [
        "checkWrittenResources/dateStamp",
        "File name",
        etr009At({ fileName: "ETR009_Tiny_StandardAudio.wav.annotations.eaf" }),
      ],
      [
        "checkWrittenResources/extension",
        "File format",
        etr009At({ fileName: "ETR009_XDoc.docx" }),
      ],
      ["checkWrittenResources/dateStamp", "File name", etr009At({ fileName: "ETR009_XDoc.docx" })],
      ["checkActorRole", "Ilawi Amosa", etr009At({ fieldKey: "contributions" })],
      // a missing translation of a vocabulary value goes to its row on the Translations tab
      [
        "checkActorRole/translation",
        "Awi Heole's role",
        { folderType: "project", vocabularyTranslation: { fieldKey: "role", value: "dancer" } },
      ],
      [
        "checkActorRole",
        "Awi Heole",
        etr009At({ fileName: "ETR009_Careful.mp3", fieldKey: "contributions" }),
      ],
      ["genreMapping", null, etr009At({ fieldKey: "genre" })],
      [
        "genreTranslation",
        "Genre",
        {
          folderType: "project",
          vocabularyTranslation: { fieldKey: "genre", value: "weird stuff" },
        },
      ],
      [
        "accessDescriptionTranslation",
        "Access Explanation",
        etr009At({ fieldKey: "accessDescription" }),
      ],
      ["checkForResources", "Session", { folderType: "session", folderId: "ETR010" }],
      [
        "checkForActors",
        "Session",
        { folderType: "session", folderId: "ETR010", fieldKey: "contributions" },
      ],
      ["checkCorpusFolderName", "Project name", { folderType: "project", fieldKey: "name" }],
    ]);
  });
});
