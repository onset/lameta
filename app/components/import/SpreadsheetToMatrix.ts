/* The functions here:
  1) Read a csv file or excel spreadsheet into our IMappedMatrix.
  2) Using the provided "mapping", assign a lameta property to each column.
  3) Add validation info to the various cells according to the lameta definition of the column.

  Elsewhere, this IMappedMatrix is then handed to the UI to show to the user, and then handed to functions in MatrixImporter
  to actually import.
*/
import * as XLSX from "xlsx";
import { getFieldDefinition } from "../../model/field/KnownFieldDefinitions";
import { FieldDefinition } from "../../model/field/FieldDefinition";
import {
  MappedMatrix,
  CellImportStatus,
  RowImportStatus,
  MappedColumnInfo,
  MappedRow,
  IMappedCell,
} from "./MappedMatrix";

export function makeMappedMatrixFromExcel(
  path: string,
  mapping: object
): MappedMatrix {
  const workbook = XLSX.readFile(path, {
    cellDates: false,
    codepage: 65001 /* utf-8 */,
  });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const arrayOfArrays = worksheetToArrayOfArrays(worksheet);
  return makeMappedMatrix(arrayOfArrays, mapping);
}

function worksheetToArrayOfArrays(worksheet: XLSX.WorkSheet) {
  const arrayOfArrays: any[][] = [];

  var range = XLSX.utils.decode_range(worksheet["!ref"]!); // get the range

  for (var R = range.s.r; R <= range.e.r; ++R) {
    const row: any[] = [];
    //console.log("range.c: " + range.e.c);
    for (var C = range.s.c; C <= range.e.c; ++C) {
      var cellref = XLSX.utils.encode_cell({ c: C, r: R }); // construct A1 reference for cell
      var cell = worksheet[cellref];
      // .w is fine for xslx, but .v is needed to aslo handle csv. However with .v, we can get a number instead of a string, so we convert that as needed.
      const value = (cell?.v || "").toString();
      //console.log(typeof value);
      row.push(value);
    }
    arrayOfArrays.push(row);
  }
  return arrayOfArrays;
}

function makeMappedMatrix(arrayOfArrays: any[][], mapping: object) {
  // read the first row to get the import spreadsheet's names for each column, and give us an (as yet unmapped) matrix
  const matrix: MappedMatrix = makeUnmappedMatrix(arrayOfArrays);
  addMapping(matrix, mapping);
  addValidationInfo(matrix);
  setInitialRowImportStatus(matrix);
  return matrix;
}

function makeUnmappedMatrix(arrayOfArrays: any[][]) {
  let [firstRow, ...followingRows] = arrayOfArrays;
  const nonEmptyRows = followingRows.filter((r) =>
    r.find((cellText: string) => cellText.trim().length > 0)
  );
  const columns: MappedColumnInfo[] = firstRow.map((value) => {
    const c: MappedColumnInfo = Object.assign(new MappedColumnInfo(), {
      incomingLabel: value,
      //validationType: "unknown",
      lametaProperty: "not yet",
      mappingStatus: "Unmatched",
    });
    return c;
  });

  const rows: MappedRow[] = [];

  nonEmptyRows.forEach((row, index) => {
    const cells = row.map((cell, columnIndex) => {
      const c: IMappedCell = {
        column: columns[columnIndex],
        value: cell,
        importStatus: CellImportStatus.OK,
      };
      return c;
    });
    rows.push(
      Object.assign(new MappedRow(), {
        cells,
        importStatus: RowImportStatus.No /* will get replaced */,
        index,
      })
    );
  });

  return {
    columnInfos: columns,
    rows,
  };
}

function addMapping(matrix: MappedMatrix, mappingConfig: object) {
  // todo: look up each incoming column label and then add the corresponding target lameta property
  matrix.columnInfos.forEach((info, index) => {
    setMappingForOnColumn(info, mappingConfig);
  });
}
function setMappingForOnColumn(
  column: MappedColumnInfo,
  mappingConfig: object
) {
  if (!column.incomingLabel || column.incomingLabel.trim() === "") {
    column.mappingStatus = "MissingIncomingLabel";
    column.lametaProperty = "skip";
    return;
  }
  column.lametaProperty =
    mappingConfig[column.incomingLabel]?.lameta || "custom";
  if (
    column.lametaProperty.toLowerCase() == column.incomingLabel.toLowerCase()
  ) {
    column.mappingStatus = "Identity";
  } else if (column.lametaProperty === "custom") {
    column.mappingStatus = "Custom";
  } else {
    column.mappingStatus = "Matched";
  }

  // Currently we don't provide the user a way of skipping a column
  return;
}

function addValidationInfo(matrix: MappedMatrix) {
  matrix.columnInfos.forEach((column) => {
    // used by the grid to give some hints to the user
    const def = getFieldDefinition("session", column.lametaProperty);
    if (def && def.imdiIsClosedVocabulary) {
      column.validChoices = def.choices || [];
    }
  });
  matrix.rows.forEach((row) => {
    row.cells.forEach((cell, index) => {
      const columnInfo = matrix.columnInfos[index];
      if (
        columnInfo.mappingStatus != "Skip" &&
        columnInfo.mappingStatus != "MissingIncomingLabel" &&
        columnInfo.mappingStatus != "Custom"
      ) {
        const [primary, secondary] = columnInfo.lametaProperty.split(".");
        if (primary === "contribution") {
          cell.importStatus = CellImportStatus.OK; // will be set later in the process
        } else {
          const def = getFieldDefinition("session", primary);
          if (!def) {
            cell.importStatus = CellImportStatus.ProgramError; // how can we have a lametaProperty but couldn't find the definition?
          } else {
            getImportSituationForValue(def, cell);
          }
        }
      } else {
        cell.importStatus = CellImportStatus.OK;
      }
    });
  });
}

function setInitialRowImportStatus(matrix: MappedMatrix) {
  const getStatus = (r: MappedRow) => {
    if (!r.asObjectByLametaProperties().id) {
      return RowImportStatus.NotAllowed;
    }
    if (r.cells.find((c) => c.importStatus === CellImportStatus.ProgramError)) {
      return RowImportStatus.NotAllowed;
    } else if (
      r.cells.find(
        (c) => c.importStatus === CellImportStatus.NotInClosedVocabulary
      )
    ) {
      return RowImportStatus.NotAllowed;
    }

    return RowImportStatus.Yes;
  };
  matrix.rows.forEach((r) => {
    r.importStatus = getStatus(r);
    if (!r.asObjectByLametaProperties().id) {
      r.addProblemDescription("Missing ID");
    }
  });
}
function getImportSituationForValue(def: FieldDefinition, cell: IMappedCell) {
  if (!cell.value) {
    // TODO: are there any fields that are required?
    cell.importStatus = CellImportStatus.OK;
    return;
  }
  const v = cell.value.toLowerCase();
  if (def.complexChoices) {
    if (!def.complexChoices?.find((c) => c.id.toLowerCase() === v)) {
      cell.importStatus = CellImportStatus.Addition;
      return;
    }
    cell.importStatus = CellImportStatus.OK;
    return;
  }
  if (def.choices) {
    if (def.choices.find((c) => c.toLowerCase() == v)) {
      cell.importStatus = CellImportStatus.OK;
      return;
    }
    // it's not at all obvious that we should limit people to IMDI, but for now...
    if (def.imdiIsClosedVocabulary) {
      cell.importStatus = CellImportStatus.NotInClosedVocabulary;
      cell.problemDescription = `The the permitted values for ${
        cell.column.lametaProperty
      } are: ${cell.column.validChoices.join(", ")}`;
      return;
    }
    cell.importStatus = CellImportStatus.Addition;
    return;
  }

  // TODO: check archive access

  return CellImportStatus.OK;
}
