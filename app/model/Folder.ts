import { File } from "./File";
import { observable } from "mobx";
import {
  IFieldDefinition,
  Field,
  FieldType,
  FieldVisibility
} from "./field/Field";

import * as fs from "fs";
import * as Path from "path";
import * as glob from "glob";
import { FieldSet } from "./field/FieldSet";

export class IFolderSelection {
  @observable public index: number;
}

// Project, Session, or Person
export abstract class Folder {
  //public path: string = "";
  public directory: string = "";
  @observable public files: File[] = [];
  @observable public selectedFile: File;

  public constructor(directory: string, files: File[]) {
    this.directory = directory;
    this.files = files;
    this.selectedFile = files[0];
    this.properties.manditoryTextProperty("title", "untitled");
  }

  public abstract get metadataFileExtensionWithDot(): string;
  // the awkward things is that these DirectoryObjects (Project/Session/Person) do
  // have one of their files that contains their properties, but it is natural
  // to think of these properties as belonging to the (Project/Session/Person) itself.
  // So for the time being, we're wrapping the properties of that first file so that
  // they are directly accessible via objects of this class.

  public get properties(): FieldSet {
    if (this.files.length === 0) {
      // we don't have our meta file loaded yet
      const sessionName = Path.basename(this.directory);
      const path = Path.join(
        this.directory,
        sessionName + this.metadataFileExtensionWithDot
      );
      if (!fs.existsSync(path)) {
        // it doesn't even exist yet
        fs.writeFileSync(path, "", "utf8");
      }
      this.files.push(new File(path));
    }
    return this.files[0].properties;
  }

  get type(): string {
    const x = this.properties.getValue("type") as Field;
    return x ? x.text : "???";
  }

  public get displayName(): string {
    return "Should be overriden";
  }

  ///Load the files constituting a session, person, or project
  protected static loadChildFiles(
    directory: string,
    mainMetadataFileExtensionWithDot: string,
    rootXmlTag: string,
    knownFields: IFieldDefinition[] = []
  ): File[] {
    const files = new Array<File>();

    // the first file we want to return is special. It is the metadata file for the DirectoryObject (Project | Session | Person)
    const name = Path.basename(directory);
    const folderMetadataPath = Path.join(
      directory,
      name + mainMetadataFileExtensionWithDot
    );
    if (!fs.existsSync(folderMetadataPath)) {
      fs.writeFileSync(
        folderMetadataPath,
        `<${rootXmlTag}></${rootXmlTag}>`,
        "utf8"
      );
    }
    const folderMetaDataFile = new File(folderMetadataPath);

    knownFields.forEach((f: IFieldDefinition) => {
      const field = Field.fromFieldDefinition(f);
      folderMetaDataFile.properties.setValue(field.key, field);
    });

    folderMetaDataFile.readMetadataFile(folderMetadataPath);
    files.push(folderMetaDataFile);

    //read the other files
    const filePaths = glob.sync(Path.join(directory, "*.*"));
    filePaths.forEach(path => {
      if (!path.endsWith(mainMetadataFileExtensionWithDot)) {
        // the .meta companion files will be read and loaded into the properties of
        // the files they describe will be found and loaded, by the constructor of the ComponentFile
        if (!path.endsWith(".meta") && !path.endsWith(".test")) {
          const file = new File(path);
          files.push(file);
        }
      }
    });
    return files;
  }
}
