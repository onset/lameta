import { Project } from "../model/Project/Project";
import { checkProjectFields } from "./fieldRules";
import { checkProjectFolders } from "./lametaChecks";
import { fromFieldProblem, IProblem } from "./problems";

export interface ICheckError {
  message: string;
  // the session that could not be checked, if the error is about one
  sessionId?: string;
}

export interface IProjectCheck {
  problems: IProblem[];
  // what stopped lameta from checking everything, if anything
  checkErrors: ICheckError[];
}

// What the check found in the project, the people, and the given sessions
export function checkOfSessions(check: IProjectCheck, sessionIds: Set<string>): IProjectCheck {
  const inSessions = (x: { sessionId?: string }) => !x.sessionId || sessionIds.has(x.sessionId);
  return {
    problems: check.problems.filter(inSessions),
    checkErrors: check.checkErrors.filter(inSessions),
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
    ...(check.checkErrors.length > 0 ? (["incompleteCheck"] as const) : []),
  ];
}

// Runs all of lameta's checks on the whole project now, without waiting for the
// checks that run after an edit: the field rules and the checks in lametaChecks.ts.
export async function checkProject(project: Project): Promise<IProjectCheck> {
  try {
    return {
      problems: [...checkProjectFields(project), ...checkProjectFolders(project)].map(
        fromFieldProblem,
      ),
      checkErrors: [],
    };
  } catch (e) {
    return {
      problems: [],
      checkErrors: [
        {
          message: `lameta could not check the project: ${e instanceof Error ? e.message : String(e)}`,
        },
      ],
    };
  }
}
