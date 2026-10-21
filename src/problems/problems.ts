import { NavigationTarget } from "../navigation/NavigationTarget";
import { IFieldProblem, IProblemWording, wordProblem } from "./fieldRules";
import { ProblemSeverity } from "./rulesFile";
import { IRulesFileProblem } from "./rulesSandboxMain";

// A problem from any of lameta's checks: the field rules, the checks in
// lametaChecks.ts, or the archive's rules file. The Problems sidebar, the fields'
// editors and the Export dialog show these.
export interface IProblem extends IProblemWording {
  // the same for the same problem in two runs of the checks
  key: string;
  // the field rule, the check in lametaChecks.ts, or the rules file's id that found it
  checkId: string;
  severity: ProblemSeverity;
  // undefined when the problem points at nothing that lameta can take the user to
  target?: NavigationTarget;
  // the session that the problem is in, if it is in one
  sessionId?: string;
  // the rules file's problems that it found in the sessions together
  acrossSessions?: boolean;
  // for a rules file's problem, a few lines of the IMDI around it
  excerpt?: IRulesFileProblem["excerpt"];
}

export function fromFieldProblem(p: IFieldProblem): IProblem {
  return {
    key: "field|" + JSON.stringify(p.target) + "|" + p.message,
    checkId: p.checkId,
    severity: p.severity,
    ...wordProblem(p.subject, p.text, p.reason),
    target: p.target,
    sessionId: p.target.folderType === "session" ? p.target.folderId : undefined,
  };
}

export function fromRulesFileProblem(p: IRulesFileProblem): IProblem {
  return {
    key:
      "rules|" +
      p.checkId +
      "|" +
      (p.sessionId ?? "") +
      "|" +
      JSON.stringify(p.target ?? null) +
      "|" +
      (p.subject ?? "") +
      "|" +
      p.message,
    checkId: p.checkId,
    severity: p.severity,
    ...wordProblem(p.subject, p.message, p.reason),
    target: p.target,
    sessionId: p.sessionId ?? (p.target?.folderType === "session" ? p.target.folderId : undefined),
    acrossSessions: p.from === "checkAcrossSessions",
    excerpt: p.excerpt,
  };
}

// The problems of the field rules and lametaChecks.ts, without those that the rules
// file also reports, in the same words, at the same place
export function withoutRulesFileDuplicates(
  fieldProblems: IFieldProblem[],
  rulesProblems: IRulesFileProblem[],
): IFieldProblem[] {
  const placeAndMessage = (target: NavigationTarget | undefined, m: string) =>
    JSON.stringify([
      target?.folderType,
      target && target.folderType !== "project" ? target.folderId : "",
      target?.fileName ?? "",
      target?.fieldKey ?? "",
      m,
    ]);
  const reported = new Set(
    rulesProblems.map((p) => placeAndMessage(p.target, wordProblem(p.subject, p.message).message)),
  );
  return fieldProblems.filter((p) => !reported.has(placeAndMessage(p.target, p.message)));
}

// Everything that the checks found, with each problem once
export function combineProblems(
  fieldProblems: IFieldProblem[],
  rulesProblems: IRulesFileProblem[],
): IProblem[] {
  return [
    ...withoutRulesFileDuplicates(fieldProblems, rulesProblems).map(fromFieldProblem),
    ...rulesProblems.map(fromRulesFileProblem),
  ];
}
