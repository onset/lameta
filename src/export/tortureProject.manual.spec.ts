// Loads a project made by sample-data-generator/torture and runs every exporter over it,
// recording every exception and notification instead of stopping at the first. Skipped
// unless LAMETA_TORTURE_DIR names the project folder. Writes report.json and the export
// output to LAMETA_TORTURE_OUT (default: a temp folder).
// sample-data-generator/torture/compare-exports.ts runs this in two versions of lameta and
// compares what they wrote, so it uses only exporter functions that v3.0.21-beta also has.
//
//   $env:LAMETA_TORTURE_DIR="D:\torture-runs\Torture Prøject ŋ"; vp test run src/export/tortureProject.manual.spec.ts

import { describe, it, expect, vi } from "vite-plus/test";
import fs from "fs";
import * as Path from "path";
import * as temp from "temp";

const notifications: Array<{ kind: string; message: string; details?: string }> = [];
vi.mock("../components/Notify", async (importOriginal) => {
  const original: any = await importOriginal();
  const record =
    (kind: string) =>
    (...args: any[]) => {
      notifications.push({
        kind,
        message: String(args[0]?.message ?? args[0]),
        details: args[1] === undefined ? undefined : String(args[1]?.message ?? args[1]),
      });
    };
  return {
    ...original,
    NotifyError: record("error"),
    NotifyWarning: record("warning"),
    NotifyException: record("exception"),
    NotifyFileAccessProblem: record("fileAccess"),
    NotifyRenameProblem: record("rename"),
    NotifyNoBigDeal: record("noBigDeal"),
    NotifyErrorWithClick: record("errorWithClick"),
    NotifyMultipleProjectFiles: record("multipleProjectFiles"),
  };
});

import { Project } from "../model/Project/Project";
import ImdiBundler from "./ImdiBundler";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { getRoCrate } from "./ROCrate/RoCrateExporter";
import { RoCrateValidator } from "./ROCrate/RoCrateValidator";
import {
  makeCsvForPeople,
  makeCsvForProject,
  makeCsvForSessions,
  makeGenericCsvZipFile,
} from "./CsvExporter";
import { makeParadisecCsv } from "./ParadisecCsvExporter";
// the app validates in the main process; the renderer-side mock always says "valid"
import { validateImdiAsyncInternal } from "../mainProcess/validateImdi";

const projectDir = process.env.LAMETA_TORTURE_DIR;

interface Failure {
  step: string;
  target: string;
  error: string;
  stack?: string;
}

describe.skipIf(!projectDir)("torture project", () => {
  it("loads and exports, recording every failure", async () => {
    const out = process.env.LAMETA_TORTURE_OUT ?? temp.mkdirSync("lameta-torture-out");
    fs.mkdirSync(out, { recursive: true });
    const failures: Failure[] = [];
    const facts: Record<string, any> = {};
    const attempt = async (step: string, target: string, fn: () => any) => {
      const before = notifications.length;
      try {
        const r = await fn();
        return r;
      } catch (e: any) {
        failures.push({
          step,
          target,
          error: String(e?.message ?? e),
          stack: e?.stack?.split("\n").slice(0, 6).join("\n"),
        });
        return undefined;
      } finally {
        for (const n of notifications.slice(before)) (n as any).step = `${step}: ${target}`;
      }
    };

    const project: Project = (await attempt("load", projectDir!, () =>
      Project.fromDirectory(projectDir!),
    )) as Project;
    expect(project).toBeDefined();
    if ((project as any).loadingError) {
      failures.push({ step: "load", target: projectDir!, error: (project as any).loadingError });
    } else {
      const folderCount = (sub: string) =>
        fs
          .readdirSync(Path.join(projectDir!, sub), { withFileTypes: true })
          .filter((d) => d.isDirectory()).length;
      facts.sessionsOnDisk = folderCount("Sessions");
      facts.sessionsLoaded = project.sessions.items.length;
      facts.peopleOnDisk = folderCount("People");
      facts.peopleLoaded = project.persons.items.length;

      // contributors that resolve to no person
      facts.unresolvedContributors = [];
      for (const s of project.sessions.items as any[]) {
        await attempt("contributions", s.displayName, () => {
          for (const c of s.getAllContributionsToAllFiles()) {
            if (!project.findPerson(c.personReference))
              facts.unresolvedContributors.push(
                `${s.filePrefix}: ${JSON.stringify(c.personReference)} (${c.role})`,
              );
          }
        });
      }

      // fields that exporters expect to have a definition
      facts.fieldsWithoutDefinition = [];
      for (const folder of [
        project,
        ...project.sessions.items,
        ...project.persons.items,
      ] as any[]) {
        folder.metadataFile?.properties.forEach((key: string, field: any) => {
          if (!field.definition) facts.fieldsWithoutDefinition.push(`${folder.filePrefix}: ${key}`);
        });
      }

      // what each file would write if saved now, and which values that would lose
      const leaves = (xml: string): Map<string, string> => {
        const doc = new DOMParser().parseFromString(xml.replace(/^﻿/, ""), "text/xml");
        const result = new Map<string, string>();
        const walk = (el: Element, path: string) => {
          const kids = Array.from(el.children);
          if (kids.length === 0) {
            const text = (el.textContent ?? "").trim();
            if (text && !result.has(path)) result.set(path, text);
          }
          // contributors repeat, so key them by position
          kids.forEach((k, i) =>
            walk(
              k,
              `${path}/${k.tagName.toLowerCase()}${k.tagName === "contributor" ? `[${i}]` : ""}`,
            ),
          );
        };
        if (doc.documentElement) walk(doc.documentElement, "");
        return result;
      };
      facts.valuesLostOnSave = [];
      for (const folder of [
        project,
        ...project.sessions.items,
        ...project.persons.items,
      ] as any[]) {
        for (const f of folder.files) {
          const xml = await attempt("getXml", f.metadataFilePath, () => f.getXml());
          if (!xml || !fs.existsSync(f.metadataFilePath)) continue;
          const savedCopy = Path.join(
            out,
            "would-save",
            Path.relative(projectDir!, f.metadataFilePath),
          );
          fs.mkdirSync(Path.dirname(savedCopy), { recursive: true });
          fs.writeFileSync(savedCopy, xml);
          const before = leaves(fs.readFileSync(f.metadataFilePath, "utf8"));
          const after = leaves(xml);
          if ([...before.keys(), ...after.keys()].some((k) => k.startsWith("/parsererror"))) {
            facts.valuesLostOnSave.push(
              `${Path.relative(projectDir!, f.metadataFilePath)}: not compared, happy-dom's DOMParser could not parse it`,
            );
            continue;
          }
          const afterValues = [...after.values()];
          for (const [p, v] of before) {
            if (after.get(p) === v) continue;
            // moved to another element, or appended to one, is not a loss
            if (afterValues.some((a) => a.includes(v))) continue;
            facts.valuesLostOnSave.push(
              `${Path.relative(projectDir!, f.metadataFilePath)} ${p}: ${JSON.stringify(v.slice(0, 80))} -> ${JSON.stringify(after.get(p)?.slice(0, 80) ?? null)}`,
            );
          }
        }
      }

      // per-session IMDI, so one bad session doesn't hide the others
      const imdiDir = Path.join(out, "imdi-per-session");
      fs.mkdirSync(imdiDir, { recursive: true });
      for (const s of project.sessions.items as any[]) {
        const xml = await attempt("imdi session", s.filePrefix, () =>
          ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, s, project),
        );
        if (xml) {
          fs.writeFileSync(Path.join(imdiDir, `${encodeURIComponent(s.filePrefix)}.imdi`), xml);
          const result: any = await attempt("imdi validate", s.filePrefix, () =>
            validateImdiAsyncInternal(process.cwd(), xml, "IMDI_3.0_elar.xsd"),
          );
          if (result && !result.valid)
            failures.push({
              step: "imdi schema",
              target: s.filePrefix,
              error: result.errors
                .slice(0, 3)
                .map((e: any) => e.message ?? e.rawMessage ?? String(e))
                .join(" | "),
            });
        }
      }

      for (const [name, mode] of [
        ["imdi", IMDIMode.RAW_IMDI],
        ["opex", IMDIMode.OPEX],
      ] as const) {
        await attempt(`${name} bundle`, "project", () =>
          ImdiBundler.saveImdiBundleToFolder(
            project,
            Path.join(out, `${name}-bundle`),
            mode,
            true,
            () => true,
          ),
        );
      }

      const crate: any = await attempt("ro-crate", "project", () => getRoCrate(project, project));
      if (crate) {
        fs.writeFileSync(Path.join(out, "ro-crate-metadata.json"), JSON.stringify(crate, null, 2));
        const v = await attempt("ro-crate validate", "project", () =>
          new RoCrateValidator().validate(crate),
        );
        if (v) facts.roCrateValidation = { errors: v.errors, warnings: v.warnings.length };
      }
      const crateDir = Path.join(out, "ro-crate-per-session");
      fs.mkdirSync(crateDir, { recursive: true });
      for (const s of project.sessions.items as any[]) {
        const sessionCrate = await attempt("ro-crate session", s.filePrefix, () =>
          getRoCrate(project, s),
        );
        // the session's folder name is a legal file name; percent-encoding a Tibetan one
        // makes the path too long for Windows
        if (sessionCrate)
          await attempt("ro-crate session write", s.filePrefix, () =>
            fs.writeFileSync(
              Path.join(crateDir, `${s.filePrefix}.json`),
              JSON.stringify(sessionCrate, null, 2),
            ),
          );
      }

      await attempt("csv zip", "project", () =>
        makeGenericCsvZipFile(Path.join(out, "export.zip"), project, () => true),
      );
      // the same CSVs that the zip holds, as files that can be compared
      const csvDir = Path.join(out, "csv");
      fs.mkdirSync(csvDir, { recursive: true });
      for (const [name, makeCsv] of [
        ["project", () => makeCsvForProject(project)],
        ["people", () => makeCsvForPeople(project)],
        ["sessions", () => makeCsvForSessions(project, () => true)],
      ] as const) {
        const csv = await attempt(`csv ${name}`, "project", makeCsv);
        if (csv !== undefined) fs.writeFileSync(Path.join(csvDir, `${name}.csv`), csv);
      }
      await attempt("paradisec csv", "project", () =>
        makeParadisecCsv(Path.join(out, "paradisec.csv"), project, () => true),
      );
    }

    const report = { projectDir, out, facts, failures, notifications };
    fs.writeFileSync(Path.join(out, "report.json"), JSON.stringify(report, null, 2));
    console.log(
      `torture report: ${Path.join(out, "report.json")} (${failures.length} failures, ${notifications.length} notifications)`,
    );
  }, 600_000);
});
