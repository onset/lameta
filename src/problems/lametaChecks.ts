import * as Path from "path";
import { t } from "@lingui/core/macro";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { Folder } from "../model/Folder/Folder";
import { sanitizeForArchive } from "../other/sanitizeForArchive";
import { IFieldProblem, wordProblem } from "./fieldRules";

// Checks that lameta makes for every archive configuration, beyond the rules of
// single fields: file names against the configuration's fileNameRules, and
// contributors who have no matching person. Like the field rules, they read only
// the project's own data, so they are cheap enough to run after each edit.
export function checkProjectFolders(project: Project): IFieldProblem[] {
  const problems: IFieldProblem[] = [];
  const checkFileNames = (folder: Folder, folderType: "session" | "person", folderId: string) => {
    for (const file of folder.files) {
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

  for (const session of project.sessions.items as Session[]) {
    checkFileNames(session, "session", session.id);
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
        if (project.findPerson(name)) continue;
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
  for (const person of project.persons.items as Person[]) {
    checkFileNames(person, "person", person.getIdToUseForReferences());
  }
  return problems;
}
