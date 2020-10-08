import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
const moment = require("moment");
//import nodeArchiver = require("archiver");
import * as nodeArchiver from "archiver";
import * as fs from "fs";
import { FieldType, Field } from "../model/field/Field";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";

export const kEol: string = require("os").EOL;

let currentKnownFields: FieldDefinition[];

/* Paradisec' sample spreadsheet has these columns:

"Item Identifier (e.g. 1995Elders)"	
"Item Title (e.g. Introductory Materials)"	
"Item Description (e.g. Four text stories for interviews)"	
"Content Language (Language as spoken in file)"	
"Subject Language (Language discussed) "	
"Country/Countries (separate countries with | )"	
"Origination Date (when the item finished being created  "	
"Region (e.g. Oceania, Indian Ocean, Polynesia)"	
"Original media (e.g. Text)"	
"Data Categories"	
"Data Type"	
"Discourse Type"
"Dialect (e.g. Viennese)"	
"Language as given (e.g. German)"	
Role	
First name	
Last name
*/

export function makeGenericCsvZipFile(
  path: string,
  project: Project,
  folderFilter: (f: Folder) => boolean
) {
  makeZipFile(path, (archiver) =>
    genericCsvExporter(project, archiver, folderFilter)
  );
}
export function makeZipFile(
  path: string,
  exporter: (archive: nodeArchiver.Archiver) => void
) {
  const output = fs.createWriteStream(path);
  const archive = nodeArchiver.create("zip");
  // listen for all archive data to be written
  // 'close' event is fired only when a file descriptor is involved
  output.on("close", () => {});

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      console.log("csv makeZipFile Warning: " + err);
    } else {
      // throw error
      throw err;
    }
  });

  // good practice to catch this error explicitly
  archive.on("error", (err) => {
    console.log("csv makeZipFile error: " + err);
    alert("csv makeZipFile error: " + err);
  });

  // pipe archive data to the file
  archive.pipe(output);

  exporter(archive);

  archive.finalize();
}

export function genericCsvExporter(
  project: Project,
  archive: nodeArchiver.Archiver,
  folderFilter: (f: Folder) => boolean
) {
  archive.append(makeCsvForProject(project), { name: "project.csv" });
  archive.append(makeCsvForSessions(project, folderFilter), {
    name: "sessions.csv",
  });
  archive.append(makeCsvForPeople(project), { name: "people.csv" });
}

function getKeys(folders: Folder[]): string[] {
  const foundFields: string[] = [];
  folders.forEach((folder) => {
    folder.properties.keys().forEach((key) => {
      if (foundFields.indexOf(key) < 0) {
        foundFields.push(key);
      }
    });
  });
  return foundFields;
}

// folders: a set of person folders, or a set of session folders
function getGenericCsv(folders: Folder[]): string {
  if (folders.length === 0) {
    // without even one folder (one person, or one session), this code can't even determine the fields, so just bail
    return "";
  }
  currentKnownFields = folders[0].knownFields;
  const blacklist = [
    "modifiedDate",
    "size",
    "type",
    "hasConsent",
    "displayName",
    "filename",
  ];
  const foundFields = getKeys(folders)
    .filter((k) => {
      if (blacklist.indexOf(k) > -1) return false;
      if (folders[0].properties.getValue(k)?.definition.omitExport) {
        console.log("will not export " + k);
        return false;
      }
      return true;
    })

    .sort(sortFields);
  let header = foundFields.join(",");
  // we have a bit of hassle in that contributions are currently
  // implemented outside of normal Fields. That would be a good enhancement,
  // then this and the addContributionsIfSession() below could be removed.
  if (folders[0] instanceof Session) {
    header += ",contributions";
  }
  const lines = folders
    .map((folder) => {
      const line = foundFields
        .map((key) => {
          const field = folder.properties.getValue(key);
          if (
            !field
            // wait no don't make it impossible to export PII || ( field?.definition?.personallyIdentifiableInformation)
          ) {
            return "";
          }
          let value = "";
          if (field.type === FieldType.PersonLanguageList) {
            value = getLanguagesOfPerson(folder as Person);
          } else {
            value = fieldToCsv(field);
          }
          //console.log(`log csv ${key}:fieldValue=${field}:csv=${value}`);
          return csvEncode(value);
        })
        .concat(addContributionsIfSession(folder))
        .join(",");
      return line;
    })
    .join(kEol);

  return header + kEol + lines;
}

function getLanguagesOfPerson(person: Person): string {
  return person.languages
    .map((l) => {
      let n = l.code;
      if (l.primary) n = "*" + n;
      if (l.mother) n = n + " (also mother)";
      if (l.father) n = n + " (also father)";
      return n;
    })
    .join("|");
}
function addContributionsIfSession(folder: Folder): string[] {
  if (!(folder instanceof Session)) {
    return [];
  }
  const session = folder as Session;
  return [
    session
      .getAllContributionsToAllFiles()
      .map((c) => [c.role, c.personReference].join(":"))
      .join("|"),
  ];
}

function fieldToCsv(field: Field): string {
  switch (field.type) {
    case FieldType.Text:
      return field.text;
    case FieldType.Date:
      return field.asISODateString();
    // case FieldType.Contributions:
    //   return field.contributorsArray
    //     .map(c => [c.role, c.personReference].join(":"))
    //     .join("|");
    default:
      return field.text;
  }
}

function sortFields(a: string, b: string): number {
  let ai = currentKnownFields.findIndex((f) => f.key === a);
  let bi = currentKnownFields.findIndex((f) => f.key === b);
  // unlisted fields go to the end
  ai = ai === -1 ? 1000 : ai;
  bi = bi === -1 ? 1000 : bi;
  if (ai !== bi) {
    return ai > bi ? 1 : ai < bi ? -1 : 0;
  }
  return a > b ? 1 : a < b ? -1 : 0;
}

export function csvEncode(value: string): string {
  let needsQuotes = false;
  needsQuotes = value.indexOf(",") > -1;

  // mac,linux, windows all have an \r, so that's
  // enough, even though windows also has \n.
  needsQuotes = needsQuotes || value.indexOf("\r") > -1;

  // the rfc spec seems astonishingly inconsistent on the question of
  // whether quotes should be escaped if the entire field is not surrounded in quotes

  value = value.replace(/"/g, '""');

  if (needsQuotes) {
    // If double-quotes are used to enclose fields, then a double-quote
    // appearing inside a field must be escaped by preceding it with
    //  another double quote.
    //value = value.replace(/"/g, '""');
    return '"' + value + '"';
  }
  return value;
}

export function makeCsvForProject(project: Project): string {
  return getGenericCsv([project]);
}
export function makeCsvForPeople(project: Project): string {
  return getGenericCsv(project.persons);
}

export function makeCsvForSessions(
  project: Project,
  folderFilter: (f: Folder) => boolean
): string {
  return getGenericCsv(project.sessions.filter(folderFilter));
}
