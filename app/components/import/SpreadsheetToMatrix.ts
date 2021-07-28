/* The functions here:
  1) Read an excel spreadsheet into our IMappedMatrix.
  2) Using the provided "mapping", assign a lameta property to each column.
  3) Add validation info to the various cells according to the lameta definition of the column.

  Elsewhere, this IMappedMatrix is then handed to the UI to show to the user, and then handed to functions in MatrixImporter
  to actually import.
*/
import * as XLSX from "xlsx";
export const lingmetaxSessionMap = require("./LingMetaXMap.json5");
import { getFieldDefinition } from "../../model/field/KnownFieldDefinitions";
import { FieldDefinition } from "../../model/field/FieldDefinition";
import {
  MappedMatrix,
  CellImportStatus,
  RowImportStatus,
  IMappedColumnInfo,
  MappedRow,
  IMappedCell,
} from "./MappedMatrix";

// export function importSpreadsheet(project: Project, path: string) {
//   let firstSession: Session | undefined;
//   const rows = loadAndMapSpreadsheet(project, path);
//   rows.forEach((r) => {
//     const session = addSessionToProject(project, r);
//     if (!firstSession) firstSession = session;
//   });
//   if (firstSession) project.selectSession(firstSession);
// }

// export function loadAndMapSpreadsheet(project: Project, path: string): any[] {
//   const workbook = XLSX.readFile(path, {
//     cellDates: true,
//     // dateNF: "YYYY-MM-DD", doesn't do anything
//   });
//   const rows: any[] = XLSX.utils.sheet_to_json(
//     workbook.Sheets[workbook.SheetNames[0]]
//   );

//   return rows.map((r) => {
//     return mapSpreadsheetRecord(r, lingmetaxSessionMap);
//   });
// }

interface ILametaMapping {
  lameta: string;
}

/*export function mapSpreadsheetRecord(
  // rowFromSpreadsheet is an object where the keys are from the header column and the values are the cell contents
  rowFromSpreadsheet: object,
  // mapping is an object like lingmetaxSessionMap where the keys map the column headers of the import format, and the values are ILametaImportDestination
  mapping: object
) {
  const simpleLametaSessionJson: any = { contributions: [], custom: [] };
  Object.keys(rowFromSpreadsheet).forEach((keyOfImport) => {
    const mappingInfoForOneKey: ILametaMapping = mapping[keyOfImport];
    const value = rowFromSpreadsheet[keyOfImport];
    if (mappingInfoForOneKey === undefined) {
      simpleLametaSessionJson.custom[keyOfImport] = value;
    } else if (!mappingInfoForOneKey.lameta) {
      // for now we're just dropping these
      console.warn(
        `"${keyOfImport}" resolved to nothing. This indicates that the mapping json had an entry for ${keyOfImport}, but he value was empty`
      );
    } else {
      // can be simple like "title" or two-leveled, like "contribution.name"
      const parts = mappingInfoForOneKey.lameta.split(".");
      if (parts.length === 1) {
        simpleLametaSessionJson[parts[0]] = value;
      } else if (parts.length === 2) {
        switch (parts[0]) {
          case "contribution":
            const c = simpleLametaSessionJson.contributions as Array<{
              name: string;
              role: string;
            }>;
            switch (parts[1]) {
              case "name":
                c.push({ name: value, role: "" });
                break;
              case "role":
                if (c.length === 0) {
                  console.warn("Had a role without a participant");
                } else {
                  c[c.length - 1].role = value;
                }
                break;
            }
            break;
          case "role":
            break;
            break;
          default:
            throw Error(
              `lameta import does not understand the destination ${mappingInfoForOneKey.lameta}`
            );
        }
      } else {
        throw Error(
          `lameta import does not understand the destination ${mappingInfoForOneKey.lameta}`
        );
      }
    }
  });
  return simpleLametaSessionJson;
}*/

export function makeMappedMatrixFromWorksheet(
  worksheet: XLSX.WorkSheet,
  mapping: object
): MappedMatrix {
  // return {
  //   columnInfos: [
  //     { incomingLabel: "myid", lametaProperty: "ID" },
  //     { incomingLabel: "mydate", lametaProperty: "Date" },
  //   ],
  //   dataRows: [
  //     [
  //       { status: "OK", v: "uno" },
  //       { status: "Error", v: "dos" },
  //     ],
  //   ],
  // };

  // make an array of array of values
  const arrayOfArrays = worksheetToArrayOfArrays(worksheet);

  // read the first row to get the import spreadsheet's names for each column, and give us an (as yet unmapped) matrix
  const matrix: MappedMatrix = arrayOfArraysToMappedMatrix(arrayOfArrays);

  addMapping(matrix, mapping);
  addValidationInfo(matrix);
  setInitialRowImportStatus(matrix);

  return matrix;
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
  });
}
function addMapping(matrix: MappedMatrix, mappingConfig: object) {
  // todo: look up each incoming column label and then add the corresponding target lameta property
  matrix.columnInfos.forEach((info, index) => {
    setMappingForOnColumn(info, mappingConfig);
  });
}
function setMappingForOnColumn(info: IMappedColumnInfo, mappingConfig: object) {
  if (!info.incomingLabel || info.incomingLabel.trim() === "") {
    info.mappingStatus = "MissingIncomingLabel";
    info.lametaProperty = "skip";
    return;
  }
  info.lametaProperty = mappingConfig[info.incomingLabel]?.lameta || "custom";
  if (info.lametaProperty.toLowerCase() == info.incomingLabel.toLowerCase()) {
    info.mappingStatus = "Identity";
  } else if (info.lametaProperty === "custom") {
    info.mappingStatus = "Custom";
  } else {
    info.mappingStatus = "Matched";
  }
  // Currently we don't provide the user a way of skipping a column
  return;
}

function addValidationInfo(matrix: MappedMatrix) {
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
            cell.importStatus = getImportSituationForValue(def, cell.value);
          }
        }
      } else {
        cell.importStatus = CellImportStatus.OK;
      }
    });
  });
}

function arrayOfArraysToMappedMatrix(arrayOfArrays: any[][]) {
  const [firstRow, ...dataRows] = arrayOfArrays;
  const columns: IMappedColumnInfo[] = firstRow.map((value) => {
    const c: IMappedColumnInfo = Object.assign(new IMappedColumnInfo(), {
      incomingLabel: value,
      //validationType: "unknown",
      lametaProperty: "not yet",
      mappingStatus: "Unmatched",
    });
    return c;
  });

  const rows: MappedRow[] = [];

  dataRows.forEach((row, index) => {
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

function worksheetToArrayOfArrays(worksheet: XLSX.WorkSheet) {
  const matrix: any[][] = [];

  var range = XLSX.utils.decode_range(worksheet["!ref"]!); // get the range
  for (var R = range.s.r; R <= range.e.r; ++R) {
    const row: any[] = [];
    matrix.push(row);
    for (var C = range.s.c; C <= range.e.c; ++C) {
      var cellref = XLSX.utils.encode_cell({ c: C, r: R }); // construct A1 reference for cell
      var cell = worksheet[cellref];
      row.push(cell?.w || "");
    }
  }
  return matrix;
}

function getImportSituationForValue(
  def: FieldDefinition,
  value: string
): CellImportStatus {
  if (!value) {
    // TODO: are there any fields that are required?
    return CellImportStatus.OK;
  }
  const v = value.toLowerCase();
  if (def.complexChoices) {
    if (!def.complexChoices?.find((c) => c.id.toLowerCase() === v)) {
      return CellImportStatus.Addition;
    }
    return CellImportStatus.OK;
  }
  if (def.choices) {
    if (def.choices.find((c) => c.toLowerCase() == v))
      return CellImportStatus.OK;

    // it's not at all obvious that we should limit people to IMDI, but for now...
    if (def.imdiIsClosedVocabulary) {
      return CellImportStatus.NotInClosedVocabulary;
    }
    return CellImportStatus.Addition;
  }

  // TODO: check archive access

  return CellImportStatus.OK;
}
