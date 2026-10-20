import { autorun, makeObservable, observable, runInAction } from "mobx";
import { Project } from "../model/Project/Project";
import { Field } from "../model/field/Field";
import { checkProjectFields, IFieldProblem } from "./fieldRules";
import { checkProjectFolders } from "./lametaChecks";

// how long to wait after the last change before checking again
const kRecheckDelayMilliseconds = 400;

// The problems that the field rules and lametaChecks.ts find in the open project,
// kept up to date while it is open.
// The Problems sidebar lists them and each field's editor shows its own, so the two
// always agree.
export class ProjectProblems {
  public problems: IFieldProblem[] = [];
  // how long the last check took, so that its cost can be watched
  public checkMilliseconds = 0;
  private problemsByField = new Map<Field, IFieldProblem[]>();

  constructor() {
    makeObservable(this, {
      problems: observable.ref,
      checkMilliseconds: observable,
    });
  }

  public problemsOf(field: Field): IFieldProblem[] {
    // reading `problems` makes an observer re-render when they change
    return this.problems.length === 0 ? [] : (this.problemsByField.get(field) ?? []);
  }

  // Checks now and again whenever a value that the check read changes, waiting until
  // the user pauses. Returns a function that stops it.
  public watch(project: Project): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first = true;
    const dispose = autorun(
      () => {
        const start = performance.now();
        const problems = [...checkProjectFields(project), ...checkProjectFolders(project)];
        const elapsed = performance.now() - start;
        const byField = new Map<Field, IFieldProblem[]>();
        for (const p of problems) {
          if (!p.field) continue;
          byField.set(p.field, [...(byField.get(p.field) ?? []), p]);
        }
        runInAction(() => {
          this.problemsByField = byField;
          this.problems = problems;
          this.checkMilliseconds = elapsed;
        });
      },
      {
        scheduler: (run) => {
          if (timer) clearTimeout(timer);
          // the first check runs at once, so the problems show as soon as the project does
          if (first) {
            first = false;
            run();
          } else timer = setTimeout(run, kRecheckDelayMilliseconds);
        },
      },
    );
    return () => {
      if (timer) clearTimeout(timer);
      dispose();
      runInAction(() => {
        this.problemsByField = new Map();
        this.problems = [];
      });
    };
  }
}

export const projectProblems = new ProjectProblems();
