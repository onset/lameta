import { Project } from "../model/Project/Project";
import { checkProjectFields } from "./fieldRules";
import { checkProjectFolders } from "./lametaChecks";
import { combineProblems, IProblem } from "./problems";
import { rulesFileProblems } from "./RulesFileProblems";
import { IRulesFileError } from "./rulesSandboxMain";

export interface IProjectCheck {
  problems: IProblem[];
  // what went wrong running the archive's rules file, if anything
  rulesFileErrors: IRulesFileError[];
}

// What the check found in the project, the people, and the given sessions
export function checkOfSessions(check: IProjectCheck, sessionIds: Set<string>): IProjectCheck {
  const inSessions = (x: { sessionId?: string }) => !x.sessionId || sessionIds.has(x.sessionId);
  return {
    problems: check.problems.filter(inSessions),
    rulesFileErrors: check.rulesFileErrors.filter(inSessions),
  };
}

// Why an archive will not accept an export in the given format: errors among the
// problems, or a check that could not finish, since then lameta cannot say that there
// are no errors. Empty when nothing stops the export.
export function whyExportIsBlocked(
  format: string,
  formatsBlockedByProblems: string[],
  check: IProjectCheck,
): ("errors" | "incompleteCheck")[] {
  if (!formatsBlockedByProblems.includes(format)) return [];
  return [
    ...(check.problems.some((p) => p.severity === "error") ? (["errors"] as const) : []),
    ...(check.rulesFileErrors.length > 0 ? (["incompleteCheck"] as const) : []),
  ];
}

// Runs all of lameta's checks on the whole project now, without waiting for the
// checks that run in the background after an edit: the field rules, the checks in
// lametaChecks.ts, and the archive's rules file on freshly generated IMDI.
export async function checkProject(project: Project): Promise<IProjectCheck> {
  const fieldProblems = [...checkProjectFields(project), ...checkProjectFolders(project)];
  const rules = await rulesFileProblems.checkNow(project).catch((e) => ({
    problems: [],
    errors: [
      {
        kind: "load" as const,
        message: `lameta could not check the project: ${e instanceof Error ? e.message : String(e)}`,
      },
    ],
  }));
  return {
    problems: combineProblems(fieldProblems, rules.problems),
    rulesFileErrors: rules.errors,
  };
}
