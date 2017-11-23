import { observable } from "mobx";
import { DirectoryObject, FormObject } from "./BaseModel";

export interface ISessionSelection {
  index: number;
}

export class Session extends DirectoryObject {
  @observable public title: string = "";
  @observable public people: string = "";
  @observable public genre: string = "";
  @observable public situation: string = "";
  @observable public setting: string = "";
  @observable public location: string = "";
  @observable public access: string = "";
  @observable public description: string = "";
  @observable public date: string = ""; //TODO

  public static fromObject(instanceData: FormObject): Session {
    const session = new Session();
    session.loadFromObject(instanceData);
    return session;
  }
}
