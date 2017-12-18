import { Folder } from "./Folder";
import { File, FolderMetdataFile } from "./file/File";
import * as Path from "path";
const knownFieldDefinitions = require("./field/fields.json");

export class Session extends Folder {
  public get metadataFileExtensionWithDot(): string {
    return ".session";
  }

  public get displayName(): string {
    return this.properties.getTextStringOrEmpty("title");
  }

  public constructor(directory: string, metadataFile: File, files: File[]) {
    super(directory, metadataFile, files);
  }
  public static fromDirectory(directory: string): Session {
    const metadataFile = new FolderMetdataFile(
      directory,
      "Session",
      ".session"
    );

    const files = this.loadChildFiles(
      directory,
      metadataFile,
      knownFieldDefinitions.session
    );

    //start autosave
    // mobx.autorunAsync(
    //   () => this.save(),
    //   10 * 1000 /* min 10 seconds in between */
    // );

    return new Session(directory, metadataFile, files);
  }
}
