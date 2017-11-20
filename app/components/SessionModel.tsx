import { observable } from "mobx";

export interface ISessionSelection {
    index: number;
}

// export interface ISession {
//     title: string;
//     date: string;
//     files: IFile[];
//     [key: string]: string | IFile[]; // not sure about this. allows setting property by name
//   }

export class ISession {
    @observable title: string = "";
    @observable date: string  = ""; //TODO
    @observable files: IFile[] = [];

    setString(key: string, value: string) {
        let x : any = this;
        x[key] = value;
    }
    public getString(key: string) : string {
        return this[key];
    }
    [key: string]: string | IFile[] | any; // not sure about this. allows setting property by name

    // see https://stackoverflow.com/questions/22875636/how-do-i-cast-a-json-object-to-a-typescript-class
    // this is lame because it ignores any property that does not have an initializer
    public static fromObject(instanceData: ISession) : ISession {
      let session = new ISession();
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
