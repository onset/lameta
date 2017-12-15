import { Folder } from "./Folder";
import { File } from "./File";
const knownFieldDefinitions = require("./field/fields.json");

export class Session extends Folder {
  public get metadataFileExtensionWithDot(): string {
    return ".session";
  }

  public get displayName(): string {
    return this.properties.getTextStringOrEmpty("title");
  }

  public constructor(directory: string, files: File[]) {
    super(directory, files);
  }
  public static fromDirectory(path: string): Session {
    const files = this.loadChildFiles(
      path,
      ".session",
      "Session",
      knownFieldDefinitions.session
    );

    //start autosave
    // mobx.autorunAsync(
    //   () => this.save(),
    //   10 * 1000 /* min 10 seconds in between */
    // );

    return new Session(path, files);
  }
}
