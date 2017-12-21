import * as fs from "fs";
import * as mobx from "mobx";
import * as Path from "path";
import * as glob from "glob";
import { Session } from "./Session/Session";
import { IFolderSelection, Folder } from "../Folder";
import { Person } from "./Person/Person";
import { File, FolderMetdataFile } from "../file/File";
import { Field, FieldType, FieldVisibility } from "../field/Field";
import ImdiExporter from "../../export/imdi";
import { ProjectDocuments } from "./ProjectDocuments";
import { AuthorityLists } from "./AuthorityLists/AuthorityLists";
import { intercept } from "mobx";
const knownFieldDefinitions = require("../field/fields.json");

export class Project extends Folder {
  @mobx.observable public selectedSession: IFolderSelection;
  @mobx.observable public selectedPerson: IFolderSelection;
  @mobx.observable public sessions: Session[] = [];
  @mobx.observable public persons: Person[] = [];

  public descriptionFolder: Folder;
  public otherDocsFolder: Folder;
  public authorityLists: AuthorityLists;

  private constructor(
    directory: string,
    metadataFile: File,
    files: File[],
    descriptionFolder: Folder,
    otherDocsFolder: Folder
  ) {
    super(directory, metadataFile, files);
    this.selectedSession = new IFolderSelection();
    this.selectedPerson = new IFolderSelection();
    this.descriptionFolder = descriptionFolder;
    this.otherDocsFolder = otherDocsFolder;
    this.authorityLists = new AuthorityLists();

    // when the user changes the chosen access protocol, we need to let the authorityLists
    // object know so that it can provide the correct set of choices to the Settings form.
    this.properties
      .getValue("accessProtocol")
      .textHolder.map.intercept(change => {
        const protocol = change.newValue as string;
        console.log("Protocol = " + protocol);
        this.authorityLists.setAccessProtocol(protocol);
        return change;
      });
  }

  public static fromDirectory(directory: string): Project {
    const metadataFile = new FolderMetdataFile(directory, "Project", ".sprj");

    const descriptionFolder = ProjectDocuments.fromDirectory(
      directory,
      "DescriptionDocuments"
    );

    const otherDocsFolder = ProjectDocuments.fromDirectory(
      directory,
      "OtherDocuments"
    );

    const files = this.loadChildFiles(
      directory,
      metadataFile,
      knownFieldDefinitions.project
    );
    // console.log(
    //   "Project had " + files.length + " files. " + JSON.stringify(files)
    // );

    const project = new Project(
      directory,
      metadataFile,
      files,
      descriptionFolder,
      otherDocsFolder
    );

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

    //project.files[0].save();
    // tslint:disable-next-line:no-unused-expression
    return project;
  }
}
