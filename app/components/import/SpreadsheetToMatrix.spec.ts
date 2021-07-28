import { Project } from "../../model/Project/Project";
import * as temp from "temp";
import {
  makeMappedMatrixFromCSV,
  makeMappedMatrixFromExcel,
} from "./SpreadsheetToMatrix";
import {
  MappedMatrix,
  CellImportStatus,
  RowImportStatus,
  IMappedColumnInfo,
  MappedRow,
  IMappedCell,
} from "./MappedMatrix";

let project: Project;
let projectDir = temp.mkdirSync("lameta spreadsheet importer test");
const lingmetaxSessionMap = require("./LingMetaXMap.json5");
const lingMetaXlsxPath = "c:/dev/lameta/sample data/LingMetaX.xlsx";
const lingMetaCsvPath = "c:/dev/lameta/sample data/LingMetaX.csv";

describe("SpreadsheetToMatrix", () => {
  beforeAll(() => {
    project = Project.fromDirectory(projectDir);
  });
  beforeEach(() => {
    project.sessions = [];
  });
  it("Can read in xslx", () => {
    const matrix = makeMappedMatrixFromExcel(
      lingMetaXlsxPath,
      lingmetaxSessionMap
    );
    smokeTest(matrix);
  });
  it("Can read in csv", () => {
    const matrix = makeMappedMatrixFromCSV(
      lingMetaCsvPath,
      lingmetaxSessionMap
    );
    smokeTest(matrix);
  });
});

// if you get an error here and you can't tell which format was being read in (csv or xslx, comment out the one you aren't interested in)
function smokeTest(matrix: MappedMatrix) {
  expect(matrix.rows.length).toBe(5);
  expect(matrix.columnInfos.length).toBe(43);

  const kDateColumn = 0;
  expect(matrix.columnInfos[kDateColumn].incomingLabel).toBe("date");
  expect(matrix.columnInfos[kDateColumn].lametaProperty).toBe("date");
  expect(matrix.columnInfos[kDateColumn].mappingStatus).toBe("Identity");

  const kIdColumn = 2;
  expect(matrix.columnInfos[kIdColumn].incomingLabel).toBe("filename");
  expect(matrix.columnInfos[kIdColumn].lametaProperty).toBe("id");

  const kContinentColumn = 6;
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
  expect(matrix.rows[1].cells[kContinentColumn].value).toBe("Australasia");
  expect(matrix.rows[1].cells[kContinentColumn].importStatus).toBe(
    CellImportStatus.NotInClosedVocabulary
  );

  expect(matrix.columnInfos[42].incomingLabel).toBe("participant_5_role");
  expect(matrix.columnInfos[42].lametaProperty).toBe("contribution.role");
  expect(matrix.columnInfos[42].mappingStatus).toBe("Matched");
}
