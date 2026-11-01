import { NavigationTarget } from "../navigation/NavigationTarget";
import { IFieldProblem, IProblemWording, wordProblem } from "./fieldRules";
import { ProblemSeverity } from "./problemSeverity";

// A problem from any of lameta's checks: the field rules or the checks in
// lametaChecks.ts. The Problems sidebar, the fields' editors and the Export dialog show
// these.
export interface IProblem extends IProblemWording {
  // the same for the same problem in two runs of the checks
  key: string;
  // the field rule or the check in lametaChecks.ts that found it
  checkId: string;
  severity: ProblemSeverity;
  // undefined when the problem points at nothing that lameta can take the user to
  target?: NavigationTarget;
  // the session that the problem is in, if it is in one
  sessionId?: string;
}

export function fromFieldProblem(p: IFieldProblem): IProblem {
  return {
    // a problem whose target is on the Project tab, such as a missing translation, can be
    // in several sessions
    key: "field|" + JSON.stringify(p.target) + "|" + (p.sessionId ?? "") + "|" + p.message,
    checkId: p.checkId,
    severity: p.severity,
    ...wordProblem(p.subject, p.text, p.reason),
    target: p.target,
    sessionId: p.sessionId ?? (p.target.folderType === "session" ? p.target.folderId : undefined),
  };
}

// `previous` when `next` holds the same problems in the same order, so that a check
// which finds nothing new leaves the observable list as it was and nothing re-renders.
// A field problem's `field` is compared by identity, everything else by value.
export function keepIfSame<T extends object>(previous: T[], next: T[]): T[] {
  if (previous === next) return previous;
  if (previous.length !== next.length) return next;
  const withoutField = (p: T) => JSON.stringify(p, (k, v) => (k === "field" ? undefined : v));
  for (let i = 0; i < next.length; i++) {
    const a = previous[i] as { field?: unknown };
    const b = next[i] as { field?: unknown };
    if (a.field !== b.field || withoutField(previous[i]) !== withoutField(next[i])) return next;
  }
  return previous;
}
