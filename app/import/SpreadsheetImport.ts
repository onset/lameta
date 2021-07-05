/*
  Strategy here is to separate import into multiple stages:
  
  1) PARSER: Read the file, give a matrix of some sort that represents what was in the file
  2) MAPPER: Transform that json into json that matches our model... roughly what we'd have if we didn't have xml.
  3) Validator: date, closed vocabularies
  4) UI that lets the user interact with the mapping/validator and chose which records to import
  5) CREATOR: Make the objects
  6) SAVER: Save out the files?  Separated from CREATOR if it makes it easier to unit test
  
  largely to facilitate easy unit testing and
  making it cheap to experiment with and (in future) utilize different approaches at the actual read/parse stage.
  E.g., we might use read-excel-file now, but add papa parse (csv) or xlsx-import (which has a more 2D capability) later.

  So we might have:
  PARSER + MAPPER implemented by xlsx-import(File) read-excel-file --> json matching lameta

  or

  PARSER: papa-parse(csv File) --> raw json
  MAPPER: our own mapper(raw json) --> json matching lameta

  CREATOR: Expect that we only need one. Could be

  * createObject(json matching lameta) --> object
  
  or maybe
  * jsonToLametaXml(json matching lameta) --> xml,  followed by normal xml import.

*/
import * as fs from "fs-extra";
import * as Path from "path";
import * as XLSX from "xlsx";
export const lingmetaxSessionMap = require("./LingMetaXMap.json5");
import knownFieldDefinitions, {
  getFieldDefinition,
} from "../model/field/KnownFieldDefinitions";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { Session } from "../model/Project/Session/Session";
import { CustomFieldRegistry } from "../model/Project/CustomFieldRegistry";
import { Field, FieldType } from "../model/field/Field";
import { Project } from "../model/Project/Project";
import moment from "moment";

export function importSpreadsheet(project: Project, path: string) {
  const workbook = XLSX.readFile(path, {
    cellDates: true,
    // dateNF: "YYYY-MM-DD", doesn't do anything
  });
  const rows: any[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[workbook.SheetNames[0]],
    // header:1 make it give us a matrix
    //{ header: 1 }
    {
      //raw: true,
      // dateNF: "yyy/mm/dd"
      //cellText:true
    }
  );
  let firstSession: Session | undefined;

  rows.forEach((r) => {
    const lametaRow = mapSpreadsheetRecord(r, lingmetaxSessionMap);
    const session = addSessionToProject(project, lametaRow);
    if (!firstSession) firstSession = session;
  });
  if (firstSession) project.selectSession(firstSession);
}

export function mapSpreadsheetRecord(
  // rowFromSpreadsheet is an object where the keys are from the header column and the values are the cell contents
  rowFromSpreadsheet: object,
  // mapping is an object like lingmetaxSessionMap where the keys map the column headers of the import format, and the values are ILametaImportDestination
  mapping: object
) {
  const simpleLametaSessionJson: any = {};
  Object.keys(rowFromSpreadsheet).forEach((keyOfImport) => {
    const k = mapping[keyOfImport];
    const value = rowFromSpreadsheet[keyOfImport];
    if (k === undefined) {
      if (!simpleLametaSessionJson["custom"]) {
        simpleLametaSessionJson.custom = {};
      }
      simpleLametaSessionJson.custom[keyOfImport] = value;
    } else {
      simpleLametaSessionJson[mapping[keyOfImport].lameta] =
        rowFromSpreadsheet[keyOfImport];
    }
  });
  return simpleLametaSessionJson;
}

export function addSessionToProject(
  //projectDir: string,
  project: Project,
  lametaSessionRecord: any
): Session {
  const session = project.makeSessionForImport();

  // load it will all the properties of the row
  Object.keys(lametaSessionRecord)
    .filter((k) => k !== "custom")
    .forEach((key) => {
      const value = lametaSessionRecord[key];
      if (key.toLowerCase().indexOf("date") > -1) {
        // REVIEW: this is assuming we were given a date, which surely won't always work.
        const dateString: string = moment(value).format("YYYY-MM-DD");
        const dateField = session.properties.getValueOrThrow("date");
        dateField.setValueFromString(dateString);
      } else {
        session.properties.setText(key, value);
      }
    });
  if (lametaSessionRecord.custom) {
    Object.keys(lametaSessionRecord.custom).forEach((key) => {
      session.properties.addCustomProperty(
        makeCustomField(key, lametaSessionRecord.custom[key])
      );
    });
  }
  // if we got this far and we are replacing an existing session, move it to the bin

  const previousSessionWithThisId = project.sessions.find(
    (s) => s.id === lametaSessionRecord.id
  );
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
