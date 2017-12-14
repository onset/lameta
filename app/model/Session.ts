import { observable } from "mobx";
import { Folder } from "./Folder";
import { File } from "./File";

export class Session extends Folder {
  public get metadataFileExtensionWithDot(): string {
    return ".session";
  }

  public get displayName(): string {
    return this.properties.getTextStringOrEmpty("title");
  }

  public constructor(directory: string, files: File[]) {
    super(directory, files);
    this.properties.manditoryTextProperty("people", "");
    this.properties.manditoryTextProperty("genre", "");
    this.properties.manditoryTextProperty("situation", "");
    this.properties.manditoryTextProperty("setting", "");
    this.properties.manditoryTextProperty("location", "");
    this.properties.manditoryTextProperty("access", "");
    this.properties.manditoryTextProperty("description", "");
    this.properties.addDateProperty("date", new Date()); //TODO: does that work as 'unknown'?
  }
  public static fromDirectory(path: string): Session {
    const files = this.loadChildFiles(path, ".session", "Session");

    //start autosave
    // mobx.autorunAsync(
    //   () => this.save(),
    //   10 * 1000 /* min 10 seconds in between */
    // );

    return new Session(path, files);
  }
}
