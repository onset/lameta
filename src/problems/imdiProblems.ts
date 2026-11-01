import { t } from "@lingui/core/macro";
import { autorun, IReactionDisposer } from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { exportableSessions } from "../model/Project/exportableFolders";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { IFieldProblem, wordProblem } from "./fieldRules";
import { corpusImdiError, sessionImdiError } from "./imdiGeneration";
import { afterTyping } from "./whileTyping";

// how long to wait after the last change before generating the changed IMDI again
const kDelayMilliseconds = 1500;

// Reports, for an archive that takes IMDI, each session whose IMDI lameta cannot
// generate, and the corpus if lameta cannot generate its IMDI. A session's IMDI is
// generated again only when something that generating it read changes, and only once
// the user pauses. Calls `publish` with the problems after each run. Returns a function
// that stops it.
export function watchImdiGeneration(
  project: Project,
  publish: (problems: IFieldProblem[]) => void,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelWait = () => {};
  const errorBySession = new Map<Session, string | undefined>();
  let corpusError: string | undefined;
  // generations that are due; they run together once the user pauses
  const due = new Set<() => void>();

  const usesImdi = () => {
    // read so that changing the archive generates again
    project.properties.getTextStringOrEmpty("archiveConfigurationName");
    return GetOtherConfigurationSettings().archiveUsesImdi;
  };

  const run = () => {
    if (stopped) return;
    const generations = [...due];
    due.clear();
    generations.forEach((generate) => generate());
    publish([
      ...exportableSessions(project).flatMap((session) => {
        const error = errorBySession.get(session);
        return error
          ? [
              {
                checkId: "imdiNotGenerated",
                severity: "error" as const,
                ...wordProblem(
                  undefined,
                  t({
                    message: "lameta cannot generate the IMDI of this session.",
                    comment: "IMDI is the metadata format that some archives take",
                  }),
                  error,
                ),
                target: { folderType: "session" as const, folderId: session.id },
              },
            ]
          : [];
      }),
      ...(corpusError
        ? [
            {
              checkId: "imdiNotGenerated",
              severity: "error" as const,
              ...wordProblem(
                undefined,
                t({
                  message: "lameta cannot generate the IMDI of the corpus.",
                  comment: "IMDI is the metadata format that some archives take",
                }),
                corpusError,
              ),
              target: { folderType: "project" as const },
            },
          ]
        : []),
    ]);
  };
  const scheduleRun = () => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    cancelWait();
    timer = setTimeout(() => (cancelWait = afterTyping(run)), kDelayMilliseconds);
  };
  const generateLater = (generate: () => void) => {
    due.add(generate);
    scheduleRun();
  };

  // One autorun per session: it remembers what generating that session read, and is
  // due again only when one of those values changes
  const sessionWatchers = new Map<Session, IReactionDisposer>();
  const disposeSessionList = autorun(() => {
    const sessions = exportableSessions(project);
    for (const [session, dispose] of sessionWatchers) {
      if (!sessions.includes(session)) {
        dispose();
        sessionWatchers.delete(session);
        errorBySession.delete(session);
        scheduleRun();
      }
    }
    for (const session of sessions) {
      if (sessionWatchers.has(session)) continue;
      sessionWatchers.set(
        session,
        autorun(
          () =>
            errorBySession.set(
              session,
              usesImdi() ? sessionImdiError(session, project) : undefined,
            ),
          { scheduler: generateLater },
        ),
      );
    }
  });
  const disposeCorpus = autorun(
    () => {
      corpusError = usesImdi() ? corpusImdiError(project) : undefined;
    },
    { scheduler: generateLater },
  );

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    cancelWait();
    disposeCorpus();
    disposeSessionList();
    sessionWatchers.forEach((dispose) => dispose());
  };
}
