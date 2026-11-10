import ImdiGenerator, {
  IMDIMode,
  resetTildeBirthYearWarning,
  tildeBirthYearWarningGiven,
} from "../export/ImdiGenerator";
import { withWarningsDiscarded } from "../export/ExportWarningCollector";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { exportableSessions } from "../model/Project/exportableFolders";

// Why lameta cannot generate the IMDI that `makeXml` makes, or undefined when it can.
// Generating IMDI gives a warning about an approximate birth year once; this keeps it
// for the IMDI that the user sees or exports.
function imdiGenerationError(makeXml: () => string): string | undefined {
  const warningGiven = tildeBirthYearWarningGiven();
  try {
    withWarningsDiscarded(makeXml);
    return undefined;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  } finally {
    if (!warningGiven) resetTildeBirthYearWarning();
  }
}

export function sessionImdiError(session: Session, project: Project): string | undefined {
  return imdiGenerationError(() =>
    ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project),
  );
}

export function corpusImdiError(project: Project): string | undefined {
  return imdiGenerationError(() =>
    ImdiGenerator.generateCorpus(
      IMDIMode.RAW_IMDI,
      project,
      exportableSessions(project).map((s) => `${s.id}.imdi`),
    ),
  );
}
