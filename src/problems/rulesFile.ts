import * as fs from "fs";
import * as Path from "path";
import { locateDependencyForFilesystemCall } from "../other/locateDependency";

// A rules file checks the metadata that lameta exports for an archive and reports
// problems for the problems sidebar. Any archive configuration can have one, at
// archive-configurations/<configuration name>/rules.js; it is optional. The user can
// also choose a local rules file per configuration (UserSettings.getProblemRulesFile).
// It runs in a sandbox with no Node and no network (see rulesSandbox.ts), so it can
// use nothing but the standard DOM.
//
// A rules file is a plain ES module:
//
//   export const interfaceVersion = 1;
//   export const format = "imdi";
//   export function checkSession(doc, report, project) {}         // once per session's IMDI Document
//   export function checkCorpus(doc, report, project) {}          // once, with the corpus IMDI Document
//   export function checkAcrossSessions(docs, report, project) {} // once, with every session's Document
//
// `project` holds what the IMDI does not say about the project:
//   metadataLanguages: the tags of its metadata languages, such as ["en", "es"]
//
// All three functions are optional. Each reports a problem by calling
//
//   report({ id, severity, subject, message, reason, node });
//
// where only `message` is required; IReportedProblem below says what each one is.

export const kRulesFileName = "rules.js";
export const kRulesFileInterfaceVersion = 1;

// The export formats that rules can check.
// A JSON format such as RO-Crate cannot carry lameta-source comments, so adding one
// needs a different way for a reported problem to say where it is than `node`.
export const kSupportedRulesFormats = ["imdi"] as const;
export type RulesFormat = (typeof kSupportedRulesFormats)[number];

export type ProblemSeverity = "error" | "warning";

// What a rules file's module exports
export interface IRulesFileModule {
  interfaceVersion: number;
  // the export format whose output the rules check
  format: string;
  checkSession?: (doc: Document, report: ReportProblem) => void;
  checkCorpus?: (doc: Document, report: ReportProblem) => void;
  checkAcrossSessions?: (docs: Document[], report: ReportProblem) => void;
}

export type ReportProblem = (problem: IReportedProblem) => void;

export interface IReportedProblem {
  // names the check, e.g. "checkMediaFiles"
  id: string;
  // "warning" if not given
  severity?: ProblemSeverity;
  // Optional. What the problem is about, e.g. "MP3" or a field's name. The sidebar
  // shows it in bold before the message, so that the two read as one sentence:
  // **MP3** isn't accepted when the original WAV is also present.
  subject?: string;
  // Says what is wrong without naming the session: the sidebar shows which session
  // a problem belongs to. Nor does it need to name the file: when `node` maps to a
  // file, the sidebar shows the file's name on a line of its own.
  message: string;
  // Optional. Why it is a problem or what to do about it, shown on a line of its own
  // after the message.
  reason?: string;
  // Any node of the Document the check was given. findLametaSource() in
  // export/lametaSourceComment.ts maps it to the place in lameta to fix it.
  node?: Node;
}

// Why the rules cannot be used with the current archive configuration, if they can't.
export type RulesFileUnsupported =
  | { reason: "archive-does-not-use-imdi" }
  | { reason: "format"; format: string }
  | { reason: "interface-version"; interfaceVersion: number };

// `declaration` is what the rules file says about itself; it is undefined until the
// file has been loaded.
export function getRulesFileUnsupported(
  archiveUsesImdi: boolean,
  declaration?: Pick<IRulesFileModule, "interfaceVersion" | "format">,
): RulesFileUnsupported | undefined {
  if (declaration && declaration.interfaceVersion !== kRulesFileInterfaceVersion) {
    return {
      reason: "interface-version",
      interfaceVersion: declaration.interfaceVersion,
    };
  }
  if (declaration && !(kSupportedRulesFormats as readonly string[]).includes(declaration.format)) {
    return { reason: "format", format: declaration.format };
  }
  // IMDI is the only format so far, so an archive that doesn't take IMDI can't be checked
  if (!archiveUsesImdi) return { reason: "archive-does-not-use-imdi" };
  return undefined;
}

// The rules file that comes with lameta for this archive configuration, if it has one.
export function findBuiltInRulesFile(
  configurationName: string,
  archiveConfigurationsDirectory: string = locateDependencyForFilesystemCall(
    "archive-configurations",
  ),
): string | undefined {
  if (!configurationName) return undefined;
  const path = Path.join(archiveConfigurationsDirectory, configurationName, kRulesFileName);
  return fs.existsSync(path) ? path : undefined;
}
