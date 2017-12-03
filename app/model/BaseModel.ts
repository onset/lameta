import { observable } from "mobx";
import * as fs from "fs";
import * as Path from "path";
import { ComponentFile } from "./ComponentFile";

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

export class Polytext {
  @observable public text = new Map();
  public englishLabel: string; // just for debugging at this point
  constructor(label: string, englishValue: string) {
    this.text.set("en", englishValue);
    this.englishLabel = label;
  }
  get english(): string {
    return this.text.get("en");
  }
  set english(value: string) {
    console.log(this.englishLabel + ":setDefault(" + value + ")");
    this.text.set("en", value);
  }
}
