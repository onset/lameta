/* The functions here take a matrix that has already been mapped and validated and shown to the user, and do the actual import.
 */

import { FieldDefinition } from "../../model/field/FieldDefinition";
import * as mobx from "mobx";
import { Field } from "../../model/field/Field";
import { Project } from "../../model/Project/Project";
import moment from "moment";
import { Contribution } from "../../model/file/File";
const XmlNameValidator = require("xml-name-validator");
import { MappedMatrix, RowImportStatus, MappedRow } from "./MappedMatrix";
import { IImportMapping } from "./SpreadsheetToMatrix";
import { Folder, IFolderType } from "../../model/Folder/Folder";
import { NotifyException } from "../Notify";
import { runInAction } from "mobx";
import { Person } from "../../model/Project/Person/Person";
import { staticLanguageFinder } from "../../languageFinder/LanguageFinder";
import { IPersonLanguage } from "../../model/PersonLanguage";

export const availableSpreadsheetMappings = {
  LingMetaXMap: require("./LingMetaXMap.json5") as IImportMapping
};

export function addImportMatrixToProject(
  project: Project,
  matrix: MappedMatrix,
  folderType: IFolderType
) {
  try {
    const folders = project.getFolderArrayFromType(folderType);
    folders.unMarkAll(); // new ones will be marked
    const rows = matrix.rows.filter(
      (row) => row.importStatus === RowImportStatus.Yes
    );
    const inMemoryCreationResults = new Array<{
      succeeded: boolean;
      row: MappedRow;
      createdFolder: Folder;
      id: string;
      message?: string;
    }>();

    for (const row of rows) {
      inMemoryCreationResults.push(
        createFolderInMemory(project, row, folderType)
      );
    }
    // for each folder that was created, finish importing it
    mobx.runInAction(() => {
      inMemoryCreationResults
        .filter((r) => inMemoryCreationResults.some((r) => r.succeeded))
        .forEach((r) => {
          addImportedFolderToProject(project, r.createdFolder, r.id);
        });
      folders.selectFirstMarkedFolder();
    });
  } catch (err) {
    NotifyException(err, "There was a problem importing.");
  }
}

// export function addPersonToProject(project: Project, row: MappedRow): Person {
//   const person = project.makeFolderForImport("person") as Person;
//   //const person = project.getOrCreatePerson(cell.value);
//   person.marked = true; // help user find the newly imported person

//   row.cells
//     .filter((cell) => cell.column.doImport && cell.value)
//     .forEach((cell, cellIndex) => {
//       const lametaKey = cell.column.lametaProperty;
//       switch (lametaKey) {
//         case "custom":
//           person.properties.addCustomProperty(
//             makeCustomField(cell.column.incomingLabel, cell.value)
//           );

//           break;
//         default:
//           person.properties.setText(lametaKey /* ? */, cell.value);
//       }
//     });

//   // if we got this far and we are replacing an existing person, move it to the bin
//   const name = row.cells.find((c) => c.column.lametaProperty === "name")?.value;
//   if (!name) throw new Error("Missing Name on cell: " + JSON.stringify(row));
//   const existingMatchingPerson = project.persons.items.find((p) =>
//     p.importIdMatchesThisFolder(name)
//   );
//   if (existingMatchingPerson) {
//     project.deleteFolder(existingMatchingPerson);
//   }
//   // change the file name from "New Person" or whatever to the actual id
//   person.nameMightHaveChanged();
//   project.finishFolderImport(person);
//   person.saveAllFilesInFolder();
//   return person;
// }

// creates the folder but doesn't add it to the project yet
export function createFolderInMemory(
  project: Project,
  row: MappedRow,
  folderType: IFolderType
): {
  succeeded: boolean;
  row: MappedRow;
  createdFolder: Folder;
  id: string;
  message?: string;
} {
  const folder = project.makeFolderForImport(folderType);
  folder.marked = true; // help user find the newly imported session

  row.cells
    // no, this messes up indices: .filter((cell) => cell.column.doImport && cell.value)
    .forEach((cell, cellIndex) => {
      if (!cell.column.doImport || !cell.value) return;
      const lametaKey = cell.column.lametaProperty;
      //console.log("lametaKey", lametaKey);
      switch (lametaKey) {
        case "custom":
          folder.properties.addCustomProperty(
            makeCustomField(cell.column.incomingLabel, cell.value)
          );

          break;

        /* --- Session keys that require special handling --- */
        case "contribution.role":
          break;
        case "contribution.date":
          break;
        case "contribution.comments":
          break;
        case "contribution.name":
          // note, this is making an on-disk person
          const person = project.getOrCreatePerson(cell.value);
          person.marked = true;
          console.log(
            `${person.displayName} contribution at cell ${cellIndex}`
          );
          folder.metadataFile!.contributions.push(
            new Contribution(
              person.getIdToUseForReferences(),
              lookAheadForValue(row, cellIndex, "contribution.role") ??
                "participant",
              lookAheadForValue(row, cellIndex, "contribution.comments") ?? ""

              // enhance; comments and date are not part of lingmetax, will be needed if a new format adds them
            )
          );
          break;
        case "date":
          // creating "Date" to get around the deprecation warning we get if we run into, .e.g. "7/27/2022"
          const dateString: string = moment(new Date(cell.value)).format(
            "YYYY-MM-DD"
          );
          const dateField = folder.properties.getValueOrThrow("date");
          dateField.setValueFromString(dateString);
          break;
        case "primaryLanguage":
          processPersonLanguageCell(cell?.value, folder as Person, {
            primary: true
          });
          //console.log(JSON.stringify((folder as Person).languages[0], null, 2));
          break;
        case "mothersLanguage":
          processPersonLanguageCell(cell?.value, folder as Person, {
            mother: true
          });
          break;
        case "fathersLanguage":
          processPersonLanguageCell(cell?.value, folder as Person, {
            father: true
          });
          break;
        case "otherLanguages":
          processPersonLanguageCell(cell?.value, folder as Person, {});
          break;
        default:
          folder.metadataFile!.addTextProperty(lametaKey, cell.value);
      }
    });

  // if we got this far and we are replacing an existing session or person, move it to the bin

  //  console.log(folder.propertyForCheckingId);
  const id = row.cells.find(
    (c) => c.column.lametaProperty === folder.propertyForCheckingId
  )?.value;
  if (!id)
    return {
      succeeded: false,
      row,
      createdFolder: folder,
      id: "unknown",
      message: `Missing ${
        folder.propertyForCheckingId
      } on cell: ${JSON.stringify(row)}`
    };

  return {
    succeeded: true,
    row,
    createdFolder: folder,
    id: id,
    message: undefined
  };
}
export function addImportedFolderToProject(
  project: Project,
  folder: Folder,
  id: string
) {
  const previousFolderWithThisId = project.findFolderById(
    folder.folderType,
    id
  );
  //console.log(previousFolderWithThisId?.displayName);

  if (previousFolderWithThisId) {
    // enhance: let's keep the contents of the folder, and just replace or rewrite the metadata file
    project.deleteFolder(
      previousFolderWithThisId,
      true /* immediately, no trash */
    );
    //console.log(previousFolderWithThisId?.displayName);
  }
  // change the file name from "NewSession" or whatever to the actual id
  folder.nameMightHaveChanged();
  project.finishFolderImport(folder);
  folder.saveAllFilesInFolder();
}
export function makeCustomField(key: string, value: string): Field {
  let safeKey = key
    .replace(/[<>&'"\s:!\\]/g, "-")
    .trim()

    .replace(/[-]+/g, "-");
  // the above is not comprehensive, so let's make sure
  if (!XmlNameValidator.name(safeKey).success) {
    throw Error(
      `Lameta cannot handle some character in this custom column name: "${key}"`
    );
  }
  const definition: FieldDefinition = {
    key: safeKey,
    englishLabel: safeKey, // you would expect that this doesn't have to be safe, but it is actually what is used for the xml entity
    persist: true,
    type: "Text",
    tabIndex: 0,
    isCustom: true,
    showOnAutoForm: false // we do show it, but in the custom table
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
  let r: string | undefined = undefined;
  lookToRightOfCellIndex++;
  for (var i = lookToRightOfCellIndex; i < row.cells.length; i++) {
    if (row.cells[i].column.lametaProperty == key) {
      r = row.cells[i].value;
      break;
    }
  }
  console.log(`lookAheadForValue(${lookToRightOfCellIndex},${key})=${r}`);
  return r;
}

// with spreadsheet import, we have this special field that can take a list of one or more langs separated by comma or semicolon,
// containing language names or codes
export function processPersonLanguageCell(
  cellContent: string,
  person: Person,
  assignments: { primary?: boolean; mother?: boolean; father?: boolean }
) {
  if (!cellContent) {
    return;
  }
  const tokens = cellContent.split(/[;,]/).map((s) => s.trim());
  tokens.forEach((token) => {
    const code = staticLanguageFinder.findCodeFromCodeOrLanguageName(token);
    // do we already have this language for this person?
    let lang: IPersonLanguage | undefined = person.languages.find(
      (l) => l.code === code
    );
    // if not, add it
    if (lang === undefined) {
      lang = { code };
    }
    // now add any primary, mother, or father properties that are true
    Object.keys(assignments).forEach((prop) => {
      if (assignments[prop]) {
        lang![prop] = true;
      }
    });

    // Bizarrely, if we push before making changes to lang, they are lost, as if
    // the push is making a copy of the object. Which is should only do if it is a primitive.
    if (!person.languages.find((l) => l.code === lang?.code))
      person.languages.push(lang);
  });
}
