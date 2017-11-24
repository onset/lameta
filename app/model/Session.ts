import { observable } from "mobx";
import { DirectoryObject, FormObject, Polytext } from "./BaseModel";

export interface ISessionSelection {
  index: number;
}

export class Session extends DirectoryObject {
  @observable public title: Polytext = new Polytext("Title", "");
  @observable public people: Polytext = new Polytext("People", "");
  @observable public genre: Polytext = new Polytext("Genre", "");
  @observable public situation: Polytext = new Polytext("Situation", "");
  @observable public setting: Polytext = new Polytext("Setting", "");
  @observable public location: Polytext = new Polytext("Location", "");
  @observable public access: Polytext = new Polytext("Access", "");
  @observable public description: Polytext = new Polytext("Description", "");
  @observable public date: Polytext = new Polytext("Date", ""); //TODO

  public static fromObject(instanceData: object): Session {
    const session = new Session();
    session.loadFromObject(instanceData);
    return session;
  }
}
