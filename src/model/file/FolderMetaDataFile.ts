import fs from "fs";
import * as Path from "path";
import { Field } from "../field/Field";
import { FieldDefinition } from "../field/FieldDefinition";
import { File } from "./File";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { PatientFS } from "../../other/patientFile";

// project, sessions, and person folders have a single metadata file describing their contents, and this ends
// in a special extension (.sprj, .session, .person)
export class FolderMetadataFile extends File {
  constructor(
    directory: string,
    xmlRootName: string,
    doOutputTypeInXmlTags: boolean,
    fileExtensionForMetadata: string,
    rawKnownFieldsFromJson: FieldDefinition[],
    customVocabularies: EncounteredVocabularyRegistry
  ) {
    const name = Path.basename(directory);

    let metadataPath = Path.join(directory, name + fileExtensionForMetadata);
    //if the metadata file doesn't exist yet or has the wrong name
    if (!fs.existsSync(metadataPath)) {
      // does a file exist here with the right extension but the wrong name?
      const files = fs.readdirSync(directory);
      const possibleFiles = files.filter((f) =>
        f.endsWith(fileExtensionForMetadata)
      );
      if (possibleFiles.length > 0) {
        // use the first one. The next save will try to sort out the names
        const pathToFileWithUnexpectedName = Path.join(
          directory,
          possibleFiles[0]
        );
        try {
          PatientFS.renameSync(pathToFileWithUnexpectedName, metadataPath);
          console.log(
            `renamed ${pathToFileWithUnexpectedName} to ${metadataPath}`
          );
          // ok good, we're all set
        } catch (err) {
          // ah well
          console.error(
            `Could not rename ${pathToFileWithUnexpectedName} to ${metadataPath}, using ${pathToFileWithUnexpectedName} instead`
          );
          metadataPath = pathToFileWithUnexpectedName;
        }
      } else {
        // ok, just make an empty one.
        fs.writeFileSync(metadataPath, `<${xmlRootName}></${xmlRootName}>`); // NO: break SayMore Classic <${xmlRootName}/>
      }
    }
    super(
      metadataPath,
      metadataPath,
      xmlRootName,
      doOutputTypeInXmlTags,
      fileExtensionForMetadata,
      false
    );
    this.encounteredVocabularyRegistry = customVocabularies;
    this.readDefinitionsFromJson(rawKnownFieldsFromJson);

    /* NB: don't do this within the constructor. subclass fields are not initialized until after super(): 
    this.finishLoading();

    Bizarrly, the only place this problem showed up is with Wallabyjs, when something downstream of finishLoading() was trying to access PersonMetadtaFile.languages,
    but it was undefined. Cost me hours trying to figure out. But according to the rules, it should *not* work:
    
    https://www.typescriptlang.org/docs/handbook/2/classes.html#initialization-order

    The base class initialized properties are initialized
    The base class constructor runs
    The derived class initialized properties are initialized
    The derived class constructor runs
    */
  }

  private readDefinitionsFromJson(rawKnownFieldsFromJson: FieldDefinition[]) {
    const knownFields: FieldDefinition[] = rawKnownFieldsFromJson.map((f) => {
      return new FieldDefinition(f);
    });

    // load the file containing metadata about this folder with
    // empty fields from the fields.json5 file
    knownFields.forEach((f: FieldDefinition) => {
      //f.tabIndex = i;
      const field = Field.fromFieldDefinition(f);
      this.properties.setValue(field.key, field);
      //console.log("Setting prop from fields.json5: " + field.key);
    });
  }
  protected specialLoadingOfField(
    tag: string,
    propertiesFromXml: any
  ): boolean {
    //console.log("FolderMetaDataFile.specialHandlingOfField");
    return false;
  }
}
