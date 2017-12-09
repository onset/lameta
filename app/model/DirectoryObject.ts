import { ComponentFile, FieldSet } from "./ComponentFile";
import { observable } from "mobx";
import { TextField, DateField } from "./Fields";
import * as assert from "assert";
import * as fs from "fs";
import * as Path from "path";

export interface IDirectoryObjectSelection {
  selected: DirectoryObject;
}

// Project, Session, or Person
export abstract class DirectoryObject {
  //public path: string = "";
  public directory: string = "";
  @observable public files: ComponentFile[] = [];
  @observable public selectedFile: ComponentFile;

  public constructor(directory: string, files: ComponentFile[]) {
    this.directory = directory;
    this.files = files;
    this.selectedFile = files[0];
    this.manditoryTextProperty("title", "untitled");
  }

  public abstract get metadataFileExtensionWithDot(): string;
  // the awkward things is that these DirectoryObjects (Project/Session/Person) do
  // have one of their files that contains their properties, but it is natural
  // to think of these properties as belonging to the (Project/Session/Person) itself.
  // So for the time being, we're wrapping the properties of that first file so that
  // they are directly accessible via objects of this class.

  public get properties(): FieldSet {
    if (this.files.length === 0) {
      // we don't have our meta file loaded yet
      const sessionName = Path.basename(this.directory);
      const path = Path.join(
        this.directory,
        sessionName + this.metadataFileExtensionWithDot
      );
      if (!fs.existsSync(path)) {
        // it doesn't even exist yet
        fs.writeFileSync(path, "", "utf8");
      }
      this.files.push(new ComponentFile(path));
    }
    return this.files[0].properties;
  }
  public getTextStringOrEmpty(key: string): string {
    const s = this.properties.getValue(key) as TextField;
    return s ? s.english : "";
  }
  public getTextField(key: string): TextField {
    return this.properties.getValue(key) as TextField;
  }
  public getDateField(key: string): DateField {
    return this.properties.getValue(key) as DateField;
  }
  protected addDateProperty(key: string, date: Date) {
    this.checkType(key, date);
    this.properties.setValue(key, new DateField(key, date));
  }

  public manditoryTextProperty(key: string, value: string) {
    if (!this.properties.containsKey(key)) {
      this.properties.setValue(key, new TextField(key, value));
      console.log("Adding " + key + "=" + value);
    }
  }

  public addTextProperty(key: string, value: string) {
    this.properties.setValue(key, new TextField(key, value));
    console.log("Adding " + key + "=" + value);
  }

  get type(): string {
    const x = this.properties.getValue("type") as TextField;
    return x ? x.english : "???";
  }
  private checkType(key: string, value: any) {
    if (this.properties.containsKey(key)) {
      const a = typeof this.properties.getValue(key);
      const b = typeof value;
      assert(a === b, `Cannot change type of ${key} from ${a} to ${b}`);
    }
  }
}
