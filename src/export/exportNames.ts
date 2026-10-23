import * as Path from "path";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
import { File } from "../model/file/File";
import { sanitizeForExport } from "../other/sanitizeForArchive";

// The folders that an IMDI or OPEX export makes next to the session folders
const kDocumentFolderNames = ["OtherDocuments", "DescriptionDocuments", "ConsentDocuments"];

// Windows does not tell names apart by case
const key = (name: string) => name.toLowerCase();

// Sanitizes each name for an IMDI or OPEX export, numbering any that would then be the
// same as another one, or as a taken name: "Tape 1" and "Tape_1" become "Tape_1_2" and
// "Tape_1". A name that sanitizing leaves unchanged keeps it.
export function uniqueExportNames(names: string[], taken: string[] = []): string[] {
  const sanitized = names.map(sanitizeForExport);
  const used = new Set(taken.map(key));
  const result: string[] = new Array(names.length);
  const unchangedFirst = names
    .map((_, i) => i)
    .sort((a, b) => Number(sanitized[b] === names[b]) - Number(sanitized[a] === names[a]));
  for (const i of unchangedFirst) {
    const extension = Path.extname(sanitized[i]);
    const base = sanitized[i].slice(0, sanitized[i].length - extension.length);
    let name = sanitized[i];
    for (let n = 2; used.has(key(name)); n++) name = `${base}_${n}${extension}`;
    used.add(key(name));
    result[i] = name;
  }
  return result;
}

// The name of each session's folder in an IMDI or OPEX export. It is worked out from all
// of the project's sessions, so that it does not depend on which of them are exported.
export function sessionFolderExportNames(project: Project): Map<Folder, string> {
  const sessions = project.sessions.items;
  const names = uniqueExportNames(
    sessions.map((s) => Path.basename(s.directory)),
    kDocumentFolderNames,
  );
  return new Map(sessions.map((s, i) => [s, names[i]]));
}

// The name of each of a folder's files in an IMDI or OPEX export
export function fileExportNames(files: File[]): Map<File, string> {
  const names = uniqueExportNames(
    files.map((f) => f.getNameToUseWhenExportingUsingTheActualFile()),
  );
  return new Map(files.map((f, i) => [f, names[i]]));
}
