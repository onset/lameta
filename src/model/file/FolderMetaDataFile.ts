import fs from "fs";
import * as Path from "path";
import { Field } from "../field/Field";
import { FieldDefinition } from "../field/FieldDefinition";
import { File } from "./File";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import {
  fieldDefinitionsOfCurrentConfig,
  prepareGlobalFieldDefinitionCatalog
} from "../field/ConfiguredFieldDefinitions";

// project, sessions, and person folders have a single metadata file describing their contents, and this ends
// in a special extension (.sprj, .session, .person)
export class FolderMetadataFile extends File {
  constructor(
    directory: string,
    xmlRootName: string,
    doOutputTypeInXmlTags: boolean,
    fileExtensionForMetadata: string,
    fieldCatalog: FieldDefinition[],
    customVocabularies: EncounteredVocabularyRegistry
  ) {
    const name = Path.basename(directory);
    //if the metadata file doesn't yet exist, just make an empty one.
    const metadataPath = Path.join(directory, name + fileExtensionForMetadata);
    if (!fs.existsSync(metadataPath)) {
      fs.writeFileSync(metadataPath, `<${xmlRootName}></${xmlRootName}>`); // NO: break SayMore Classic <${xmlRootName}/>
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
    this.readDefinitionsFromJson(fieldCatalog);

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

  public static loadDefaultConfigIfInUnitTest() {
    // for unit tests only
    if (process.env.NODE_ENV === "test") {
      if (
        fieldDefinitionsOfCurrentConfig.project === undefined ||
        fieldDefinitionsOfCurrentConfig.project.length === 0 ||
        fieldDefinitionsOfCurrentConfig.session === undefined ||
        fieldDefinitionsOfCurrentConfig.session.length === 0
      ) {
        prepareGlobalFieldDefinitionCatalog("default");
      }
    }
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
