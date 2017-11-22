import { observable } from "mobx";

export interface IFile {
  name: string;
  type: string;
  date: string;
  size: string;
}

export class FormObject {
  public setString(key: string, value: string) {
    this[key] = value;
  }
  public getString(key: string): string {
    return this[key];
  }
  [key: string]: string | IFile[] | any; // not sure about this. allows setting property by name
}

export class ObjectWithChildFiles extends FormObject {
  @observable public files: IFile[] = [];
  @observable public selectedFile: IFile;
}
