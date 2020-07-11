import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
import { Session } from "../model/Project/Session/Session";
import { csvEncode, kEol } from "./CsvExporter";
import * as fs from "fs";

export function makeParadisecCsv(
  path: string,
  project: Project,
  sessionFilter: (f: Folder) => boolean
) {
  const csv =
    makeParadisecProjectFieldsCsv(project) +
    kEol +
    kEol +
    makeParadisecSessionCsv(project, sessionFilter);
  fs.writeFileSync(path, csv);
}

export function makeParadisecProjectFieldsCsv(project: Project) {
  const lines: string[] = [];
  lines.push(
    "Collection ID," + csvEncode(project.properties.getTextStringOrEmpty("id"))
  );
  lines.push(
    "Collection Title," +
      csvEncode(project.properties.getTextStringOrEmpty("title"))
  );
  lines.push(
    "Collection Description," +
      csvEncode(project.properties.getTextStringOrEmpty("projectDescription"))
  );
  const { first, last } = parseNameIntoFirstAndLast(
    project.properties.getTextStringOrEmpty("depositor")
  );
  lines.push("Collector First Name," + csvEncode(first.trim()));
  lines.push("Collector Last Name," + csvEncode(last.trim()));

  return lines.join(kEol);
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
col("Item Description", "description");
col("Content Language", "", getCommaSeparatedLanguageNames);
col("Subject Language", ""); // Maybe add to More Fields?

col("Country/Countries", "locationCountry");
col("Origination Date", "date");
col("Region", "locationRegion");
col("Original media", ""); // lameta has multiple files and we don't know which one is the primary one that this is wanting

/* must be one of: historical reconstruction, historical text, instrumental music, language description, lexicon, primary text, song, typological analysis*/
col("Data Categories", ""); // our "genre" has some of these (e.g. instrumental music)

/* must be one of:Collection, Dataset, Event, Image, Interactive Resource, MovingImage, PhysicalObject, Service, Software, Sound, StillImage, Text */
col("Data Type", ""); // Maybe add to More Fields?

/* Paradisec list is different: drama, formulaic_discourse, interactive_discourse, language_play, narrative, procedural_discourse, report, singing, or unintelligible_speech */
col("Discourse Type", "genre");
col("Dialect", ""); // Maybe add to More Fields?

col("Language as given", ""); // Maybe add to More Fields?

const contributorColumns: IColumn[] = [];
/* Add up to six roles. All roles must have a first name. If there is no last name, leave the last name column blank, and enter information about additional roles starting in the next “Role” column. Acceptable roles are author , compiler , consultant , data_inputter , depositor , editor , interviewer , participant , performer , photographer , recorder , researcher , singer , speaker , translator */
contributorColumns.push({ header: "Role", property: "" });
contributorColumns.push({ header: "First name", property: "" });
contributorColumns.push({ header: "Last name", property: "" });
function getCommaSeparatedLanguageNames(session: Session): string {
  // enhance: can we get at the name if it's qaa-qtx?
  return session.getContentLanguageCodes().join(",");
}
export function makeParadisecSessionCsv(
  project: Project,
  sessionFilter: (f: Folder) => boolean
) {
  const lines: string[] = [];
  let header = columns.map((c) => csvEncode(c.header)).join(",");

  // contributions come in groups of 3 columns. In order to put a header over each one, we need
  // do know how many their will be.
  let contributionGroups = 0;
  project.sessions.filter(sessionFilter).forEach((session) => {
    contributionGroups = Math.max(
      contributionGroups,
      session.getAllContributionsToAllFiles().length
    );
  });
  //console.log("contributionGroups:" + contributionGroups);
  for (let i = 0; i < contributionGroups; i++) {
    header += ",Role,First Name,Last Name";
  }
  lines.push(header);

  project.sessions.filter(sessionFilter).forEach((session) => {
    const l = columns
      .map((c) =>
        csvEncode(
          c.func
            ? c.func(session)
            : session.properties.getTextStringOrEmpty(c.property)
        )
      )
      .concat(getContributions(project, session))
      .join(",");
    lines.push(l);
  });
  return lines.join(kEol);
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
    cols.push(csvEncode(contribution.role));
    const { first, last } = parseNameIntoFirstAndLast(trimmedName);
    cols.push(csvEncode(first));
    cols.push(csvEncode(last));
  });
  return cols;
}
export function parseNameIntoFirstAndLast(
  depositor: string
): { first: string; last: string } {
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
