import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
import { Session } from "../model/Project/Session/Session";
import { csvEncode, kEol } from "./CsvExporter";
import * as fs from "fs";
import { sentryBreadCrumb } from "../other/errorHandling";

export function makeParadisecCsv(
  path: string,
  project: Project,
  sessionFilter: (f: Folder) => boolean
) {
  sentryBreadCrumb("makeParadisecCsv()");
  const csv =
    makeParadisecProjectFieldsCsv(project) +
    kEol +
    kEol +
    makeParadisecSessionCsv(project, sessionFilter);
  fs.writeFileSync(path, csv);
}

export function makeParadisecProjectFields(project: Project): string[][] {
  const rows: string[][] = [];
  rows.push([
    "Collection ID",
    project.properties.getTextStringOrEmpty("grantId")
  ]);
  rows.push([
    "Collection Title",
    project.properties.getTextStringOrEmpty("fundingProjectTitle")
  ]);

  const projectDescriptionBlacklist = [
    "modifiedDate",
    "size",
    "type",
    "filename",
    "projectDescription",
    "id", // output in its own column
    "grantId", // output in its own column
    "depositor", // output in its own column
    "fundingProjectTitle" // output in its own column
  ];

  const descriptionWithHomelessFields = getDescriptionWithAllHomelessFields(
    project,
    "projectDescription",
    projectDescriptionBlacklist,
    (key) =>
      key
        .replace("vernacularIso3CodeAndName", "subject-lang")
        .replace("analysisIso3CodeAndName", "working-lang")
  );

  rows.push(["Collection Description", descriptionWithHomelessFields]);
  const { first, last } = parseNameIntoFirstAndLast(
    project.properties.getTextStringOrEmpty("depositor")
  );
  rows.push(["Collector First Name", first.trim()]);
  rows.push(["Collector Last Name", last.trim()]);

  return rows;
}

export function makeParadisecProjectFieldsCsv(project: Project): string {
  return makeParadisecProjectFields(project)
    .map((row) => row.map((column) => csvEncode(column)).join(","))
    .join(kEol);
}

interface IColumn {
  header: string;
  property: string;
  func?: (session: Session) => string;
}
const columns: IColumn[] = [];
function col(
  header: string,
  property: string,
  func?: (session: Session) => string
) {
  columns.push({ header, property, func });
}

col("Item Identifier", "id");
col("Item Title", "title");
col("Item Description", "unused because we're using a function", (session) =>
  getDescriptionWithAllHomelessFields(
    session,
    "description",
    sessionBlacklist,
    (key) => key
  )
);

/* If the recording is people speaking in English about Chinese, then
  +----------+---------+-----------+-----------+
  | language | lameta  | elar/imdi | PARADISEC |
  +----------+---------+-----------+-----------+
  | English  | working | working   | content   |
  | Chinese  | subject | content   | subject   |
  +----------+---------+-----------+-----------+
  */
col("Content Language", "", (session) =>
  session.getWorkingLanguageCodes().join(",")
);
col("Subject Language", "", (session) =>
  session.getSubjectLanguageCodes().join(",")
);

col("Country/Countries", "locationCountry");
col("Origination Date", "date");
col("Region", "locationRegion");
col("Original media", ""); // lameta has multiple files and we don't know which one is the primary one that this is wanting. Nick says "can be ignored"

/* must be one of: historical reconstruction, historical text, instrumental music, language description, lexicon, primary text, song, typological analysis*/
col("Data Categories", ""); // our "genre" has some of these (e.g. instrumental music)

/* must be one of:Collection, Dataset, Event, Image, Interactive Resource, MovingImage, PhysicalObject, Service, Software, Sound, StillImage, Text */
col("Data Type", ""); // Maybe add to More Fields?

/* Paradisec list is different: drama, formulaic_discourse, interactive_discourse, language_play, narrative, procedural_discourse, report, singing, or unintelligible_speech */
col("Discourse Type", "genre");
col("Dialect", ""); // Could add to More Fields, or better, expand our language code from iso639-3 to language tags? E.g. en-GB.

col("Language as given", ""); // We don't have a field for this. Maybe add to More Fields?

const contributorColumns: IColumn[] = [];
/* Add up to six roles. All roles must have a first name. If there is no last name, leave the last name column blank, and enter information about additional roles starting in the next “Role” column. Acceptable roles are author , compiler , consultant , data_inputter , depositor , editor , interviewer , participant , performer , photographer , recorder , researcher , singer , speaker , translator */
contributorColumns.push({ header: "Role", property: "" });
contributorColumns.push({ header: "First name", property: "" });
contributorColumns.push({ header: "Last name", property: "" });

export function makeParadisecSessionFields(
  project: Project,
  sessionFilter: (f: Folder) => boolean
): string[][] {
  const lines: string[][] = [];
  const header = columns.map((c) => c.header);

  // contributions come in groups of 3 columns. In order to put a header over each one, we need
  // do know how many their will be.
  let contributionGroups = 0;
  project.sessions.items.filter(sessionFilter).forEach((session: Session) => {
    contributionGroups = Math.max(
      contributionGroups,
      session.getAllContributionsToAllFiles().length
    );
  });
  //console.log("contributionGroups:" + contributionGroups);
  for (let i = 0; i < contributionGroups; i++) {
    header.push("Role", "First Name", "Last Name");
  }
  lines.push(header);

  project.sessions.items.filter(sessionFilter).forEach((session: Session) => {
    const l = columns
      .map((c) =>
        c.func
          ? c.func(session)
          : session.properties.getTextStringOrEmpty(c.property)
      )
      .concat(getContributions(project, session));
    lines.push(l);
  });
  return lines;
}

export function makeParadisecSessionCsv(
  project: Project,
  sessionFilter: (f: Folder) => boolean
): string {
  return makeParadisecSessionFields(project, sessionFilter)
    .map((row) => row.map((column) => csvEncode(column)).join(","))
    .join(kEol);
}

const sessionBlacklist = [
  "modifiedDate",
  "size",
  "type",
  "filename",
  "id", // output in its own column
  "title", // output in its own column
  "languages", // output in its own column
  "date", // output in its own column
  "genre" // output as "Discourse Type"
];

function getDescriptionWithAllHomelessFields(
  folder: Folder,
  descriptionField: string,
  blacklist: string[],
  relabel: (label: string) => string
): string {
  const descriptionComponents = [
    folder.properties.getTextStringOrEmpty(descriptionField)
  ];
  folder.properties.keys().forEach((key) => {
    if (blacklist.indexOf(key) < 0) {
      const fieldContents = folder.properties.getTextStringOrEmpty(key);
      if (fieldContents && fieldContents.length > 0) {
        descriptionComponents.push(`${relabel(key)}: ${fieldContents}`);
      }
    }
  });
  return descriptionComponents.join(" | ");
}

// Get 3 fields for each contributor: [role,first,last,role,first,last,role,first,last, etc]
function getContributions(project: Project, session: Session): string[] {
  const cols: string[] = [];
  /* Spreadsheet says: "Add up to six contributions" */
  session.getAllContributionsToAllFiles().map((contribution) => {
    const trimmedName = contribution.personReference.trim();
    const person = project.findPerson(trimmedName);
    // output the person even if they are not in the list of people because... well we have all the info
    // that the paradisec format wants already (name & role)
    //if (person) {
    /* Spreadsheet says: Acceptable roles are author , compiler , consultant , data_inputter , depositor , editor , interviewer , participant , performer , photographer , recorder , researcher , singer , speaker , translator*/
    cols.push(contribution.role);
    const { first, last } = parseNameIntoFirstAndLast(trimmedName);
    cols.push(first);
    cols.push(last);
  });
  return cols;
}
export function parseNameIntoFirstAndLast(depositor: string): {
  first: string;
  last: string;
} {
  let first = "";
  let last = "";
  if (depositor.trim().length > 0) {
    if (depositor.indexOf(",") > -1) {
      [last, first] = depositor.split(",");
    } else {
      if (depositor.split(" ").length > 2) {
        let middle = "";
        [first, middle, last] = depositor.split(" ");
        first = first + " " + middle;
      } else {
        [first, last] = depositor.split(" ");
      }
    }
  }
  return { first: first?.trim() || "", last: last?.trim() || "" };
}
