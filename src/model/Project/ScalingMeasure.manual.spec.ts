// Measures how much work each user action does in projects made by
// sample-data-generator/torture at several sizes, and how long it takes. Skipped unless
// LAMETA_SCALING_DIRS lists the project folders, separated by ";". Writes a JSON report to
// LAMETA_SCALING_OUT (default: scaling-report.json in a temp folder) and prints a table.
// To look like an old laptop, run it with scripts/measure-scaling-throttled.ps1, which caps the CPU.
//
//   $env:LAMETA_SCALING_DIRS="D:\perf-projects\elar-10;D:\perf-projects\elar-1000"
//   vp test run src/model/Project/ScalingMeasure.manual.spec.ts --maxWorkers=1

import { describe, it, vi } from "vitest";
import fs from "fs";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "./Project";
import { Session } from "./Session/Session";
import { File } from "../file/File";
import { FieldSet } from "../field/FieldSet";
import { FolderSearchTermsIndex } from "../Folder/FolderSearchTermsIndex";
import ImdiGenerator, { IMDIMode } from "../../export/ImdiGenerator";
import { ProjectProblems } from "../../problems/ProjectProblems";
import { RulesFileProblems } from "../../problems/RulesFileProblems";
import {
  IRulesSandboxInput,
  IRulesSandboxOutput,
  rulesSandboxMain,
} from "../../problems/rulesSandboxMain";
import { makeLametaSourceReader } from "../../export/lametaSourceComment";
import { findBuiltInRulesFile } from "../../problems/rulesFile";
import { checkProjectFields } from "../../problems/fieldRules";
import { checkProjectFolders } from "../../problems/lametaChecks";

mobx.configure({ enforceActions: "never" });

const dirs = (process.env.LAMETA_SCALING_DIRS ?? "").split(";").filter((d) => d.trim());
const kRepeats = 3;

interface Measurement {
  action: string;
  count?: number;
  unit?: string;
  ms: number[];
}

// Notes each step and the heap before it in LAMETA_SCALING_PROGRESS, so that a run that
// dies shows how far it got
function progress(step: string) {
  const file = process.env.LAMETA_SCALING_PROGRESS;
  if (!file) return;
  const heapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  fs.appendFileSync(file, `${new Date().toISOString()} heap ${heapMB} MB: ${step}\n`);
}

// runs `action` kRepeats times; the count is that of the first run
function measure(
  results: Measurement[],
  action: string,
  unit: string | undefined,
  run: () => number | void,
  repeats = kRepeats,
) {
  const ms: number[] = [];
  let count: number | undefined;
  progress(action);
  for (let i = 0; i < repeats; i++) {
    const start = performance.now();
    const c = run();
    ms.push(performance.now() - start);
    if (i === 0 && typeof c === "number") count = c;
  }
  results.push({ action, count, unit, ms });
}

function calls<T extends object>(owner: T, method: keyof T, action: () => void): number {
  const spy = vi.spyOn(owner, method as any);
  try {
    action();
    return spy.mock.calls.length;
  } finally {
    spy.mockRestore();
  }
}

// vitest cannot import a data: URL, which is how the sandbox loads a rules file; the
// measured projects are all under ELAR, so load ELAR's rules directly
const loadElarRules = async () => await import("../../../archive-configurations/ELAR/rules.js");

// Runs the ELAR rules as the sandbox would. LAMETA_SCALING_NO_RULES=1 leaves them out, for
// projects too large for this process to hold every session's Document (finding 13).
async function checkWithElarRules(input: IRulesSandboxInput): Promise<IRulesSandboxOutput> {
  if (process.env.LAMETA_SCALING_NO_RULES === "1")
    return { problems: [], errors: [], milliseconds: 0 };
  return rulesSandboxMain(input, makeLametaSourceReader, loadElarRules);
}

// a writable copy, so that saving and renaming do not change the measured project
function copyOf(dir: string): string {
  const copy = Path.join(temp.mkdirSync("scaling measure"), Path.basename(dir));
  fs.cpSync(dir, copy, { recursive: true });
  return copy;
}

describe.skipIf(dirs.length === 0)("scaling measurements", () => {
  it("measures every action at every size", async () => {
    const report: Record<string, { sessions: number; people: number; results: Measurement[] }> = {};
    for (const source of dirs) {
      const dir = copyOf(source);
      const results: Measurement[] = [];
      let project!: Project;
      measure(
        results,
        "open (sync load)",
        "metadata reads",
        () =>
          calls(File.prototype, "readMetadataFile", () => (project = Project.fromDirectory(dir))),
        2,
      );
      // what the open project holds, with the previous opening collected if gc is exposed
      (globalThis as any).gc?.();
      results.push({
        action: "heap used after opening",
        count: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        unit: "MB",
        ms: [],
      });
      const sessions = project.sessions.items as Session[];
      const sessionCount = sessions.length;
      const target = sessions[Math.floor(sessions.length / 2)];

      measure(results, "select a session", "metadata reads", () =>
        calls(File.prototype, "readMetadataFile", () => {
          project.sessions.selectedIndex = (project.sessions.selectedIndex + 1) % sessions.length;
        }),
      );
      let k = 0;
      measure(results, "keystroke (no search yet)", "getXml", () =>
        calls(File.prototype, "getXml", () => target.properties.setText("title", `t${k++}`)),
      );
      measure(results, "save the edited session", "getXml", () => {
        target.properties.setText("title", `t${k++}`);
        return calls(File.prototype, "getXml", () => target.saveAllFilesInFolder());
      });
      measure(results, "save project, nothing changed (tab switch, blur)", "existsSync", () =>
        calls(fs, "existsSync", () => project.saveAllFilesInFolder()),
      );
      measure(
        results,
        "first search of the session list",
        "folders indexed",
        () =>
          calls(FolderSearchTermsIndex.prototype as any, "makeBlob", () =>
            project.sessions.filter("studio"),
          ),
        1,
      );
      measure(results, "next search keystroke", "folders indexed", () =>
        calls(FolderSearchTermsIndex.prototype as any, "makeBlob", () =>
          project.sessions.filter(k++ % 2 ? "studi" : "studio"),
        ),
      );
      measure(results, "keystroke after a search", "folders indexed", () =>
        calls(FolderSearchTermsIndex.prototype as any, "makeBlob", () =>
          target.properties.setText("title", `t${k++}`),
        ),
      );
      project.sessions.filter("");
      measure(
        results,
        "first search of the people list",
        "folders indexed",
        () =>
          calls(FolderSearchTermsIndex.prototype as any, "makeBlob", () =>
            project.persons.filter("studio"),
          ),
        1,
      );
      measure(results, "keystroke in a person after a search", "folders indexed", () =>
        calls(FolderSearchTermsIndex.prototype as any, "makeBlob", () =>
          project.persons.items[0].properties.setText("description", `d${k++}`),
        ),
      );
      project.persons.filter("");

      let fieldProblemCount = 0;
      measure(results, "field and lameta checks (one recheck)", "FieldSet.values", () =>
        calls(FieldSet.prototype, "values", () => {
          fieldProblemCount = [...checkProjectFields(project), ...checkProjectFolders(project)]
            .length;
        }),
      );
      results.push({ action: "field and lameta problems found", count: fieldProblemCount, ms: [] });

      // the IMDI that the background check holds and sends to the sandbox, and what
      // checking it costs, before the background check does both at once
      progress("generate every session's IMDI");
      const generateStart = performance.now();
      const imdi = (project.sessions.items as Session[]).map((s) => ({
        sessionId: s.id,
        xml: ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, s, project),
      }));
      results.push({
        action: "generate every session's IMDI",
        count: Math.round(imdi.reduce((n, s) => n + s.xml.length, 0) / 1024 / 1024),
        unit: "MB of IMDI",
        ms: [performance.now() - generateStart],
      });
      progress("run the ELAR rules once on every session");
      const rulesStart = performance.now();
      const once = await checkWithElarRules({
        rulesSource: fs.readFileSync(findBuiltInRulesFile("ELAR")!, "utf8"),
        sessions: imdi,
        corpusXml: undefined,
        metadataLanguages: [],
        maxProblems: 2000,
      });
      results.push({
        action: "run the ELAR rules once on every session",
        count: once.problems.length,
        unit: "problems",
        ms: [performance.now() - rulesStart],
      });
      imdi.length = 0;
      progress("after the ELAR rules");

      // the background check, with the ELAR rules run in this process as the sandbox would
      // only the timers: a faked performance.now() would make every time 0
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      let sent = 0;
      const runner = new RulesFileProblems(async (input) => {
        sent = input.sessions.length;
        return {
          value: await checkWithElarRules(input),
        };
      });
      const watcher = new ProjectProblems();
      let stopRules = () => {};
      let stopFields = () => {};
      progress("first background check");
      const start = performance.now();
      stopFields = watcher.watch(project);
      stopRules = runner.watch(project);
      await vi.advanceTimersByTimeAsync(10);
      results.push({
        action: "first background check (fields + ELAR rules)",
        count: runner.problems.length,
        unit: "rules problems",
        ms: [performance.now() - start],
      });
      results.push({
        action: "  of which: generating IMDI (main thread)",
        count: runner.timing.sessionsGenerated,
        unit: "sessions generated",
        ms: [runner.timing.generateMilliseconds],
      });
      results.push({
        action: "  of which: running the rules (sandbox)",
        count: sent,
        unit: "sessions sent",
        ms: [runner.timing.sandboxMilliseconds],
      });
      const recheck: number[] = [];
      const generated: number[] = [];
      for (let i = 0; i < 3; i++) {
        progress(`background recheck ${i}`);
        target.properties.setText("title", `r${k++}`);
        await vi.advanceTimersByTimeAsync(2000);
        recheck.push(runner.timing.generateMilliseconds + runner.timing.sandboxMilliseconds);
        generated.push(runner.timing.sessionsGenerated);
      }
      results.push({
        action: "background recheck after one edit (generate + rules)",
        count: sent,
        unit: `sessions sent (generated ${generated.join(",")})`,
        ms: recheck,
      });
      results.push({
        action: "  field check after the same edit",
        ms: [watcher.checkMilliseconds],
      });
      stopRules();
      stopFields();
      vi.useRealTimers();

      measure(
        results,
        "export dialog: checkProject",
        "sessions generated",
        () => calls(ImdiGenerator, "generateSession", () => checkProjectNowSync(project)),
        3,
      );

      measure(results, "add a session", undefined, () => void project.addSession(), 3);

      report[Path.basename(source)] = {
        sessions: sessionCount,
        people: project.persons.items.length,
        results,
      };
    }
    const out =
      process.env.LAMETA_SCALING_OUT ??
      Path.join(temp.mkdirSync("scaling report"), "scaling-report.json");
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`Wrote ${out}`);
    console.log(table(report));
  }, 3_600_000);
});

// the synchronous part of checkProject(): what runs before the export dialog shows
function checkProjectNowSync(project: Project) {
  checkProjectFields(project);
  checkProjectFolders(project);
  for (const s of project.sessions.items as Session[])
    ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, s, project);
}

function table(report: Record<string, { results: Measurement[] }>): string {
  const sizes = Object.keys(report);
  const actions = report[sizes[0]].results.map((r) => r.action);
  const cell = (m?: Measurement) => {
    if (!m) return "";
    const sorted = [...m.ms].sort((a, b) => a - b);
    const time = sorted.length
      ? sorted.length > 1
        ? `${sorted[0].toFixed(1)}-${sorted[sorted.length - 1].toFixed(1)} ms`
        : `${sorted[0].toFixed(1)} ms`
      : "";
    return [m.count !== undefined ? `${m.count}` : "", time].filter(Boolean).join(" / ");
  };
  let s = `| action | unit | ${sizes.join(" | ")} |\n|---|---|${sizes.map(() => "---").join("|")}|\n`;
  for (const a of actions) {
    const unit = report[sizes[0]].results.find((r) => r.action === a)?.unit ?? "";
    s += `| ${a} | ${unit} | ${sizes
      .map((z) => cell(report[z].results.find((r) => r.action === a)))
      .join(" | ")} |\n`;
  }
  return s;
}
