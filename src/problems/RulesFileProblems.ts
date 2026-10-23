import * as fs from "fs";
import {
  autorun,
  IReactionDisposer,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from "mobx";
import { Project } from "../model/Project/Project";
import { exportableSessions } from "../model/Project/exportableFolders";
import { Session } from "../model/Project/Session/Session";
import ImdiGenerator, { IMDIMode } from "../export/ImdiGenerator";
import { withWarningsDiscarded } from "../export/ExportWarningCollector";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { findBuiltInRulesFile } from "./rulesFile";
import {
  IRulesFileError,
  IRulesFileProblem,
  IRulesSandboxInput,
  IRulesSandboxOutput,
} from "./rulesSandboxMain";
import { makeRulesSandboxScript } from "./rulesSandboxScript";

// how long to wait after the last change to the project before running the rules again
const kRerunDelayMilliseconds = 1500;
const kTimeoutMilliseconds = 10000;
const kMaxProblems = 2000;

// Runs the rules in the rules sandbox and returns what rulesSandboxMain returned. The
// default sends the script to the main process (mainProcess/rulesSandbox.ts); tests
// pass their own.
export type RulesSandboxExecutor = (
  input: IRulesSandboxInput,
  timeoutMilliseconds: number,
) => Promise<{ value?: unknown; timedOut?: boolean; error?: string }>;

const runInMainProcessSandbox: RulesSandboxExecutor = (input, timeout) =>
  require("electron").ipcRenderer.invoke(
    "run-rules-sandbox",
    makeRulesSandboxScript(input),
    timeout,
  );

// Finds the rules file for an archive configuration. The default finds the one that
// lameta ships; tests pass their own.
export type RulesFileFinder = (configurationName: string) => string | undefined;

// The tags of the project's metadata languages, such as ["en", "es"]
function metadataLanguageTags(project: Project): string[] {
  return Project.parseLanguagesToSlots(
    project.properties.getTextStringOrEmpty("metadataLanguages"),
  ).map((slot) => slot.tag);
}

// The IMDI to check, or why lameta could not generate it
type Generated = { xml: string } | { error: IRulesFileError };

function generate(sessionId: string | undefined, makeXml: () => string): Generated {
  try {
    return { xml: withWarningsDiscarded(makeXml) };
  } catch (e) {
    return {
      error: {
        kind: "imdi",
        message: `lameta could not generate the IMDI ${
          sessionId ? `of session ${sessionId}` : "of the corpus"
        }: ${e instanceof Error ? e.message : String(e)}`,
        sessionId,
      },
    };
  }
}

function generateSession(session: Session, project: Project): Generated {
  return generate(session.id, () =>
    ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project),
  );
}

function generateCorpus(project: Project): Generated {
  return generate(undefined, () =>
    ImdiGenerator.generateCorpus(
      IMDIMode.RAW_IMDI,
      project,
      exportableSessions(project).map((s) => `${s.id}.imdi`),
    ),
  );
}

// The problems that the archive's rules file finds in the IMDI that lameta would
// export for the open project. The IMDI is generated in memory, one session at a
// time, and a session is generated again only when something it reads changes.
export class RulesFileProblems {
  public problems: IRulesFileProblem[] = [];
  public errors: IRulesFileError[] = [];
  public running = false;
  // for watching the cost: the last run's generating and checking times, and how
  // many sessions had to be generated again
  public timing = {
    generateMilliseconds: 0,
    sandboxMilliseconds: 0,
    checkMilliseconds: 0,
    sessionsGenerated: 0,
  };

  constructor(
    private executor: RulesSandboxExecutor = runInMainProcessSandbox,
    private findRulesFile: RulesFileFinder = (name) => findBuiltInRulesFile(name),
  ) {
    makeObservable(this, {
      problems: observable.ref,
      errors: observable.ref,
      running: observable,
      timing: observable.ref,
    });
  }

  // Generates the IMDI of every session and of the corpus, and runs the rules file
  // on it once, for when lameta needs every problem now, as at export
  public async checkNow(
    project: Project,
  ): Promise<Pick<IRulesSandboxOutput, "problems" | "errors">> {
    if (!GetOtherConfigurationSettings().archiveUsesImdi) return { problems: [], errors: [] };
    const sessions = new Map(
      exportableSessions(project).map((s) => [s, generateSession(s, project)]),
    );
    return this.runRulesOnGenerated(project, sessions, generateCorpus(project));
  }

  // Runs the rules on the IMDI that could be generated, and adds what could not be
  // generated to the rules file's errors
  private async runRulesOnGenerated(
    project: Project,
    sessions: Map<Session, Generated>,
    corpus: Generated | undefined,
  ): Promise<IRulesSandboxOutput> {
    const generationErrors = [...sessions.values(), ...(corpus ? [corpus] : [])].flatMap((g) =>
      "error" in g ? [g.error] : [],
    );
    const output = await this.runRules(
      project,
      [...sessions.entries()].flatMap(([session, g]) =>
        "xml" in g ? [{ sessionId: session.id, xml: g.xml }] : [],
      ),
      corpus && "xml" in corpus ? corpus.xml : undefined,
    );
    return { ...output, errors: [...generationErrors, ...output.errors] };
  }

  // Runs the project's rules file on the given IMDI
  private async runRules(
    project: Project,
    sessions: IRulesSandboxInput["sessions"],
    corpusXml: string | undefined,
  ): Promise<IRulesSandboxOutput> {
    const nothing = (errors: IRulesFileError[]) => ({
      problems: [],
      errors,
      milliseconds: 0,
    });
    const path = this.findRulesFile(
      project.properties.getTextStringOrEmpty("archiveConfigurationName"),
    );
    if (!path) return nothing([]);
    let rulesSource: string;
    try {
      rulesSource = fs.readFileSync(path, "utf8");
    } catch (e) {
      return nothing([
        {
          kind: "load",
          message: `lameta could not read the rules file ${path}: ${(e as Error).message}`,
        },
      ]);
    }
    let result: Awaited<ReturnType<RulesSandboxExecutor>>;
    try {
      result = await this.executor(
        {
          rulesSource,
          sessions,
          corpusXml,
          metadataLanguages: metadataLanguageTags(project),
          maxProblems: kMaxProblems,
        },
        kTimeoutMilliseconds,
      );
    } catch (e) {
      result = { error: e instanceof Error ? e.message : String(e) };
    }
    const output = result.value as IRulesSandboxOutput | undefined;
    if (result.timedOut)
      return nothing([
        {
          kind: "timeout",
          message: `The rules file did not finish within ${
            kTimeoutMilliseconds / 1000
          } seconds, so lameta stopped it.`,
        },
      ]);
    if (result.error || !output)
      return nothing([
        {
          kind: "load",
          message: `The rules file could not be run: ${result.error ?? "no result"}`,
        },
      ]);
    return output;
  }

  // Starts generating and checking. Returns a function that stops it.
  public watch(project: Project): () => void {
    if (!GetOtherConfigurationSettings().archiveUsesImdi) {
      // the sidebar already says that only IMDI can be checked so far
      return () => {};
    }
    let stopped = false;
    let runTimer: ReturnType<typeof setTimeout> | undefined;
    let runAgainWhenDone = false;
    const generatedBySession = new Map<Session, Generated>();
    let corpus: Generated | undefined;
    // generations that are due; they run just before the rules do
    const dueGenerations = new Set<() => void>();
    let sessionsGenerated = 0;

    const scheduleRun = (delay: number) => {
      if (stopped) return;
      if (runTimer) clearTimeout(runTimer);
      // `run` is defined below; look it up when the timer fires
      runTimer = setTimeout(() => run(), delay);
    };
    const generateLater = (generate: () => void) => {
      dueGenerations.add(generate);
      scheduleRun(kRerunDelayMilliseconds);
    };

    // One autorun per session: it remembers what generating that session read, and
    // runs again only when one of those values changes.
    const sessionWatchers = new Map<Session, IReactionDisposer>();
    const disposeSessionList = autorun(() => {
      const sessions = exportableSessions(project);
      for (const [session, dispose] of sessionWatchers) {
        if (!sessions.includes(session)) {
          dispose();
          sessionWatchers.delete(session);
          generatedBySession.delete(session);
          scheduleRun(kRerunDelayMilliseconds);
        }
      }
      for (const session of sessions) {
        if (sessionWatchers.has(session)) continue;
        sessionWatchers.set(
          session,
          autorun(
            () => {
              generatedBySession.set(session, generateSession(session, project));
              sessionsGenerated++;
            },
            { scheduler: generateLater },
          ),
        );
      }
    });
    const disposeCorpus = autorun(
      () => {
        corpus = generateCorpus(project);
      },
      { scheduler: generateLater },
    );

    // The rules expect a translation only when there is a metadata language besides
    // English, so run them again when the metadata languages change.
    const disposeMetadataLanguages = reaction(
      () => metadataLanguageTags(project).join(";"),
      () => scheduleRun(kRerunDelayMilliseconds),
    );

    // Run now, and again when the archive configuration, and so its rules file, changes
    const disposeConfigurationWatch = autorun(() => {
      project.properties.getTextStringOrEmpty("archiveConfigurationName");
      scheduleRun(0);
    });

    const run = async () => {
      if (stopped) return;
      if (this.running) {
        runAgainWhenDone = true;
        return;
      }
      runInAction(() => (this.running = true));
      try {
        const generateStart = performance.now();
        sessionsGenerated = 0;
        const due = [...dueGenerations];
        dueGenerations.clear();
        due.forEach((generate) => generate());
        const generateMilliseconds = performance.now() - generateStart;

        const sessions = new Map(
          exportableSessions(project)
            .filter((s) => generatedBySession.has(s))
            .map((s) => [s, generatedBySession.get(s)!]),
        );
        const sandboxStart = performance.now();
        const output = await this.runRulesOnGenerated(project, sessions, corpus);
        const sandboxMilliseconds = performance.now() - sandboxStart;
        if (stopped) return;
        runInAction(() => {
          this.problems = output.problems;
          this.errors = output.errors;
          this.timing = {
            generateMilliseconds,
            sandboxMilliseconds,
            checkMilliseconds: output.milliseconds,
            sessionsGenerated,
          };
        });
      } catch (e) {
        // the last run's problems no longer describe the project
        if (!stopped)
          runInAction(() => {
            this.problems = [];
            this.errors = [
              {
                kind: "load",
                message: `lameta could not check the project: ${
                  e instanceof Error ? e.message : String(e)
                }`,
              },
            ];
          });
      } finally {
        runInAction(() => (this.running = false));
        if (runAgainWhenDone) {
          runAgainWhenDone = false;
          scheduleRun(0);
        }
      }
    };

    return () => {
      stopped = true;
      if (runTimer) clearTimeout(runTimer);
      disposeConfigurationWatch();
      disposeMetadataLanguages();
      disposeCorpus();
      disposeSessionList();
      sessionWatchers.forEach((dispose) => dispose());
      runInAction(() => {
        this.problems = [];
        this.errors = [];
      });
    };
  }
}

export const rulesFileProblems = new RulesFileProblems();
