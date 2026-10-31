import * as Path from "path";
import { t } from "@lingui/core/macro";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { Folder } from "../model/Folder/Folder";
import { sanitizeForArchive } from "../other/sanitizeForArchive";
import { IFieldProblem, wordProblem } from "./fieldRules";
import { File } from "../model/file/File";
import { HasConsentField } from "../model/field/Field";
import { NavigationTarget } from "../navigation/NavigationTarget";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import {
  ILanguageCodeAndName,
  splitLanguageFieldValue,
} from "../languageFinder/languageTagFieldValue";
import { shouldIncludeFile } from "../export/shouldIncludeFile";
import { getStatusOfFile } from "../model/file/FileStatus";
import {
  isLanguageName,
  iso639_3ForExport,
  languageEntryNameForExport,
} from "../export/languageNameForExport";

// Checks that lameta makes for every archive configuration, beyond the rules of
// single fields: metadata files that lameta could not read, file names against the
// configuration's fileNameRules, contributors who have no matching person, and
// sessions that have no files or no contributors, and one language code with
// different names in different sessions, and contributors who have no consent on
// record. A configuration can give any of these
// checks another severity (checkSeverities in its settings.json5). Like
// the field rules, they read only the project's own data, so they are cheap enough
// to run after each edit.
export function checkProjectFolders(project: Project): IFieldProblem[] {
  const problems: IFieldProblem[] = [];
  const checkReadable = (file: File, target: NavigationTarget, text: string) => {
    if (file.metadataReadProblem === undefined) return;
    problems.push({
      checkId: "metadataUnreadable",
      severity: "error",
      ...wordProblem(Path.basename(file.metadataFilePath), text, file.metadataReadProblem),
      target,
    });
  };
  const couldNotBeRead = () =>
    t({
      message: "could not be read.",
      comment: 'Follows a file name, as in "song.wav.meta could not be read."',
    });
  const checkFiles = (folder: Folder, folderType: "session" | "person", folderId: string) => {
    for (const file of folder.files) {
      if (file === folder.metadataFile) {
        checkReadable(
          file,
          { folderType, folderId },
          folderType === "session"
            ? t({
                message: "could not be read, so export leaves this session out.",
                comment: 'Follows a file name, as in "ETR009.session could not be read…"',
              })
            : t({
                message: "could not be read, so export leaves this person out.",
                comment: 'Follows a file name, as in "Awi.person could not be read…"',
              }),
        );
      } else {
        checkReadable(
          file,
          { folderType, folderId, fileName: file.getTextProperty("filename", "") },
          couldNotBeRead(),
        );
      }
      if (file === folder.metadataFile) continue;
      const fileName = Path.basename(file.getActualFilePath());
      const exportedName = sanitizeForArchive(fileName);
      // Export renames the file, so the archive gets a name that it allows; the
      // user may want to rename it first
      if (fileName !== exportedName) {
        problems.push({
          checkId: "fileNameNotAllowed",
          severity: "warning",
          ...wordProblem(
            t`File name`,
            t({
              message: "has characters that the archive doesn't allow.",
              comment: 'Follows "File name", as in "File name has characters…"',
            }),
            t`Export renames it to "${exportedName}".`,
          ),
          target: {
            folderType,
            folderId,
            fileName: file.getTextProperty("filename", ""),
          },
        });
      }
    }
  };

  // the people who contribute to at least one session
  const contributingPeople = new Set<Person>();
  for (const session of project.sessions.items as Session[]) {
    checkFiles(session, "session", session.id);
    const otherFiles = session.files.filter((f) => f !== session.metadataFile);
    if (!otherFiles.some(isExported)) {
      problems.push({
        checkId: "sessionWithoutFiles",
        severity: "error",
        ...(otherFiles.length === 0
          ? wordProblem(
              t`Session`,
              t({
                message: "has no files.",
                comment: 'Follows "Session", as in "Session has no files."',
              }),
            )
          : wordProblem(
              t`Session`,
              t({
                message: "has no files that export can include.",
                comment:
                  'Follows "Session", as in "Session has no files that export can include."',
              }),
              t`Export leaves out a file that is missing from this computer and a file whose name ends in ".skip".`,
            )),
        target: { folderType: "session", folderId: session.id },
      });
    }
    if (!session.files.some((f) => f.contributions.some((c) => c.personReference?.trim()))) {
      problems.push({
        checkId: "sessionWithoutContributors",
        severity: "error",
        ...wordProblem(
          t`Session`,
          t({
            message: "has no contributors.",
            comment:
              'Follows "Session", as in "Session has no contributors." Contributors are the people listed on the Contributors tab of the session or of its files.',
          }),
        ),
        target: { folderType: "session", folderId: session.id, fieldKey: "contributions" },
      });
    }
    // reported once for each file that lists the contributor, so that the problem
    // goes to the Contributors tab of that file
    for (const file of session.files) {
      // a person is matched without regard to case, so "Hatton" and "hatton" are one
      const contributors = new Map<string, string>();
      for (const c of file.contributions) {
        const name = c.personReference?.trim();
        if (name && !contributors.has(name.toLowerCase()))
          contributors.set(name.toLowerCase(), name);
      }
      for (const name of contributors.values()) {
        // a contribution may name a person by name or by code, as the export allows
        const person = project.findPerson(name);
        if (person) {
          contributingPeople.add(person);
          continue;
        }
        problems.push({
          checkId: "contributorWithoutPerson",
          severity: "error",
          ...wordProblem(
            name,
            t({
              message: "has no matching Person.",
              comment: 'Follows a contributor\'s name, as in "Awi Heole has no matching Person."',
            }),
          ),
          target: {
            folderType: "session",
            folderId: session.id,
            ...(file === session.metadataFile
              ? {}
              : { fileName: file.getTextProperty("filename", "") }),
            fieldKey: "contributions",
          },
        });
      }
    }
  }
  checkLanguageNames(project, problems);
  for (const person of project.persons.items as Person[]) {
    checkFiles(person, "person", person.getIdToUseForReferences());
    const consent = person.properties.getValue("hasConsent");
    if (
      contributingPeople.has(person) &&
      consent instanceof HasConsentField &&
      !consent.hasConsent()
    ) {
      problems.push({
        checkId: "contributorWithoutConsent",
        severity: "warning",
        ...wordProblem(
          person.displayName,
          t({
            message: "has no consent on record.",
            comment: 'Follows a person\'s name, as in "Awi Heole has no consent on record."',
          }),
          t({
            message: 'lameta recognises a consent file by "Consent" in its file name.',
            comment:
              'Do not translate "Consent": lameta looks for that English word in the names of the person\'s files.',
          }),
        ),
        target: { folderType: "person", folderId: person.getIdToUseForReferences() },
      });
    }
  }
  if (project.metadataFile) {
    checkReadable(project.metadataFile, { folderType: "project" }, couldNotBeRead());
  }
  const documentFolders = [
    ["description", project.descriptionFolder],
    ["other", project.otherDocsFolder],
  ] as const;
  for (const [documents, folder] of documentFolders) {
    for (const file of folder?.files ?? []) {
      checkReadable(
        file,
        { folderType: "project", documents, fileName: file.getTextProperty("filename", "") },
        couldNotBeRead(),
      );
    }
  }
  const severities = GetOtherConfigurationSettings().checkSeverities ?? {};
  return problems.map((p) =>
    severities[p.checkId] ? { ...p, severity: severities[p.checkId] } : p,
  );
}

// Whether the IMDI export includes this file of a session, as
// ImdiGenerator.resourcesOfType decides. A file that is only in the cloud counts,
// because export downloads it.
function isExported(file: File): boolean {
  if (file.isDeletedLinkFile()) return false;
  if (!shouldIncludeFile(file.getActualFilePath())) return false;
  return !getStatusOfFile(file).missing;
}

// One language code that sessions give different names, compared as the IMDI writes
// them. Only a session's language field can do this, through an entry that carries its
// own name, such as "etr:Edolo".
// A person's languages cannot: export names them from their code alone.
// Names that differ only in capitalisation count as one. The sessions that use a name
// other than the one that most use are reported; when two names are equally common,
// every session is.
function checkLanguageNames(project: Project, problems: IFieldProblem[]) {
  type Entry = { entry: ILanguageCodeAndName; sessionId: string; fieldKey: string };
  // Grouped by the ISO 639-3 code that export writes, so that "en" and "eng" are one
  // language. Looking up a code or a name searches the language index, and this runs after
  // each edit, so each tag is looked up once.
  const codes = new Map<string, string>();
  const codeOf = (tag: string) => {
    if (!codes.has(tag))
      codes.set(tag, iso639_3ForExport(tag, project.privateUseCodes, project).toLowerCase());
    return codes.get(tag)!;
  };
  const entriesByCode = new Map<string, Entry[]>();
  for (const session of project.sessions.items as Session[]) {
    for (const fieldKey of ["languages", "workingLanguages"]) {
      const value = session.properties.getTextStringOrEmpty(fieldKey);
      for (const entry of splitLanguageFieldValue(value)) {
        // a SayMore-era name in place of a code has no code to compare
        if (!entry.code.trim() || isLanguageName(entry.code)) continue;
        const code = codeOf(entry.code);
        if (!entriesByCode.has(code)) entriesByCode.set(code, []);
        entriesByCode.get(code)!.push({ entry, sessionId: session.id, fieldKey });
      }
    }
  }
  const lookedUp = new Map<string, string>();
  const nameOf = (entry: ILanguageCodeAndName) => {
    if (entry.name) return languageEntryNameForExport(entry, project).trim();
    if (!lookedUp.has(entry.code))
      lookedUp.set(entry.code, languageEntryNameForExport(entry, project).trim());
    return lookedUp.get(entry.code)!;
  };
  for (const [code, entries] of entriesByCode) {
    // entries that carry no name of their own all get the one name that export looks up
    if (!entries.some((e) => e.entry.name)) continue;
    const uses = entries
      .map((e) => ({ ...e, name: nameOf(e.entry) }))
      .filter((use) => use.name.length > 0);
    // the sessions that use each name; a session that names the language in both of
    // its fields counts once
    const sessionsByName = new Map<string, Set<string>>();
    for (const use of uses) {
      const key = use.name.toLowerCase();
      if (!sessionsByName.has(key)) sessionsByName.set(key, new Set());
      sessionsByName.get(key)!.add(use.sessionId);
    }
    if (sessionsByName.size < 2) continue;
    const ranked = [...sessionsByName.entries()]
      .map(([name, sessions]) => [name, sessions.size] as const)
      .sort((a, b) => b[1] - a[1]);
    const tie = ranked[0][1] === ranked[1][1];
    const names = [...new Map(uses.map((u) => [u.name.toLowerCase(), u.name])).values()]
      .map((n) => `"${n}"`)
      .join(", ");
    const reported = new Set<string>();
    for (const use of uses) {
      if (!tie && use.name.toLowerCase() === ranked[0][0]) continue;
      const place = use.sessionId + "|" + use.fieldKey;
      if (reported.has(place)) continue;
      reported.add(place);
      problems.push({
        checkId: "languageNameVariations",
        severity: "warning",
        ...wordProblem(
          t({
            message: `Language ${code}`,
            comment: 'A language code follows "Language", as in "Language etr"',
          }),
          t({
            message: `has different names in different sessions: ${names}.`,
            comment:
              'Follows "Language" and a language code, as in "Language etr has different names in different sessions: "Edolo", "Etoro"."',
          }),
        ),
        target: { folderType: "session", folderId: use.sessionId, fieldKey: use.fieldKey },
      });
    }
  }
}
