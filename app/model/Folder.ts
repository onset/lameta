import { File } from "./File";
import { observable } from "mobx";
import {
  TextField,
  DateField,
  Field,
  FieldType,
  FieldVisibility
} from "./Field";
import * as assert from "assert";
import * as fs from "fs";
import * as Path from "path";
import * as glob from "glob";
import * as xml2js from "xml2js";
import { FieldSet } from "./FieldSet";

export class IFolderSelection {
  @observable public index: number;
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
    this.properties.manditoryTextProperty("title", "untitled");
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

  get type(): string {
    const x = this.properties.getValue("type") as TextField;
    return x ? x.english : "???";
  }

  public get displayName(): string {
    return "Should be overriden";
  }

  ///Load the files constituting a session, person, or project
  protected static loadChildFiles(
    directory: string,
    mainMetadataFileExtensionWithDot: string,
    rootXmlTag: string,
    knownFields: Array<Field | string> = []
  ): File[] {
    const files = new Array<File>();

    // the first file we want to return is special. It is the metadata file for the DirectoryObject (Project | Session | Person)
    const name = Path.basename(directory);
    const folderMetadataPath = Path.join(
      directory,
      name + mainMetadataFileExtensionWithDot
    );
    if (!fs.existsSync(folderMetadataPath)) {
      fs.writeFileSync(
        folderMetadataPath,
        `<${rootXmlTag}></${rootXmlTag}>`,
        "utf8"
      );
    }
    const folderMetaDataFile = new File(folderMetadataPath);

    knownFields.forEach(f => {
      const field: Field =
        f === Object(f)
          ? (f as Field)
          : Field.create(
              f as string,
              "",
              undefined,
              FieldType.String,
              FieldVisibility.OnForm
            );
      folderMetaDataFile.properties.setValue(field.key, field);
    });

    this.readMetadataFile(folderMetaDataFile, folderMetadataPath);
    files.push(folderMetaDataFile);

    //read the other files
    const filePaths = glob.sync(Path.join(directory, "*.*"));
    filePaths.forEach(path => {
      if (!path.endsWith(mainMetadataFileExtensionWithDot)) {
        // the .meta companion files will be read and loaded into the properties of
        // the files they describe will be found and loaded, by the constructor of the ComponentFile
        if (!path.endsWith(".meta") && !path.endsWith(".test")) {
          const file = new File(path);
          if (fs.existsSync(path + ".meta")) {
            this.readMetadataFile(file, path + ".meta");
          }
          files.push(file);
        }
      }
    });
    return files;
  }

  private static readMetadataFile(file: File, path: string) {
    const xml: string = fs.readFileSync(path, "utf8");

    let xmlAsObject: any = {};
    xml2js.parseString(
      xml,
      { async: false, explicitArray: false },
      (err, result) => {
        if (err) {
          throw err;
        }
        xmlAsObject = result;
      }
    );
    // that will have a root with one child, like "Session" or "Meta". Zoom in on that
    // so that we just have the object with its properties.
    const properties = xmlAsObject[Object.keys(xmlAsObject)[0]];
    file.loadProperties(properties);
  }
}
