import { Project } from "../../model/Project/Project";
import * as temp from "temp";
import {
  makeMappedMatrix,
  makeMappedMatrixFromSpreadsheet
} from "./SpreadsheetToMatrix";
import {
  MappedMatrix,
  CellImportStatus,
  RowImportStatus
} from "./MappedMatrix";
import * as Path from "path";
jest.mock("@electron/remote", () => ({ exec: jest.fn() })); //See commit msg for info

let project: Project;
let projectDir = temp.mkdirSync("lameta spreadsheet importer test");
const lingMetaX_ImportMap = require("./LingMetaXMap.json5");
const lingMetaX_Xlsx_SessionsPath = "sample data/LingMetaX_Sessions.xlsx";
const lingMetaX_Xlsx_PeoplePath = "sample data/LingMetaX_People.xlsx";
const lingMetaX_Csv_SessionsPath = "sample data/LingMetaX_Sessions.csv";

// *********** IMPORTANT **************
// When using Wallaby JS, we have to configure it to know that any excel
// files we use are binary. See wallaby.js
describe("SpreadsheetToMatrix", () => {
  beforeAll(() => {
    project = Project.fromDirectory(projectDir);
  });
  beforeEach(() => {
    project.sessions.items.splice(0, 1000);
    project.persons.items.splice(0, 1000);
    Path.resolve;
  });
  it("Can read in people xlsx with no people", () => {
    const matrix = makeMappedMatrixFromSpreadsheet(
      "./sample data/LingMetaX_People_NoPeople.xlsx",
      lingMetaX_ImportMap,
      project,
      "person"
    );
    expect(matrix.rows.length).toBe(0);
  });
  it("Can read in people xslx", () => {
    const matrix = makeMappedMatrixFromSpreadsheet(
      "./sample data/LingMetaX_People.xlsx",
      lingMetaX_ImportMap,
      project,
      "person"
    );
    personSmokeTest(matrix);
    const customColumn = matrix.columnInfos.find((info) =>
      info.incomingLabel.startsWith("custom")
    );
  });

  it("Can read in session xslx", () => {
    const matrix = makeMappedMatrixFromSpreadsheet(
      lingMetaX_Xlsx_SessionsPath,
      lingMetaX_ImportMap,
      project,
      "session"
    );
    sessionSmokeTest(matrix);
  });
  it("Can read in csv", () => {
    const matrix = makeMappedMatrixFromSpreadsheet(
      lingMetaX_Csv_SessionsPath,
      lingMetaX_ImportMap,
      project,
      "session"
    );
    sessionSmokeTest(matrix);
  });
  it("Can map in pariticipants from some data using LingMetaXMap column labels", () => {
    const inputRows = [
      [
        "participant_1_full_name",
        "participant_1_role",
        "participant_2_full_name",
        "participant_2_role",
        "participant_3_full_name",
        "participant_3_role",
        "participant_4_full_name",
        "participant_4_role",
        "participant_5_full_name",
        "participant_5_role"
      ],
      [
        "Joe",
        "Speaker",
        "Jane",
        "Researcher",
        "Bob",
        "Interviewer",
        "Sue",
        "Depositor",
        "Fred",
        "Carefull Speech Speaker"
      ]
    ];
    const m = makeMappedMatrix(
      inputRows,
      lingMetaX_ImportMap,
      project,
      "session"
    );
    expect(m.rows.length).toBe(1);
    m.rows[0].cells; // ?

    // Joe is a speaker in role 1
    expect(m.rows[0].cells[0].column.incomingLabel).toBe(
      "participant_1_full_name"
    );
    expect(m.rows[0].cells[0].column.lametaProperty).toBe("contribution.name");
    expect(m.rows[0].cells[0].value).toBe("Joe");
    expect(m.rows[0].cells[1].column.incomingLabel).toBe("participant_1_role");
    expect(m.rows[0].cells[1].column.lametaProperty).toBe("contribution.role");
    expect(m.rows[0].cells[1].value).toBe("Speaker");

    // Jane is a researcher in role 2
    expect(m.rows[0].cells[2].column.incomingLabel).toBe(
      "participant_2_full_name"
    );
    expect(m.rows[0].cells[2].column.lametaProperty).toBe("contribution.name");
    expect(m.rows[0].cells[2].value).toBe("Jane");
    expect(m.rows[0].cells[3].column.incomingLabel).toBe("participant_2_role");
    expect(m.rows[0].cells[3].column.lametaProperty).toBe("contribution.role");
    expect(m.rows[0].cells[3].value).toBe("Researcher");

    // Bob is an interviewer in role 3
    expect(m.rows[0].cells[4].column.incomingLabel).toBe(
      "participant_3_full_name"
    );
    expect(m.rows[0].cells[4].column.lametaProperty).toBe("contribution.name");
    expect(m.rows[0].cells[4].value).toBe("Bob");

    expect(m.rows[0].cells[5].column.incomingLabel).toBe("participant_3_role");
    expect(m.rows[0].cells[5].column.lametaProperty).toBe("contribution.role");
    expect(m.rows[0].cells[5].value).toBe("Interviewer");

    // Sue is a depositor in role 4
    expect(m.rows[0].cells[6].column.incomingLabel).toBe(
      "participant_4_full_name"
    );
    expect(m.rows[0].cells[6].column.lametaProperty).toBe("contribution.name");
    expect(m.rows[0].cells[6].value).toBe("Sue");

    expect(m.rows[0].cells[7].column.incomingLabel).toBe("participant_4_role");
    expect(m.rows[0].cells[7].column.lametaProperty).toBe("contribution.role");
    expect(m.rows[0].cells[7].value).toBe("Depositor");

    // Fred is a careful speech speaker in role 5
    expect(m.rows[0].cells[8].column.incomingLabel).toBe(
      "participant_5_full_name"
    );
    expect(m.rows[0].cells[8].column.lametaProperty).toBe("contribution.name");
    expect(m.rows[0].cells[8].value).toBe("Fred");
    expect(m.rows[0].cells[9].column.incomingLabel).toBe("participant_5_role");
    expect(m.rows[0].cells[9].column.lametaProperty).toBe("contribution.role");
    expect(m.rows[0].cells[9].value).toBe("Carefull Speech Speaker");
  });
});
it("Can map in filename and title from some data using LingMetaXMap column labels", () => {
  const inputRows = [
    ["filename", "title"],
    ["forest recording", "forest"]
  ];
  const m = makeMappedMatrix(
    inputRows,
    lingMetaX_ImportMap,
    project,
    "session"
  );
  expect(m.rows.length).toBe(1);
  m.rows[0].cells; // ?
  expect(m.rows[0].cells[0].column.lametaProperty).toBe("id");
  expect(m.rows[0].cells[1].column.lametaProperty).toBe("title");
  expect(m.rows[0].cells[0].value).toBe("forest recording");
  expect(m.rows[0].cells[1].value).toBe("forest");
});

// if you get an error here and you can't tell which format was being read in (csv or xslx, comment out the one you aren't interested in)
function sessionSmokeTest(matrix: MappedMatrix) {
  expect(matrix.rows.length).toBe(6);
  expect(matrix.columnInfos.length).toBe(43);

  const kDateColumn = 0;
  expect(matrix.columnInfos[kDateColumn].incomingLabel).toBe("date");
  expect(matrix.columnInfos[kDateColumn].lametaProperty).toBe("date");
  expect(matrix.columnInfos[kDateColumn].mappingStatus).toBe("Identity");

  const kIdColumn = 2;
  expect(matrix.columnInfos[kIdColumn].incomingLabel).toBe("filename");
  expect(matrix.columnInfos[kIdColumn].lametaProperty).toBe("id");

  const kContinentColumn = 15;
  expect(matrix.columnInfos[kContinentColumn].incomingLabel).toBe(
    "location_continent"
  );
  expect(matrix.columnInfos[kContinentColumn].mappingStatus).toBe("Matched");
  // column 6, row 2 has "Australia"
  expect(matrix.rows[0].cells[kContinentColumn].column).toBe(
    matrix.columnInfos[kContinentColumn]
  );
  expect(matrix.rows[0].cells[kContinentColumn].importStatus).toBe(
    CellImportStatus.OK
  );
  // column 7, row 3 has "Australasia"
  expect(matrix.rows[1].cells[kContinentColumn].value).toBe("Gondwana");
  expect(matrix.rows[1].cells[kContinentColumn].importStatus).toBe(
    CellImportStatus.NotInClosedVocabulary
  );

  expect(matrix.columnInfos[42].incomingLabel).toBe("participant_5_role");
  expect(matrix.columnInfos[42].lametaProperty).toBe("contribution.role");
  expect(matrix.columnInfos[42].mappingStatus).toBe("Matched");
}
// if you get an error here and you can't tell which format was being read in (csv or xslx, comment out the one you aren't interested in)
function personSmokeTest(matrix: MappedMatrix) {
  expect(matrix.rows.length).toBe(2);
  expect(matrix.columnInfos.length).toBe(15);
  expect(matrix.rows[0].importStatus).toBe(RowImportStatus.Yes);
}
