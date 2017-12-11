import { observable } from "mobx";
import { TextField } from "./Field";
import { Folder } from "./Folder";
import { File } from "./File";

export interface ISessionSelection {
  index: number;
}

export class Session extends Folder {
  public get metadataFileExtensionWithDot(): string {
    return ".session";
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
  // public static fromObject(path: string, instanceData: object): Session {
  //   const session = new Session(path);
  //   //session.loadFromObject(instanceData);
  //   return session;
  // }
}
