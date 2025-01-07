import { Folder } from "./Folder";
import * as fs from "fs-extra";
import * as Path from "path";
import { ShowMessageDialog } from "../../components/ShowMessageDialog/MessageDialog";
import { assert } from "console";
import uuid from "uuid";
import { PatientFS } from "../../other/patientFile";
import { NotifyRenameProblem } from "../../components/Notify";

// Figure out a new name for the duplicate, copy the folder to it, rename the metadata file,
// and change the id inside the metadata file.
export function duplicateFolder(folder: Folder): {
  directory: string;
  metadataFilePath: string;
  success: boolean;
} {
  try {
    folder.saveAllFilesInFolder();
    //const name = Path.basename(folder.directory);
    const parentDir = Path.dirname(folder.directory);
    const nameOfDuplicate = getDuplicateFolderName(folder.directory);
    const pathOfDuplicate = Path.join(parentDir, nameOfDuplicate);
    assert(!fs.existsSync(pathOfDuplicate));

    // copy the folder, using its new name
    fs.copySync(folder.directory, pathOfDuplicate);

    // rename the metadata file in that folder

    // get the name of the metadatafile, e.g. ETR009.session or Joe.person
    const metaDataFileName = Path.basename(
      folder.metadataFile!.metadataFilePath
    );

    // get the full path to that file
    const duplicateMetadataFilePath = Path.join(
      pathOfDuplicate,
      metaDataFileName
    );

    assert(
      fs.existsSync(duplicateMetadataFilePath),
      `Expected to find that we had created ${duplicateMetadataFilePath}`
    );

    const ext = folder.metadataFile!.fileExtensionForMetadata;

    // get the full path to change it to (ony the name is changing)
    const fixedDuplicateMetadataFilePath = Path.join(
      pathOfDuplicate,
      nameOfDuplicate + ext
    );
    // rename that file

    PatientFS.renameSyncWithNotifyAndRethrow(
      duplicateMetadataFilePath,
      fixedDuplicateMetadataFilePath
    );

    assert(
      fs.existsSync(fixedDuplicateMetadataFilePath),
      "Failed rename the new file."
    );
    assert(
      !fs.existsSync(duplicateMetadataFilePath),
      "Failed rename the new file; the old file still exists."
    );
    /* No: setting the id will be done when the session is loaded by the project.
        // Change the id inside the file
        let xml = fs.readFileSync(fixedDuplicateMetadataFilePath, "utf8") as string;
        const newId = "newGuy";
        xml = xml.replace(
          /<id type="string">.*<\/id>/,
          `<id type="string">${newId}</id>`
        );
        assert(
          xml.indexOf(`${newId}<\/id>`) > -1,
          "Failed to fix the id of the new file."
        );
        fs.writeFileSync(fixedDuplicateMetadataFilePath, xml);
    */
    return {
      directory: pathOfDuplicate,
      metadataFilePath: fixedDuplicateMetadataFilePath,
      success: true
    };
  } catch (err) {
    ShowMessageDialog({
      title: `Error`,
      text: `There was an error while duplicating ${folder.directory}: ${err}`
    });
    return { success: false, directory: "", metadataFilePath: "" };
  }
}
export function getDuplicateFolderName(folderPath: string): string {
  const originalName = Path.basename(folderPath).replace(/ - Copy \d+/, "");
  const parentDir = Path.dirname(folderPath);
  let counter = 0;
  let name: string;
  do {
    ++counter;
    name = `${originalName} - Copy ${counter.toString()}`;
  } while (fs.existsSync(Path.join(parentDir, name)));
  return name;
}
