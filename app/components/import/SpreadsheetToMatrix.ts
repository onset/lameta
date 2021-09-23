/* The functions here:
  1) Read a csv file or excel spreadsheet into our IMappedMatrix.
  2) Using the provided "mapping", assign a lameta property to each column.
  3) Add validation info to the various cells according to the lameta definition
     of the column.

  Elsewhere, this IMappedMatrix is then handed to the UI to show to the user,
  and then handed to functions in MatrixImporter to actually import.
*/
import * as XLSX from "xlsx";
import { getFieldDefinition } from "../../model/field/KnownFieldDefinitions";
import {
  MappedMatrix,
  CellImportStatus,
  RowImportStatus,
  MappedColumnInfo,
  MappedRow,
  IMappedCell,
} from "./MappedMatrix";
import { Project } from "../../model/Project/Project";
import moment from "moment";
import { IFolderType } from "../../model/Folder/Folder";
import * as fs from "fs";
import * as Path from "path";
import { staticLanguageFinder } from "../../languageFinder/LanguageFinder";

export interface IImportMapping {
  mapping_description: string;
  person: object;
  session: object;
}
export function makeMappedMatrixFromSpreadsheet(
  path: string,
  mapping: IImportMapping,
  project: Project,
  folderType: IFolderType
): MappedMatrix {
  if (!fs.existsSync(path)) {
    throw new Error("Cannot find a workbook at " + path);
  }

  var workbook;
  const fullPath = Path.resolve(path);
  try {
    workbook = XLSX.readFile(fullPath, {
      cellDates: false,
      // for csv files I ran into a case where an acii file had a non-breaking space (\u00A0)
      // which looked fine in excel but was changed to � on import.
      // So far, it seems like leaving things to auto-detect works better?
      // codepage: 65001 /* utf-8 */,
    });
  } catch (error) {
    throw new Error(`lameta was not able to read ${fullPath}. ${error}`);
  }
  if (!workbook) {
    // *********** IMPORTANT **************
    // When using Wallaby JS, we have to configure it to know that any excel
    // files we use are binary. See wallaby.js. If this isn't done, you
    // will get this error.
    throw new Error(
      `Found the workbook at ${fullPath} but could not open it with the library.`
    );
  }
  if (workbook.SheetNames.length === 0) {
    throw new Error(
      "Apparently, we opened the workbook but Sheets[] is empty."
    );
  }
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) {
    throw new Error(
      "Apparently, we opened the workbook but could not open the first sheet."
    );
  }
  const arrayOfArrays = worksheetToArrayOfArrays(worksheet);
  return makeMappedMatrix(arrayOfArrays, mapping, project, folderType);
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

      // .w is fine for xslx, but .v is needed to also handle csv. However with .v, we can get a number instead of a string, so we convert that as needed.
      const value = (cell?.w || cell?.v || "")
        .toString()
        .replace(/\u00A0/g, " "); // remove non-breaking spaces (not critical, but I had a bunch in a sample file and there it didn't make sense)

      row.push(value);
    }
    arrayOfArrays.push(row);
  }
  return arrayOfArrays;
}

function makeMappedMatrix(
  arrayOfArrays: any[][],
  mapping: IImportMapping,
  project: Project,
  folderType: IFolderType
) {
  // read the first row to get the import spreadsheet's names for each column, and give us an (as yet unmapped) matrix
  const matrix: MappedMatrix = makeUnmappedMatrix(arrayOfArrays);
  addMappingAndValidatationInfoToColumns(matrix, mapping, project, folderType);
  validateCells(matrix, folderType);
  setInitialRowImportStatus(matrix, project, folderType);
  return matrix;
}

function makeUnmappedMatrix(arrayOfArrays: any[][]): MappedMatrix {
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

  return Object.assign(new MappedMatrix(), { columnInfos: columns, rows });
}

function addMappingAndValidatationInfoToColumns(
  matrix: MappedMatrix,
  mapping: IImportMapping,
  project: Project,
  folderType: IFolderType
) {
  // todo: look up each incoming column label and then add the corresponding target lameta property
  matrix.columnInfos.forEach((column) => {
    if (!column.incomingLabel || column.incomingLabel.trim() === "") {
      column.mappingStatus = "MissingIncomingLabel";
      column.lametaProperty = "skip";
      return;
    }
    column.lametaProperty =
      mapping[folderType][column.incomingLabel]?.lameta || "custom";
    if (
      column.lametaProperty.toLowerCase() == column.incomingLabel.toLowerCase()
    ) {
      column.mappingStatus = "Identity";
    } else if (column.lametaProperty === "custom") {
      column.mappingStatus = "Custom";
    } else {
      column.mappingStatus = "Matched";
    }

    const def = getFieldDefinition(folderType, column.lametaProperty);
    if (column.lametaProperty === "access") {
      const protocol = column.incomingLabel.replace("access_", "");
      if (protocol !== project.accessProtocol) {
        column.mappingStatus = "Skip";
      } else {
        column.choices = project.authorityLists.accessChoices.map(
          (c) => c.label
        );
        column.closedList = true; // review what if it's the "Custom" list?
      }
    } else if (def) {
      column.choices = def.choices || [];
      column.closedList = !!def.imdiIsClosedVocabulary;
    }
  });
  // Currently we don't provide the user a way of skipping a column
  return;
}

function validateCells(matrix: MappedMatrix, folderType: IFolderType) {
  matrix.rows.forEach((row) => {
    row.cells.forEach((cell, index) => {
      const columnInfo = matrix.columnInfos[index];
      if (
        columnInfo.mappingStatus != "Skip" &&
        columnInfo.mappingStatus != "MissingIncomingLabel" &&
        columnInfo.mappingStatus != "Custom"
      ) {
        const [primary, secondary] = columnInfo.lametaProperty.split(".");
        switch (primary) {
          case "contribution":
            cell.importStatus = CellImportStatus.OK; // will be set later in the process
            break;
          case "date":
            if (!cell.value || moment(cell.value).isValid()) {
              cell.importStatus = CellImportStatus.OK;
            } else {
              cell.importStatus = CellImportStatus.NotInClosedVocabulary;
              cell.problemDescription = "lameta cannot understand this date.";
            }

            break;
          default:
            const def = getFieldDefinition(folderType, primary);
            if (def.importType === "languageCodeOrName") {
              const problems = getProblemsFromLanguageImportListField(
                cell.value
              );
              if (problems.length > 0) {
                cell.importStatus = CellImportStatus.NotInClosedVocabulary;
                cell.problemDescription = `lameta does not recognize these language names or codes: ${problems
                  .map((p) => '"' + p + '"')
                  .join(",")}`;
              }
            } else {
              if (!def) {
                cell.importStatus = CellImportStatus.MissingKeyDef; // how can we have a lametaProperty but couldn't find the definition?
                cell.problemDescription = `lameta does not have a definitions matching the key "${primary}"`;
              } else {
                getImportSituationForValue(cell);
              }
            }
        }
      } else {
        cell.importStatus = CellImportStatus.OK;
      }
    });
  });
}

// with spreadsheet import, we have this special languageImportList field that can take a list of one or more langs separated by comma or semicolon,
// contiaining language names or codes
function getProblemsFromLanguageImportListField(
  languageImportList: string
): string[] {
  const problems: string[] = [];
  if (languageImportList) {
    const languagesInEitherNameOrCode = languageImportList
      .split(";")
      .join(",")
      .split(",")
      .map((s) => s.trim());
    languagesInEitherNameOrCode.forEach((l) => {
      if ("und" === staticLanguageFinder.findCodeFromCodeOrLanguageName(l))
        problems.push(l);
    });
  }
  return problems;
}

function setInitialRowImportStatus(
  matrix: MappedMatrix,
  project: Project,
  folderType: IFolderType
) {
  const getStatus = (r: MappedRow) => {
    const uniqueIdentifierProperty = folderType === "session" ? "id" : "name";
    if (!r.asObjectByLametaProperties()[uniqueIdentifierProperty]) {
      return RowImportStatus.NotAllowed;
    }
    if (
      r.cells.find((c) => c.importStatus === CellImportStatus.MissingKeyDef)
    ) {
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
    const uniqueIdentifierProperty = folderType === "session" ? "id" : "name";
    const id = r.asObjectByLametaProperties()[uniqueIdentifierProperty]; // review: or code?
    if (!id) {
      r.addProblemDescription("Missing " + uniqueIdentifierProperty);
    } else if (!!project.findFolderById(folderType, id)) {
      r.matchesExistingRecord = true;
      // if the other checks passed and the only problem is this overwrite issue
      if (r.importStatus === RowImportStatus.Yes)
        r.importStatus = RowImportStatus.No; // allowed, but off by default
    }
  });
}
function getImportSituationForValue(cell: IMappedCell) {
  if (!cell.value) {
    // TODO: are there any fields that are required?
    cell.importStatus = CellImportStatus.OK;
    return;
  }
  // no list (open or closed)
  if (!cell.column.choices) return CellImportStatus.OK;

  const lowerCaseOfCellValue = cell.value.toLowerCase();
  const match = cell.column.choices?.find(
    (c) => c.toLowerCase() === lowerCaseOfCellValue
  );
  if (match) {
    // fix upper/lower case
    cell.value = match;
    return CellImportStatus.OK;
  }
  if (cell.column.closedList) {
    invalidChoice(cell);
    return CellImportStatus.NotInClosedVocabulary;
  } else {
    return CellImportStatus.Addition;
  }
}

function invalidChoice(cell: IMappedCell) {
  cell.importStatus = CellImportStatus.NotInClosedVocabulary;
  const s = `The the permitted values for ${
    cell.column.lametaProperty
  } are: ${cell.column.choices.map((x) => `"${x}"`).join(", ")}. `;
  cell.problemDescription = (cell.problemDescription || "") + s;
}
