import { autorun, makeObservable, observable, runInAction, untracked } from "mobx";
import { Project } from "../model/Project/Project";
import { Field } from "../model/field/Field";
import { checkProjectFields, IFieldProblem } from "./fieldRules";
import { checkProjectFolders } from "./lametaChecks";
import { keepIfSame } from "./problems";
import { afterTyping } from "./whileTyping";
import { watchImdiGeneration } from "./imdiProblems";

// how long to wait after the last change before checking again
const kRecheckDelayMilliseconds = 400;

// The problems that the field rules and lametaChecks.ts find in the open project, and
// for an archive that takes IMDI, the sessions whose IMDI lameta cannot generate, kept
// up to date while it is open.
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
  // the user pauses and has left the text field they are typing in. Returns a
  // function that stops it.
  public watch(project: Project): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelWait = () => {};
    let first = true;
    let checked: IFieldProblem[] = [];
    let imdi: IFieldProblem[] = [];
    const show = () => {
      // untracked, or each new list would make the check due again
      const problems = keepIfSame(
        untracked(() => this.problems),
        [...checked, ...imdi],
      );
      runInAction(() => {
        if (problems === this.problems) return;
        const byField = new Map<Field, IFieldProblem[]>();
        for (const p of problems) {
          if (!p.field) continue;
          byField.set(p.field, [...(byField.get(p.field) ?? []), p]);
        }
        this.problemsByField = byField;
        this.problems = problems;
      });
    };
    const dispose = autorun(
      () => {
        const start = performance.now();
        checked = [...checkProjectFields(project), ...checkProjectFolders(project)];
        const elapsed = performance.now() - start;
        runInAction(() => (this.checkMilliseconds = elapsed));
        show();
      },
      {
        scheduler: (run) => {
          if (timer) clearTimeout(timer);
          cancelWait();
          // the first check runs at once, so the problems show as soon as the project does
          if (first) {
            first = false;
            run();
          } else
            timer = setTimeout(() => (cancelWait = afterTyping(run)), kRecheckDelayMilliseconds);
        },
      },
    );
    const stopWatchingImdi = watchImdiGeneration(project, (problems) => {
      imdi = problems;
      show();
    });
    return () => {
      if (timer) clearTimeout(timer);
      cancelWait();
      dispose();
      stopWatchingImdi();
      runInAction(() => {
        this.problemsByField = new Map();
        this.problems = [];
      });
    };
  }
}

export const projectProblems = new ProjectProblems();
