import { File, OtherFile } from "./file/File";
import * as electron from "electron";
import { observable } from "mobx";
import {
  IFieldDefinition,
  Field,
  FieldType,
  FieldVisibility
} from "./field/Field";

import * as fs from "fs-extra";
import * as Path from "path";
import * as glob from "glob";
import { FieldSet } from "./field/FieldSet";
import * as assert from "assert";

export class IFolderSelection {
  @observable public index: number;
}

// Project, Session, or Person
export class Folder {
  public directory: string = "";
  @observable public files: File[] = [];
  @observable public selectedFile: File | null;
  protected metadataFile: File | null;

  public constructor(
    directory: string,
    metadataFile: File | null,
    files: File[]
  ) {
    this.directory = directory;
    this.metadataFile = metadataFile;
    this.files = files;
    this.selectedFile = metadataFile;
    this.properties.manditoryTextProperty("title", "untitled");
  }

  // the awkward things is that these Folder objects (Project/Session/Person) do
  // have one of their files that contains their properties, but it is natural
  // to think of these properties as belonging to the (Project/Session/Person) itself.
  // So for the time being, we're wrapping the properties of that first file so that
  // they are directly accessible via objects of this class.

  public get properties(): FieldSet {
    if (this.metadataFile) {
      return this.metadataFile.properties;
    } else {
      return new FieldSet(); //review... property document folders don't have properties
    }
  }

  public addFiles(files: object[]) {
    assert(files.length > 0);

    files.forEach((f: any) => {
      console.log("copy in " + f.path);
      const dest = Path.join(this.directory, Path.basename(f.path));
      fs.copySync(f.path, dest);
      this.files.push(new OtherFile(dest));
    });
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
    folderMetaDataFile: File,
    knownFields: IFieldDefinition[] = []
  ): File[] {
    const files = new Array<File>();

    // load the file containing metadata about this folder
    knownFields.forEach((f: IFieldDefinition, i: number) => {
      f.order = i;
      const field = Field.fromFieldDefinition(f);
      folderMetaDataFile.properties.setValue(field.key, field);
    });
    folderMetaDataFile.readMetadataFile();
    files.push(folderMetaDataFile);

    //collect the other files and the metdata files they are paired with
    const filePaths = glob.sync(Path.join(directory, "*.*"));
    filePaths.forEach(path => {
      if (path !== folderMetaDataFile.metadataFilePath) {
        // the .meta companion files will be read and loaded into the properties of
        // the files they describe will be found and loaded, by the constructor of the ComponentFile
        if (
          !path.endsWith(".meta") &&
          !path.endsWith(".test") &&
          Path.normalize(path) !==
            Path.normalize(folderMetaDataFile.metadataFilePath)
        ) {
          const file = new OtherFile(path);
          files.push(file);
        }
      }
    });
    return files;
  }
}
