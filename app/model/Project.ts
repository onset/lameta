import * as fs from "fs";
import * as mobx from "mobx";
import * as Path from "path";
import { Session } from "./Session";
import { IFolderSelection, Folder } from "./Folder";
import { Person } from "./Person";
import { File, ProjectMetdataFile } from "./file/File";
import { Field, FieldType, FieldVisibility } from "./field/Field";
import ImdiExporter from "../export/imdi";
const knownFieldDefinitions = require("./field/fields.json");

export class Project extends Folder {
  @mobx.observable public selectedSession: IFolderSelection;
  @mobx.observable public selectedPerson: IFolderSelection;
  @mobx.observable public sessions: Session[] = [];
  @mobx.observable public persons: Person[] = [];

  private constructor(directory: string, metadataFile: File, files: File[]) {
    super(directory, metadataFile, files);
    this.selectedSession = new IFolderSelection();
    this.selectedPerson = new IFolderSelection();
  }

  public get metadataFileExtensionWithDot(): string {
    return ".sprj";
  }

  public static fromDirectory(directory: string): Project {
    const name = Path.basename(directory);
    const metadataPath = Path.join(directory, name + ".sprj");
    const metdataFile = new ProjectMetdataFile(metadataPath);

    const files = this.loadChildFiles(
      directory,
      metdataFile,
      knownFieldDefinitions.project
    );
    const project = new Project(directory, metdataFile, files);

    fs
      .readdirSync(Path.join(directory, "Sessions"), "utf8")
      .forEach(childName => {
        const dir = Path.join(directory, "Sessions", childName);
        if (fs.lstatSync(dir).isDirectory()) {
          // console.log(dir);
          const session = Session.fromDirectory(dir);
          project.sessions.push(session);
        }
        // else ignore it
      });

    fs
      .readdirSync(Path.join(directory, "People"), "utf8")
      .forEach(childName => {
        const dir = Path.join(directory, "People", childName);
        if (fs.lstatSync(dir).isDirectory()) {
          //console.log(dir);
          const person = Person.fromDirectory(dir);
          project.persons.push(person);
        }
        // else ignore it
      });

    project.selectedSession.index = 0;
    project.selectedPerson.index = 0;

    project.files[0].save();
    // tslint:disable-next-line:no-unused-expression
    return project;
  }
}
