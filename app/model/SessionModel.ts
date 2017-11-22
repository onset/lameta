import { observable } from "mobx";
import { ObjectWithChildFiles } from "./BaseModel";

export interface ISessionSelection {
  index: number;
}

export class ISession extends ObjectWithChildFiles {
  @observable public title: string = "";
  @observable public people: string = "";
  @observable public genre: string = "";
  @observable public situation: string = "";
  @observable public setting: string = "";
  @observable public location: string = "";
  @observable public access: string = "";
  @observable public description: string = "";
  @observable public date: string = ""; //TODO
  public path: string = "";
  public directory: string = "";

  // see https://stackoverflow.com/questions/22875636/how-do-i-cast-a-json-object-to-a-typescript-class
  // this is lame because it ignores any property that does not have an initializer
  public static fromObject(instanceData: ISession): ISession {
    const session = new ISession();
    // Note this.active will not be listed in keys since it's declared, but not defined
    const keys = Object.keys(session);

    for (const key of keys) {
      if (instanceData.hasOwnProperty(key)) {
        session[key] = instanceData[key];
      }
    }
    return session;
  }
}
