import { File, FieldSet } from "./File";
import { observable } from "mobx";
import { TextField, DateField } from "./Field";
import * as assert from "assert";
import * as fs from "fs";
import * as Path from "path";
import * as glob from "glob";
import { xml2js, xml2json } from "xml-js";

export interface IDirectoryObjectSelection {
  selected: Folder;
}

// Project, Session, or Person
export abstract class Folder {
  //public path: string = "";
  public directory: string = "";
  @observable public files: File[] = [];
  @observable public selectedFile: File;

  public constructor(directory: string, files: File[]) {
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
      this.files.push(new File(path));
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

  ///Load the files constituting a session, person, or project
  protected static loadChildFiles(
    directory: string,
    mainMetadataFileExtensionWithDot: string
  ): File[] {
    const files = new Array<File>();

    // the first file we want to return is special. It is the metadata file for the DirectoryObject (Project | Session | Person)
    const name = Path.basename(directory);
    const mainMetaPath = Path.join(
      directory,
      name + mainMetadataFileExtensionWithDot
    );
    if (!fs.existsSync(mainMetaPath)) {
      fs.writeFileSync(mainMetaPath, "<Session></Session>", "utf8");
    }
    const folder = new File(mainMetaPath);
    this.readMetaFile(folder, mainMetaPath);
    files.push(folder);

    //read the other files
    const filePaths = glob.sync(Path.join(directory, "*.*"));
    filePaths.forEach(path => {
      if (!path.endsWith(mainMetadataFileExtensionWithDot)) {
        // the .meta companion files will be read and loaded into the properties of
        // the files they describe will be found and loaded, by the constructor of the ComponentFile
        if (!path.endsWith(".meta") && !path.endsWith(".test")) {
          const file = new File(path);
          if (fs.existsSync(path + ".meta")) {
            this.readMetaFile(file, path + ".meta");
          }
          files.push(file);
        }
      }
    });
    return files;
  }

  private static readMetaFile(file: File, path: string) {
    const xml: string = fs.readFileSync(path, "utf8");
    const json: string = xml2json(xml, {
      ignoreComment: true,
      compact: true,
      ignoreDoctype: true,
      ignoreDeclaration: true,
      trim: true
    });
    const xmlAsObject = JSON.parse(json);
    // that will have a root with one child, like "Session" or "Meta". Zoom in on that
    // so that we just have the object with its properties.
    const properties = xmlAsObject[Object.keys(xmlAsObject)[0]];
    file.loadProperties(properties);
  }
}
