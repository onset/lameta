import { Folder } from "../Folder/Folder";
import { Project } from "./Project";
import { Session } from "./Session/Session";
import { Person } from "./Person/Person";

// Exports leave out a session or person whose metadata file could not be read:
// lameta knows nothing about it but its folder name. lametaChecks.ts reports it.
// Exporters use these instead of project.sessions.items, project.persons.items
// and project.findPerson().

export function exportableSessions(project: Project): Session[] {
  return (project.sessions.items as Session[]).filter(hasReadableMetadata);
}

export function exportablePersons(project: Project): Person[] {
  return (project.persons.items as Person[]).filter(hasReadableMetadata);
}

export function findPersonToExport(project: Project, name: string): Person | undefined {
  const person = project.findPerson(name);
  return person && hasReadableMetadata(person) ? person : undefined;
}

export function hasReadableMetadata(folder: Folder): boolean {
  return folder.metadataFile?.metadataReadProblem === undefined;
}
