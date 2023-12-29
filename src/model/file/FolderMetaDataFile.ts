import fs from "fs";
import * as Path from "path";
import { Field } from "../field/Field";
import { FieldDefinition } from "../field/FieldDefinition";
import { File } from "./File";
import { CustomFieldRegistry } from "../Project/CustomFieldRegistry";
import fieldDefinitionsOfCurrentConfig, {
  prepareFieldDefinitionCatalog
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
    customFieldRegistry: CustomFieldRegistry
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
    //TODO: this is really only for the project... have a bit of a pulling up by bootstraps problem here
    if (fieldCatalog.length == 0) {
      {
        // read in the metadataPath xml file and then use a regex to extract the value of the AccessProtocol element.
        const contents = fs.readFileSync(metadataPath, "utf8");
        // TODO: should we migrate? Probably duplicate for backwards compat for a while?
        // TODO: change name to archiveRepository, for now, using the existing AccessProtocol

        const regex = /<AccessProtocol>(.*)<\/AccessProtocol>/gm;
        const archive = regex.exec(contents)?.[1] || "default";

        prepareFieldDefinitionCatalog(archive);
        fieldCatalog = fieldDefinitionsOfCurrentConfig.project;
      }
    }

    this.customFieldNamesRegistry = customFieldRegistry;
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
