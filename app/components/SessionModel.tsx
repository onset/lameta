import { observable } from "mobx";

export interface ISessionSelection {
  index: number;
}

export class ISession {
  @observable public title: string = "";
  @observable public people: string = "";
  @observable public genre: string = "";
  @observable public situation: string = "";
  @observable public setting: string = "";
  @observable public location: string = "";
  @observable public access: string = "";
  @observable public description: string = "";
  @observable public date: string = ""; //TODO
  @observable public files: IFile[] = [];
  @observable public selectedFile: IFile;
  public path: string = "";
  public directory: string = "";

  public setString(key: string, value: string) {
    this[key] = value;
  }
  public getString(key: string): string {
    return this[key];
  }
  [key: string]: string | IFile[] | any; // not sure about this. allows setting property by name

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
export interface IFile {
  name: string;
  type: string;
  date: string;
  size: string;
}
