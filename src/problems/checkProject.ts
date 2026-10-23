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
