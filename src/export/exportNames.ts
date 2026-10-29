import * as Path from "path";
import { computed, IComputedValue } from "mobx";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
import { File } from "../model/file/File";
import { sanitizeForExport } from "../other/sanitizeForArchive";

// The folders that an IMDI or OPEX export makes next to the session folders
const kDocumentFolderNames = ["OtherDocuments", "DescriptionDocuments", "ConsentDocuments"];

// Windows does not tell names apart by case
const key = (name: string) => name.toLowerCase();

// The extensions of the metadata file that an IMDI or OPEX export writes next to each
// session folder and document folder
const kMetadataExtensions = [".imdi", ".opex"];

// Sanitizes each name for an IMDI or OPEX export, numbering any that would then be the
// same as another one, or as a taken name: "Tape 1" and "Tape_1" become "Tape_1_2" and
// "Tape_1". A name that sanitizing leaves unchanged keeps it. Each name, taken or not,
// also takes itself followed by each of the suffixes, so that "Tape_1" with the suffix
// ".imdi" cannot become the same as a name "Tape_1.imdi".
export function uniqueExportNames(
  names: string[],
  taken: string[] = [],
  suffixes: string[] = [],
): string[] {
  const sanitized = names.map(sanitizeForExport);
  const withSuffixes = (name: string) => [name, ...suffixes.map((s) => name + s)].map(key);
  const used = new Set(taken.flatMap(withSuffixes));
  const result: string[] = Array.from({ length: names.length });
  const unchangedFirst = names
    .map((_, i) => i)
    .sort((a, b) => Number(sanitized[b] === names[b]) - Number(sanitized[a] === names[a]));
  for (const i of unchangedFirst) {
    const extension = Path.extname(sanitized[i]);
    const base = sanitized[i].slice(0, sanitized[i].length - extension.length);
    let name = sanitized[i];
    for (let n = 2; withSuffixes(name).some((k) => used.has(k)); n++)
      name = `${base}_${n}${extension}`;
    for (const k of withSuffixes(name)) used.add(k);
    result[i] = name;
  }
  return result;
}

// The name of the corpus file of an IMDI or OPEX export, without its extension
export function corpusExportName(project: Project): string {
  return uniqueExportNames([project.displayName], kDocumentFolderNames, kMetadataExtensions)[0];
}

// The name of each session's folder in an IMDI or OPEX export, which also names its IMDI
// or OPEX file. It is worked out from all of the project's sessions, so that it does not
// depend on which of them are exported. An IMDI export writes each session's IMDI file
// beside the session folders, so no folder may have the name of another one's IMDI file.
export function sessionFolderExportNames(project: Project): Map<Folder, string> {
  const sessions = project.sessions.items;
  const names = uniqueExportNames(
    sessions.map((s) => Path.basename(s.directory)),
    [...kDocumentFolderNames, corpusExportName(project)],
    kMetadataExtensions,
  );
  return new Map(sessions.map((s, i) => [s, names[i]]));
}

const sessionFolderExportNamesOfProject = new WeakMap<
  Project,
  IComputedValue<Map<Folder, string>>
>();
const sessionFolderExportNameOfSession = new WeakMap<Folder, IComputedValue<string | undefined>>();

// The name of one session's folder in an IMDI or OPEX export. The name depends on every
// session of the project, but a reaction that reads it runs again only when this session's
// name changes, so adding a session does not make every session's IMDI due again.
export function sessionFolderExportName(project: Project, session: Folder): string | undefined {
  let names = sessionFolderExportNamesOfProject.get(project);
  if (!names) {
    names = computed(() => sessionFolderExportNames(project));
    sessionFolderExportNamesOfProject.set(project, names);
  }
  let name = sessionFolderExportNameOfSession.get(session);
  if (!name) {
    const namesOfProject = names;
    name = computed(() => namesOfProject.get().get(session));
    sessionFolderExportNameOfSession.set(session, name);
  }
  return name.get();
}

// The name of each of a folder's files in an IMDI or OPEX export. An OPEX export writes the
// folder's metadata file among them, so no file may have its name.
export function fileExportNames(files: File[], metadataFileName?: string): Map<File, string> {
  const names = uniqueExportNames(
    files.map((f) => f.getNameToUseWhenExportingUsingTheActualFile()),
    metadataFileName ? [metadataFileName] : [],
  );
  return new Map(files.map((f, i) => [f, names[i]]));
}
