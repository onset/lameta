/* The functions here take a matrix that has already been mapped and validated and shown to the user, and do the actual import.
 */

import { FieldDefinition } from "../../model/field/FieldDefinition";
import { Session } from "../../model/Project/Session/Session";
import { Field } from "../../model/field/Field";
import { Project } from "../../model/Project/Project";
import moment from "moment";
import { Contribution } from "../../model/file/File";
import {
  MappedMatrix,
  CellImportStatus,
  RowImportStatus,
  MappedColumnInfo,
  MappedRow,
  IMappedCell,
} from "./MappedMatrix";
import { Person } from "../../model/Project/Person/Person";

export const availableSpreadsheetMappings = {
  LingMetaXMap: require("./LingMetaXMap.json5"),
};

export function addSessionMatrixToProject(
  project: Project,
  matrix: MappedMatrix
) {
  project.unMarkAllSessions(); // new ones will be marked
  matrix.rows
    .filter((row) => row.importStatus === RowImportStatus.Yes)
    .forEach((row) => {
      addSessionToProject(project, row);
    });
}

export function addPersonToProject(project: Project, row: MappedRow): Person {
  const person = project.makePersonForImport();
  //const person = project.getOrCreatePerson(cell.value);
  person.marked = true; // help user find the newly imported person

  row.cells
    .filter((cell) => cell.column.doImport && cell.value)
    .forEach((cell, cellIndex) => {
      const lametaKey = cell.column.lametaProperty;
      switch (lametaKey) {
        case "custom":
          person.properties.addCustomProperty(
            makeCustomField(cell.column.incomingLabel, cell.value)
          );

          break;
        default:
          person.properties.setText(lametaKey /* ? */, cell.value);
      }
    });

  // if we got this far and we are replacing an existing person, move it to the bin
  const name = row.cells.find((c) => c.column.lametaProperty === "name")?.value;
  if (!name) throw new Error("Missing Name on cell: " + JSON.stringify(row));
  const existingMatchingPerson = project.persons.find((p) =>
    p.importIdMatchesThisFolder(name)
  );
  if (existingMatchingPerson) {
    project.deletePerson(existingMatchingPerson);
  }
  // change the file name from "New Person" or whatever to the actual id
  person.nameMightHaveChanged();
  project.finishPersonImport(person);
  person.saveAllFilesInFolder();
  return person;
}

export function addSessionToProject(project: Project, row: MappedRow): Session {
  const session = project.makeSessionForImport();
  session.marked = true; // help user find the newly imported session

  row.cells
    .filter((cell) => cell.column.doImport && cell.value)
    .forEach((cell, cellIndex) => {
      const lametaKey = cell.column.lametaProperty;
      switch (lametaKey) {
        case "custom":
          session.properties.addCustomProperty(
            makeCustomField(cell.column.incomingLabel, cell.value)
          );

          break;
        case "contribution.role":
          break;
        case "contribution.date":
          break;
        case "contribution.comments":
          break;
        case "contribution.name":
          const person = project.getOrCreatePerson(cell.value);
          session.metadataFile!.contributions.push(
            new Contribution(
              person.getIdToUseForReferences(),
              lookAheadForValue(row, cellIndex, "contribution.role") ??
                "participant",
              lookAheadForValue(row, cellIndex, "contribution.comments") ?? ""
            )
          );
          // TODO: have to group up to 3 consecutive cells into a single contribution record
          break;
        case "date":
          const dateString: string = moment(cell.value).format("YYYY-MM-DD");
          const dateField = session.properties.getValueOrThrow("date");
          dateField.setValueFromString(dateString);
          break;
        default:
          session.properties.setText(lametaKey /* ? */, cell.value);
      }
    });

  // if we got this far and we are replacing an existing session, move it to the bin

  const id = row.cells.find((c) => c.column.lametaProperty === "id")?.value;
  if (!id) throw new Error("Missing ID on cell: " + JSON.stringify(row));
  const previousSessionWithThisId = project.sessions.find((s) => s.id === id!);
  if (previousSessionWithThisId) {
    project.deleteSession(previousSessionWithThisId);
  }
  // change the file name from "NewSession" or whatever to the actual id
  session.nameMightHaveChanged();
  project.finishSessionImport(session);
  session.saveAllFilesInFolder();
  return session;
}

function makeCustomField(key: string, value: string): Field {
  const definition: FieldDefinition = {
    key,
    englishLabel: key,
    persist: true,
    type: "Text",
    tabIndex: 0,
    isCustom: true,
    showOnAutoForm: false, // we do show it, but in the custom table
  };
  const customField = Field.fromFieldDefinition(definition);
  customField.setValueFromString(value);
  return customField;
}

function lookAheadForValue(
  row: MappedRow,
  lookToRightOfCellIndex: number,
  key: string
): string | undefined {
  lookToRightOfCellIndex++;
  for (var i = lookToRightOfCellIndex; i < row.cells.length; i++) {
    if (row.cells[i].column.lametaProperty == key) return row.cells[i].value;
  }
  return undefined;
}
