import { File, OtherFile } from "./file/File";
import * as electron from "electron";
import { observable } from "mobx";
import {
  FieldDefinition,
  Field,
  FieldType,
  FieldVisibility
} from "./field/Field";

import * as fs from "fs-extra";
import * as Path from "path";
import * as glob from "glob";
import { FieldSet } from "./field/FieldSet";
import * as assert from "assert";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
const sanitize = require("sanitize-filename");
import { trash } from "../crossPlatformUtilities";

export class IFolderSelection {
  @observable public index: number;
}

// Project, Session, or Person
export abstract class Folder {
  public directory: string = "";
  @observable public files: File[] = [];
  @observable public selectedFile: File | null;
  public metadataFile: File | null;
  protected safeFileNameBase: string;

  public constructor(
    directory: string,
    metadataFile: File | null,
    files: File[]
  ) {
    this.directory = directory;
    this.metadataFile = metadataFile;
    this.files = files;
    this.selectedFile = metadataFile;
    //this.properties.addCustomProperty("color", "blue");
  }
  public get filePrefix(): string {
    return Path.basename(Path.basename(this.directory));
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
  public addOneFile(path: string) {
    console.log("copy in " + path);
    const dest = Path.join(this.directory, Path.basename(path));
    fs.copySync(path, dest);
    this.files.push(new OtherFile(dest));
  }
  public addFiles(files: object[]) {
    assert.ok(files.length > 0);

    files.forEach((f: any) => {
      this.addOneFile(f.path);
    });
  }
  get type(): string {
    const x = this.properties.getValueOrThrow("type") as Field;
    return x ? x.text : "???";
  }

  public abstract get displayName(): string;
  public knownFields: FieldDefinition[];

  ///Load the files constituting a session, person, or project
  protected static loadChildFiles(
    directory: string,
    folderMetaDataFile: File,
    rawKnownFieldsFromJson: FieldDefinition[] = []
  ): File[] {
    const knownFields: FieldDefinition[] = rawKnownFieldsFromJson.map(f => {
      return new FieldDefinition(f);
    });

    const files = new Array<File>();
    // load the file containing metadata about this folder
    knownFields.forEach((f: FieldDefinition, i: number) => {
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
        // We don't explicitly do anything with the the .meta companion files here,
        // becuase the the constructor of the ComponentFile is responsible for finding & loading it, (or creating it if missing?).
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
  private forgetFile(file: File) {
    const index = this.files.indexOf(file);
    this.files.splice(index, 1);
  }

  public moveFileToTrash(file: File) {
    ConfirmDeleteDialog.show(file.describedFilePath, (path: string) => {
      let continueTrashing = true; // if there is no described file, then can always go ahead with trashing metadata file
      if (fs.existsSync(file.describedFilePath)) {
        // electron.shell.showItemInFolder(file.describedFilePath);
        continueTrashing = trash(file.describedFilePath);
      }
      if (
        continueTrashing && // don't trash metadata if something went wrong trashing "described file"
        file.metadataFilePath &&
        file.metadataFilePath !== file.describedFilePath
      ) {
        if (fs.existsSync(file.metadataFilePath)) {
          const didTrashMetadataFile = trash(file.metadataFilePath);
          assert(
            didTrashMetadataFile,
            "Failed to trash metadatafile:" + file.metadataFilePath
          );
        }
      }

      if (continueTrashing) {
        this.forgetFile(file);
      }
    });
  }

  protected renameFilesAndFolders(newFolderName: string) {
    const oldDirPath = this.directory;
    const oldFolderName = Path.basename(oldDirPath);
    if (oldFolderName === newFolderName) {
      return; // nothing to do
    }

    const parentPath = Path.dirname(this.directory);
    const newDirPath = Path.join(parentPath, newFolderName);

    this.files.forEach(f => {
      f.updateNameBasedOnNewFolderName(newFolderName);
    });
    fs.renameSync(this.directory, newDirPath);
    this.directory = newDirPath;
  }

  protected fieldContentThatControlsFolderName(): string {
    return "UNUSED-IN-THIS-CLASS";
  }

  public nameMightHaveChanged() {
    const s = sanitize(this.fieldContentThatControlsFolderName());
    if (s.length > 0 && s !== this.safeFileNameBase) {
      this.safeFileNameBase = s;
      console.log("Renaming " + s);
      this.renameFilesAndFolders(s);
    }
  }

  public saveFolderMetaData() {
    assert.ok(this.metadataFile);
    if (this.metadataFile) {
      this.metadataFile.save();
    }
  }

  public saveAllFilesInFolder() {
    for (const f of this.files) {
      f.save();
    }
  }

  public couldPossiblyBecomeDirty() {
    if (this.metadataFile) {
      this.metadataFile.couldPossiblyBecomeDirty();
    }
  }
  public wasChangeThatMobxDoesNotNotice() {
    if (this.metadataFile) {
      this.metadataFile.wasChangeThatMobxDoesNotNotice();
    }
  }
}
