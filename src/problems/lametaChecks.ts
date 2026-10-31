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
import { CheckSettings, enabledChecks } from "./checkSettings";
import { checkExportedFiles, isExported } from "./exportedFileChecks";
import { findPersonToExport, hasReadableMetadata } from "../model/Project/exportableFolders";
import {
  checkSessionResourcesAndTranslations,
  genreElements,
  readMultilingual,
} from "./translationAndResourceChecks";
import {
  isLanguageName,
  iso639_3ForExport,
  languageEntryNameForExport,
} from "../export/languageNameForExport";

// lameta's checks of a whole project, beyond the rules of single fields. Each has a
// name, its checkId, and a configuration turns it on in its settings.json5, with a
// severity and any settings that it needs (see checkSettings.ts). Like the field rules,
// they read only the project's own data, so they are cheap enough to run after each
// edit.

// adds a problem, if its check is on, with the severity that the configuration gives it
export type Report = (problem: Omit<IFieldProblem, "severity">) => void;

export function checkProjectFolders(project: Project): IFieldProblem[] {
  const problems: IFieldProblem[] = [];
  const checks = enabledChecks(GetOtherConfigurationSettings().checks);
  const add: Report = (problem) => {
    const settings = checks.get(problem.checkId);
    if (settings) problems.push({ ...problem, severity: settings.severity });
  };
  const checkReadable = (file: File, target: NavigationTarget, text: string) => {
    if (file.metadataReadProblem === undefined) return;
    add({
      checkId: "metadataUnreadable",
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
        add({
          checkId: "fileNameNotAllowed",
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
  // each genre's English, by the value that sessions store
  const genresInEnglish = new Map<string, string>();
  for (const session of project.sessions.items as Session[]) {
    checkFiles(session, "session", session.id);
    // export leaves out a session whose metadata lameta could not read
    if (hasReadableMetadata(session)) {
      checkExportedFiles(session, checks, add);
      checkContributorsHaveFullNames(project, session, checks, add);
      checkGenreInList(project, session, checks, add, genresInEnglish);
      checkSessionResourcesAndTranslations(project, session, checks, add);
    }
    const otherFiles = session.files.filter((f) => f !== session.metadataFile);
    if (checks.has("sessionWithoutFiles") && !otherFiles.some(isExported)) {
      add({
        checkId: "sessionWithoutFiles",
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
                comment: 'Follows "Session", as in "Session has no files that export can include."',
              }),
              t`Export leaves out a file that is missing from this computer and a file whose name ends in ".skip".`,
            )),
        target: { folderType: "session", folderId: session.id },
      });
    }
    if (!session.files.some((f) => f.contributions.some((c) => c.personReference?.trim()))) {
      add({
        checkId: "sessionWithoutContributors",
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
        add({
          checkId: "contributorWithoutPerson",
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
  if (checks.has("languageNameVariations")) checkLanguageNames(project, add);
  for (const person of project.persons.items as Person[]) {
    checkFiles(person, "person", person.getIdToUseForReferences());
    const consent = person.properties.getValue("hasConsent");
    if (
      contributingPeople.has(person) &&
      consent instanceof HasConsentField &&
      !consent.hasConsent()
    ) {
      add({
        checkId: "contributorWithoutConsent",
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
  checkProjectName(project, checks, add);
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
  return problems;
}

// One language code that sessions give different names, compared as the IMDI writes
// them. Only a session's language field can do this, through an entry that carries its
// own name, such as "etr:Edolo".
// A person's languages cannot: export names them from their code alone.
// Names that differ only in capitalisation count as one. The sessions that use a name
// other than the one that most use are reported; when two names are equally common,
// every session is.
function checkLanguageNames(project: Project, add: Report) {
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
      add({
        checkId: "languageNameVariations",
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

// A session with contributors, none of whom has a full name in the IMDI: the name of
// the person they are, or for a contributor who matches no person, the name that the
// contribution gives
function checkContributorsHaveFullNames(
  project: Project,
  session: Session,
  checks: Map<string, CheckSettings>,
  add: Report,
) {
  if (!checks.has("sessionContributorsWithoutFullName")) return;
  const fullNames = session
    .getAllContributionsToAllFiles()
    .map((c) => c.personReference.trim())
    .filter((name) => name.length > 0)
    .map((name) => {
      const person = findPersonToExport(project, name);
      return person ? person.properties.getTextStringOrEmpty("name").trim() : name;
    });
  if (fullNames.length > 0 && !fullNames.some((name) => name)) {
    add({
      checkId: "sessionContributorsWithoutFullName",
      ...wordProblem(
        t`Session`,
        t({
          message: "has no contributor with a full name.",
          comment: 'Follows "Session", as in "Session has no contributor with a full name."',
        }),
      ),
      target: { folderType: "session", folderId: session.id, fieldKey: "contributions" },
    });
  }
}

// A genre that is not in the configuration's list. The genre is compared in English, as
// the IMDI export writes it; a genre that the IMDI has only in other languages is not
// compared.
function checkGenreInList(
  project: Project,
  session: Session,
  checks: Map<string, CheckSettings>,
  add: Report,
  genresInEnglish: Map<string, string>,
) {
  const settings = checks.get("genreInList") as (CheckSettings & { genres: string[] }) | undefined;
  if (!settings) return;
  const value = session.properties.getTextStringOrEmpty("genre");
  // Working out the English looks at the translations of the genre, so it is done once
  // for each value
  let english = genresInEnglish.get(value);
  if (english === undefined) {
    english = genreInEnglish(project, session);
    genresInEnglish.set(value, english);
  }
  if (!english || english === "Unknown" || english === "Unspecified") return;
  if (settings.genres.some((g) => g.toLowerCase() === english.toLowerCase())) return;
  const archive = project.properties.getTextStringOrEmpty("archiveConfigurationName");
  add({
    checkId: "genreInList",
    ...wordProblem(
      undefined,
      t({
        message: `Genre "${english}" is not in the ${archive} genre list. Please consider using a standardised genre.`,
        comment:
          'The first value is a genre, the second the name of an archive, as in: Genre "Story" is not in the ELAR genre list.',
      }),
    ),
    target: { folderType: "session", folderId: session.id, fieldKey: "genre" },
  });
}

// A genre in English, as the IMDI export writes it, or "" if the IMDI has it only in
// other languages
function genreInEnglish(project: Project, session: Session): string {
  const genre = readMultilingual(genreElements(project, session));
  return genre.hasEnglish ? genre.english : "";
}

// The project's name, which the IMDI export writes as the corpus's name
function checkProjectName(project: Project, checks: Map<string, CheckSettings>, add: Report) {
  const settings = checks.get("projectName") as
    | (CheckSettings & { pattern: string; maxLength: number })
    | undefined;
  if (!settings) return;
  const name = project.properties.getTextStringOrEmpty("name").trim();
  const report = (text: string) =>
    add({
      checkId: "projectName",
      ...wordProblem(t`Project name`, text),
      target: { folderType: "project", fieldKey: "name" },
    });
  if (!name) {
    report(
      t({
        message: "is empty.",
        comment: 'Follows "Project name", as in "Project name is empty."',
      }),
    );
    return;
  }
  if (!new RegExp(settings.pattern).test(name))
    report(
      t({
        message: "has characters that aren't allowed.",
        comment:
          'Follows "Project name", as in "Project name has characters that aren\'t allowed."',
      }),
    );
  if (name.length > settings.maxLength)
    report(
      t({
        message: `is too long (${name.length} characters).`,
        comment: 'Follows "Project name", as in "Project name is too long (40 characters)."',
      }),
    );
}
