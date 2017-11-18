export interface ISessionSelection {
    index: number;
}

export interface ISession {
    title: string;
    date: string;
    files: IFile[];
    [key: string]: string | IFile[]; // not sure about this. allows setting property by name
  }

export interface IFile {
    name: string;
    type: string;
    date: string;
    size: string;
}
