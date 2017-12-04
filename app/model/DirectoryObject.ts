import { ComponentFile } from "./ComponentFile";
import { observable } from "mobx";

export interface IDirectoryObjectSelection {
  selected: DirectoryObject;
}

// Project, Session, or Person
export class DirectoryObject extends ComponentFile {
  public path: string = "";
  public directory: string = "";
  @observable public files: ComponentFile[] = [];
  @observable public selectedFile: ComponentFile;
}
