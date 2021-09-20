import { Project } from "../../model/Project/Project";
import * as temp from "temp";
import { Session } from "../../model/Project/Session/Session";
import { addPersonToProject, addSessionToProject } from "./MatrixImporter";
import {
  MappedMatrix,
  CellImportStatus,
  RowImportStatus,
  MappedColumnInfo,
  MappedRow,
  IMappedCell,
} from "./MappedMatrix";
import { Person } from "../../model/Project/Person/Person";

let project: Project;
let projectDir = temp.mkdirSync("lameta spreadsheet importer test");

describe("addSessionToProject", () => {
  beforeAll(() => {
    //  project = Project.fromDirectory("sample data/Edolo sample");
    project = Project.fromDirectory(projectDir);
  });
  beforeEach(() => {
    project.sessions = [];
  });
  it("Can import one row with just id column", () => {
    const session = makeMatrixAndImportThenGetSession({ id: "foo" });
    expect(project.sessions.length).toBe(1);
    expect(session.id).toBe("foo");
  });

  it("Can import one normal person row", () => {
    const person = makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      primaryOccupation: "Musician",
    });
    expect(person.displayName).toBe("Joe Strummer");
    expect(person.properties.getTextStringOrEmpty("primaryOccupation")).toBe(
      "Musician"
    );
  });

  it("Can import one normal session row", () => {
    const session = makeMatrixAndImportThenGetSession({
      id: "foo",
      title: "London Calling",
      date: "7/27/2021",
      genre: "drama",
      subgenre: "play",
    });
    expect(session.id).toBe("foo");
    expect(session.properties.getDateField("date").asISODateString()).toBe(
      "2021-07-27"
    );
    expect(session.properties.getTextStringOrEmpty("title")).toBe(
      "London Calling"
    );
    expect(session.properties.getTextStringOrEmpty("genre")).toBe("drama");
    expect(session.properties.getTextStringOrEmpty("subgenre")).toBe("play");
  });
  it("Can import one contribution", () => {
    const session = makeMatrixAndImportThenGetSession({
      id: "foo",
      "contribution.name": "Joe Strummer",
      "contribution.role": "Singer",
      "contribution.comments": "vocals",
    });
    expect(session.metadataFile.contributions.length).toBe(1);
    expect(session.metadataFile.contributions[0].personReference).toBe(
      "Joe Strummer"
    );
    expect(session.metadataFile.contributions[0].role).toBe("Singer");
    expect(session.metadataFile.contributions[0].comments).toBe("vocals");
  });
});

/*
import {
  mapSpreadsheetRecord,
  lingmetaxSessionMap,
} from "./SpreadsheetToMatrix";




// Really, this should be just "" but this causes wallabyjs to give "TypeError: Cannot read property '0' of undefined"
// about half the time. Todo: how can we figure out the actual pat at runtime?
const lingMetaPath = "c:/dev/lameta/sample data/LingMetaX.xlsx";

initializeAnalytics();
beforeAll(() => {
  //  project = Project.fromDirectory("sample data/Edolo sample");
  project = Project.fromDirectory(projectDir);
});
afterAll(() => {
  project = undefined;
  fs.rmdirSync(projectDir, { recursive: true });
});

describe("csv importer", () => {
  beforeEach(() => {
    project.sessions = [];
  });

  it("handles case where the dest field doesn't exist", () => {});
  it("handles bogus dates", () => {});
  it("handles various forms of language ids", () => {});
  it("handles missing id", () => {
    // I suppose we just make one?
  });
  it("lingMetaX --> SimpleLametaSessionJson", () => {
    const sampleLingMetaXSessionRecord = {
      date: "2020-10-20",
      title: "the title",
      filename: "20200127_RGb",
      description:
        "Ullamco consectetur do nisi est id laboris culpa voluptate veniam dolor id consequat sint aliquip.",
      location_region: "some region",
      location_country: "Papua New Guinea",
      location_local: "Huya",
      archive_repository: "ELAR",
      genre: "drama",
      subgenre: "play",
      topic: "some topic",
      keywords: "alpha particles, beta",
      involvement: "elicited",
      planning: "spontaneous",
      social_context: "public",
      subject_languages: "etr;tpi",
      working_languages: "en",
      access_ELAR: "Open",
      video: "sony 123, zoom 456",
      audio: "zoom silver thing",
      other_equipment: "sun shade",
      recording_conditions: "windy",
      participant_1_full_name: "Joe Strummer",
      participant_1_role: "vocals",
      participant_2_full_name: "Mick Jones",
      participant_2_role: "guitar",
      temperature: "hot!",
    };
    const simpleLametaSessionJson = mapSpreadsheetRecord(
      sampleLingMetaXSessionRecord,
      lingmetaxSessionMap
    );
    expect(Object.keys(simpleLametaSessionJson.custom).length).toBe(5);
    expect(simpleLametaSessionJson.planningType).toBe("spontaneous");
  });

  it("SimpleLametaSessionJson --> Session Objects", () => {
    //finalStageBeforeCreation
    const lametaSessionRecord = {
      id: "1234",
      title: "foo",
      date: "2010-3-10",
      genre: "drama",
      custom: { myCustomColor: "red" },
    };

    const session = addSessionToProject(project, lametaSessionRecord);
    expect(session.properties.getTextStringOrEmpty("title")).toBe("foo");
    expect(session.properties.getTextStringOrEmpty("myCustomColor")).toBe(
      "red"
    );
  });

  it("Full SpreadSheet Import: big main fields", () => {
    importSpreadsheet(project, lingMetaPath);

    expect(project.sessions.length).toBe(4);

    // Row 2, the first session, is just all normal
    expect(fieldOfRow(2, "title")).toBe("Normal");
    expect(fieldOfRow(2, "id")).toBe("take.mp3");
    expect(
      sessionOfRow(2).properties.getDateField("date").asISODateString()
    ).toBe("2021-06-10");

    // Row 3, "without" date
    expect(
      sessionOfRow(3).properties.getDateField("date").asISODateString()
    ).toBe("");

    // Row 4 has no "filename"
    expect(fieldOfRow(4, "id")).toBe("New Session");

    // Row 5 has no title
    expect(fieldOfRow(5, "title")).toBe("");
  });
  it("Full SpreadSheet Import: Contributions", () => {
    importSpreadsheet(project, lingMetaPath);

    // Row 2, the first session, has all five role filled in
    expect(sessionOfRow(2).metadataFile.contributions.length).toBe(5);
    expect(sessionOfRow(2).metadataFile.contributions[0].personReference).toBe(
      "Joe Strummer"
    );
    expect(sessionOfRow(2).metadataFile.contributions[0].role).toBe("Recorder");

    //
    expect(sessionOfRow(3).metadataFile.contributions.length).toBe(1);
    expect(sessionOfRow(3).metadataFile.contributions[0].personReference).toBe(
      "Vince White"
    );
    // the role for Vince White is missing in the spreadsheet
    expect(sessionOfRow(3).metadataFile.contributions[0].role).toBe("");

    expect(sessionOfRow(4).metadataFile.contributions[0].personReference).toBe(
      "Mick Jones"
    );
    expect(sessionOfRow(4).metadataFile.contributions[0].role).toBe("Author");

    // row 5 has a particpant but no role, should just not make a contribution
    expect(sessionOfRow(5).metadataFile.contributions.length).toBe(0);
  });
});

function sessionOfRow(row: number) {
  return project.sessions[row - 2];
}
function fieldOfRow(row: number, field: string): string {
  return sessionOfRow(row).properties.getTextStringOrEmpty(field);
}
*/

function simpleColumn(key: string): MappedColumnInfo {
  return Object.assign(new MappedColumnInfo(), {
    incomingLabel: key,
    lametaProperty: key,
    mappingStatus: "Identity",
  });
}
function simpleCell(property: string, value: string): IMappedCell {
  return {
    column: simpleColumn(property),
    value,
    importStatus: CellImportStatus.OK,
  };
}
function makeRow(values: any): MappedRow {
  const row: MappedRow = new MappedRow();
  Object.keys(values).forEach((key) =>
    row.cells.push(simpleCell(key, values[key]))
  );
  return row;
}
function makeMatrixAndImportThenGetSession(values: any): Session {
  const row = makeRow(values);
  addSessionToProject(project, row);
  return project.sessions[0];
}
function makeMatrixAndImportThenGetPerson(values: any): Person {
  const row = makeRow(values);
  addPersonToProject(project, row);
  return project.persons[0];
}
