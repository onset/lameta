import { observable } from "mobx";
import { Folder } from "./Folder";
import { File } from "./File";

export class Session extends Folder {
  public get metadataFileExtensionWithDot(): string {
    return ".session";
  }

  public get displayName(): string {
    return this.getTextStringOrEmpty("title");
  }

  public constructor(directory: string, files: File[]) {
    super(directory, files);
    this.manditoryTextProperty("people", "");
    this.manditoryTextProperty("genre", "");
    this.manditoryTextProperty("situation", "");
    this.manditoryTextProperty("setting", "");
    this.manditoryTextProperty("location", "");
    this.manditoryTextProperty("access", "");
    this.manditoryTextProperty("description", "");
    this.addDateProperty("date", new Date()); //TODO: does that work as 'unknown'?
  }
  public static fromDirectory(path: string): Session {
    const files = this.loadChildFiles(path, ".session");

    //start autosave
    // mobx.autorunAsync(
    //   () => this.save(),
    //   10 * 1000 /* min 10 seconds in between */
    // );

    return new Session(path, files);
  }
  public static save() {
    //console.log("saving " + session.getString("title"));
    //fs.writeFileSync(session.path + ".test", JSON.stringify(session), "utf8");
  }
}
