import { observable } from "mobx";
import { TextField } from "./Fields";
import { DirectoryObject } from "./DirectoryObject";

export interface ISessionSelection {
  index: number;
}

export class Session extends DirectoryObject {
  public constructor(path: string) {
    super(path);
    this.addTextProperty("title", "untitled");
    this.addTextProperty("people", "");
    this.addTextProperty("genre", "");
    this.addTextProperty("situation", "");
    this.addTextProperty("setting", "");
    this.addTextProperty("location", "");
    this.addTextProperty("access", "");
    this.addTextProperty("description", "");
    this.addDateProperty("date", new Date()); //TODO: does that work as 'unknown'?
  }
  public static fromObject(path: string, instanceData: object): Session {
    const session = new Session(path);
    session.loadFromObject(instanceData);
    return session;
  }
}
