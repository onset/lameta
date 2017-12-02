import { observable } from "mobx";
import { DirectoryObject, Polytext } from "./BaseModel";

export interface ISessionSelection {
  index: number;
}

export class Session extends DirectoryObject {
  // @observable public title: Polytext = new Polytext("Title", "");
  // @observable public people: Polytext = new Polytext("People", "");
  // @observable public genre: Polytext = new Polytext("Genre", "");
  // @observable public situation: Polytext = new Polytext("Situation", "");
  // @observable public setting: Polytext = new Polytext("Setting", "");
  // @observable public location: Polytext = new Polytext("Location", "");
  // @observable public access: Polytext = new Polytext("Access", "");
  // @observable public description: Polytext = new Polytext("Description", "");
  // @observable public date: Polytext = new Polytext("Date", ""); //TODO

  public constructor(path: string) {
    super(path);
    this.properties.setValue("title", new Polytext("Title", "untitled"));
    this.properties.setValue("people", new Polytext("People", ""));
    this.properties.setValue("genre", new Polytext("Genre", ""));
    this.properties.setValue("situation", new Polytext("Situation", ""));
    this.properties.setValue("setting", new Polytext("Setting", ""));
    this.properties.setValue("location", new Polytext("Location", ""));
    this.properties.setValue("access", new Polytext("Access", ""));
    this.properties.setValue("description", new Polytext("Description", ""));
    this.properties.setValue("date", new Polytext("Date", "")); //TODO
  }
  public static fromObject(path: string, instanceData: object): Session {
    const session = new Session(path);
    session.loadFromObject(instanceData);
    return session;
  }
}
