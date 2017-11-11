export interface ISession {
    title: string;
    date: string;
    files: IFile[];
  }

export interface IFile {
    name: string;
    type: string;
    date: string;
    size: string;
}
