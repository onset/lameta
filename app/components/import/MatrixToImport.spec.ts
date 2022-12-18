import { Project } from "../../model/Project/Project";
import * as temp from "temp";
import { Session } from "../../model/Project/Session/Session";
import {
  addImportedFolderToProject,
  createFolderInMemory,
  makeCustomField
} from "./MatrixImporter";
import {
  MappedMatrix,
  CellImportStatus,
  RowImportStatus,
  MappedColumnInfo,
  MappedRow,
  IMappedCell
} from "./MappedMatrix";
import { Person } from "../../model/Project/Person/Person";
import { i18n } from "@lingui/core";
jest.mock("@electron/remote", () => ({ exec: jest.fn() })); //See commit msg for info
import * as mobx from "mobx";
mobx.configure({
  enforceActions: "never"
});
import { i18nUnitTestPrep } from "../../other/localization";
import { IPersonLanguage } from "../../model/PersonLanguage";
i18nUnitTestPrep();

let project: Project;
let projectDir = temp.mkdirSync("lameta spreadsheet importer test");

describe("santizeCustomField", () => {
  it("can replace spaces", () => {
    expect(makeCustomField("one two       three", "foo").key).toBe(
      "one-two-three"
    );
  });
  it("can avoids multiple dashes", () => {
    expect(makeCustomField("one ---   two", "foo").key).toBe("one-two");
  });

  it("can handle other disallowed characters", () => {
    expect(makeCustomField("one !!<>&': two", "foo").key).toBe("one-two");
  });
});

describe("addSessionToProject", () => {
  beforeAll(() => {
    //  project = Project.fromDirectory("sample data/Edolo sample");
    project = Project.fromDirectory(projectDir);
  });
  beforeEach(() => {
    project.sessions.items.splice(0, 1000);
    project.persons.items.splice(0, 1000);
  });
  it("Can import one row with just id column", async () => {
    const session = await makeMatrixAndImportThenGetSession({ id: "foo" });
    expect(project.sessions.items.length).toBe(1);
    expect(session.id).toBe("foo");
  });
  it("Multiple person Languages in a column", async () => {
    const person = await makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      primaryLanguage: "spa",
      otherLanguages: "por;eng,fr"
    });

    expect(person.languages[0].code).toBe("spa");
    expect(person.languages[1].code).toBe("por");
    expect(person.languages[2].code).toBe("eng");
    expect(person.languages[3].code).toBe("fra");
    expect(person.languages.length).toBe(4);
  });
  it("Multiple father languages", async () => {
    const person = await makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      fathersLanguage: "spa;por,fr"
    });
    expect(person.languages.length).toBe(3);
    expect(person.languages[0].code).toBe("spa");
    expect(person.languages[1].code).toBe("por");
    expect(person.languages[2].code).toBe("fra");
  });
  it("Multiple primary languages", async () => {
    const person = await makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      primaryLanguage: "spa;por,fr"
    });

    expect(person.languages[0].code).toBe("spa");
    expect(person.languages[1].code).toBe("por");
    expect(person.languages[2].code).toBe("fra");
    expect(person.languages.length).toBe(3);
  });

  it("Languages appearing in other are only added once", async () => {
    const person = await makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      mothersLanguage: "spa", //"Español",
      primaryLanguage: "spa",
      otherLanguages: "spa" //"Spanish",
    });
    expect(person.displayName).toBe("Joe Strummer");
    expect(person.languages.length).toBe(1);
    expect(person.languages[0].code).toBe("spa");
    expect(person.languages[0].primary).toBe(true);
    expect(person.languages[0].mother).toBe(true);

    const person2 = await makeMatrixAndImportThenGetPerson({
      name: "Garbiela",
      primaryLanguage: "drc",
      otherLanguages: "por;eng",
      mothersLanguage: "drc",
      fathersLanguage: "eng"
    });
    expect(person2.languages.length).toBe(3);
    expectOneLanguage(person2, "drc", (l) => {
      expect(l.primary).toBe(true);
      expect(l.mother).toBe(true);
    });
    expectOneLanguage(person2, "eng", (l) => {
      expect(l.father).toBe(true);
    });
    expectOneLanguage(person2, "por", (l) => {
      expect(l.primary).toBeFalsy();
    });
  });
  it("Temp", async () => {
    const person2 = await makeMatrixAndImportThenGetPerson({
      name: "Garbiela",
      primaryLanguage: "drc"
    });
    expect(person2.languages.length).toBe(1);
    expectOneLanguage(person2, "drc", (l) => {
      expect(l.primary).toBe(true);
    });
  });

  it("Spanish, es, and Español all map to the same language during import", async () => {
    const person = await makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      primaryOccupation: "Musician",
      fathersLanguage: "Spanish",
      mothersLanguage: "Español",
      primaryLanguage: "es",
      otherLanguages: "es"
    });
    expect(person.languages.length).toBe(1);
    expect(person.languages[0].code).toBe("spa");
  });
  it("Migrates?", async () => {
    const person = await makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      fathersLanguage: "Spanish",
      primaryLanguage: "Thai"
    });
    // There should not be a "fathersLanguage" field, it should just be a flag on the language
    expect(person.properties.getTextStringOrEmpty("fathersLanguage")).toBe(""); // this should not make it into the properties
    expectOneLanguage(person, "spa", (l) => {
      expect(l.father).toBe(true);
    });
    expectOneLanguage(person, "tha", (l) => {
      expect(l.primary).toBe(true);
    });
  });

  it("Can import one normal person row", async () => {
    const person = await makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      primaryOccupation: "Musician",
      fathersLanguage: "Spanish",
      mothersLanguage: "Español",
      primaryLanguage: "Thai"
    });
    expect(person.displayName).toBe("Joe Strummer");
    expect(person.properties.getTextStringOrEmpty("primaryOccupation")).toBe(
      "Musician"
    );
    console.log(JSON.stringify(person.languages, null, 2));
    expect(person.languages).toHaveLength(2);
    expectOneLanguage(person, "tha", (l) => {
      expect(l.primary).toBe(true);
    });
    expectOneLanguage(person, "spa", (l) => {
      expect(l.primary).toBeFalsy();
      expect(l.father).toBe(true);
      expect(l.mother).toBe(true);
    });
  });

  it("Second import can overwrite existing person, with code", async () => {
    const person1 = await makeMatrixAndImportThenGetPerson({
      code: "JS",
      name: "Joe Strummer",
      primaryOccupation: "Musician"
    });

    const person2 = await makeMatrixAndImportThenGetPerson({
      code: "JS",
      name: "Joe Strummer",
      primaryOccupation: "Producer"
    });

    expect(project.persons.items.length).toBe(1);
    expect(person2.properties.getTextStringOrEmpty("primaryOccupation")).toBe(
      "Producer"
    );
  });

  it("Second import can overwrite existing person, no code", async () => {
    const person1 = await makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      primaryOccupation: "Musician"
    });
    const person2 = await makeMatrixAndImportThenGetPerson({
      name: "Joe Strummer",
      primaryOccupation: "Producer"
    });

    expect(project.persons.items.length).toBe(1);
    expect(person2.properties.getTextStringOrEmpty("primaryOccupation")).toBe(
      "Producer"
    );
  });
  it("Can import one normal session row", async () => {
    const session = await makeMatrixAndImportThenGetSession({
      id: "foo",
      title: "London Calling",
      date: "7/27/2021",
      genre: "drama",
      subgenre: "play"
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
  it("Can import one contribution", async () => {
    const session = await makeMatrixAndImportThenGetSession({
      id: "foo",
      "contribution.name": "Joe Strummer",
      "contribution.role": "Singer",
      "contribution.comments": "vocals"
    });
    expect(session.metadataFile!.contributions.length).toBe(1);
    expect(session.metadataFile!.contributions[0].personReference).toBe(
      "Joe Strummer"
    );
    expect(session.metadataFile!.contributions[0].role).toBe("Singer");
    expect(session.metadataFile!.contributions[0].comments).toBe("vocals");
  });
});

it("Can import 5 contributions", async () => {
  const session = await makeMatrixFromArrayOfArraysAndImportThenGetSession([
    ["id", "foo"],
    // inserting these to catch regression related to skipping cells
    ["blah", "", CellImportStatus.NotInClosedVocabulary],
    ["blahblah", "", CellImportStatus.NotInClosedVocabulary],
    ["contribution.name", "Bob"],
    ["contribution.role", "Speaker"],
    ["contribution.name", "Joe"],
    ["contribution.role", "Researcher"],
    ["contribution.name", "Sally"],
    ["contribution.role", "Depositor"],
    ["contribution.name", "Jane"],
    ["contribution.role", "Careful Speech Speaker"],
    ["contribution.name", "John"],
    ["contribution.role", "Compiler"]
  ]);
  expect(session.metadataFile!.contributions.length).toBe(5);
  expect(session.metadataFile!.contributions[0].personReference).toBe("Bob");
  expect(session.metadataFile!.contributions[0].role).toBe("Speaker");
  expect(session.metadataFile!.contributions[1].personReference).toBe("Joe");
  expect(session.metadataFile!.contributions[1].role).toBe("Researcher");
  expect(session.metadataFile!.contributions[2].personReference).toBe("Sally");
  expect(session.metadataFile!.contributions[2].role).toBe("Depositor");
  expect(session.metadataFile!.contributions[3].personReference).toBe("Jane");
  expect(session.metadataFile!.contributions[3].role).toBe(
    "Careful Speech Speaker"
  );
  expect(session.metadataFile!.contributions[4].personReference).toBe("John");
  expect(session.metadataFile!.contributions[4].role).toBe("Compiler");
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

    expect(project.sessions.items.length).toBe(4);

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
  return project.sessions.items[row - 2];
}
function fieldOfRow(row: number, field: string): string {
  return sessionOfRow(row).properties.getTextStringOrEmpty(field);
}
*/

function simpleColumn(key: string): MappedColumnInfo {
  return Object.assign(new MappedColumnInfo(), {
    incomingLabel: key,
    lametaProperty: key,
    mappingStatus: "Identity"
  });
}
function simpleCell(property: string, value: string): IMappedCell {
  return {
    column: simpleColumn(property),
    value,
    importStatus: CellImportStatus.OK
  };
}
function makeRow(values: any): MappedRow {
  const row: MappedRow = new MappedRow();
  Object.keys(values).forEach((key) =>
    row.cells.push(simpleCell(key, values[key]))
  );
  return row;
}
async function makeMatrixAndImportThenGetSession(
  values: any
): Promise<Session> {
  const row = makeRow(values);
  return makeMatrixFromRowAndImportThenGetSession(row);
}
async function makeMatrixFromArrayOfArraysAndImportThenGetSession(
  aOfA: string[][]
): Promise<Session> {
  const row: MappedRow = new MappedRow();
  aOfA.forEach((a) => {
    const c = simpleCell(a[0], a[1]);
    if (a[2]) c.importStatus = CellImportStatus[a[2]];

    row.cells.push(c);
  });

  return makeMatrixFromRowAndImportThenGetSession(row);
}

async function makeMatrixFromRowAndImportThenGetSession(
  row: MappedRow
): Promise<Session> {
  const result = createFolderInMemory(project, row, "session");
  expect(result.succeeded).toBeTruthy();
  addImportedFolderToProject(project, result.createdFolder, result.id);
  return result.createdFolder as Session;
}
async function makeMatrixAndImportThenGetPerson(values: any): Promise<Person> {
  const row = makeRow(values);
  const result = createFolderInMemory(project, row, "person");
  expect(result.succeeded).toBeTruthy();
  addImportedFolderToProject(project, result.createdFolder, result.id);
  return result.createdFolder as Person;
}
function expectOneLanguage(
  person: Person,
  code: string,
  expectations: (l: IPersonLanguage) => void
) {
  const langs = person.languages.filter((l) => l.code === code);
  expect(langs && langs.length).toBeTruthy();
  expect(langs).toHaveLength(1);
  expectations(langs[0]);
}

function expectHasLanguage(person: Person, code: string) {
  const langs = person.languages.filter((l) => l.code === code);
  expect(langs && langs.length).toBeTruthy();
  expect(langs).toHaveLength(1);
  return langs[0];
}
