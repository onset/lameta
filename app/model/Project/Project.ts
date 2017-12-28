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
import {
  AuthorityLists,
  IAccessProtocolChoice
} from "./AuthorityLists/AuthorityLists";

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

    this.setupProtocolChoices();
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

  // override that isn't actually used in our UI
  public get displayName(): string {
    return "Project";
  }

  private getUniqueFolder(directory: string, baseName: string): string {
    // get a uniquely-named directory to use
    let i = 0;
    let name = baseName;
    while (fs.existsSync(Path.join(directory, name))) {
      i++;
      name = baseName + " " + i;
    }
    const dir = Path.join(directory, name);

    // make the folder dir and the  metadata file
    fs.mkdirSync(dir);
    return dir;
  }

  public addSession() {
    const dir = this.getUniqueFolder(
      Path.join(this.directory, "Sessions"),
      "New Session"
    );
    //const metadataFile = new FolderMetdataFile(dir, "Session", ".session");
    const session = Session.fromDirectory(dir);
    session.properties.setText("id", Path.basename(dir));
    this.sessions.push(session);
    this.selectedSession.index = this.sessions.length - 1;
  }

  public addPerson() {
    const dir = this.getUniqueFolder(
      Path.join(this.directory, "People"),
      "New Person"
    );
    //const metadataFile = new FolderMetdataFile(dir, "Person", ".person");
    const person = Person.fromDirectory(dir);
    person.properties.setText("name", Path.basename(dir));
    this.persons.push(person);
    this.selectedPerson.index = this.persons.length - 1;
  }

  private setupProtocolChoices() {
    this.authorityLists.setAccessProtocol(
      this.properties.getTextStringOrEmpty("accessProtocol"),
      this.properties.getTextStringOrEmpty("customAccessChoices")
    );

    // when the user changes the chosen access protocol, we need to let the authorityLists
    // object know so that it can provide the correct set of choices to the Settings form.
    this.properties
      .getValue("accessProtocol")
      .textHolder.map.intercept(change => {
        this.authorityLists.setAccessProtocol(
          change.newValue as string,
          this.properties.getTextStringOrEmpty("customAccessChoices")
        );
        return change;
      });
    this.properties
      .getValue("customAccessChoices")
      .textHolder.map.intercept(change => {
        const currentProtocol = this.properties.getTextStringOrEmpty(
          "accessProtocol"
        );
        // a problem with this is that it's going going get called for every keystrock in the Custom Access Choices box
        this.authorityLists.setAccessProtocol(
          currentProtocol,
          change.newValue as string
        );
        return change;
      });
  }
}
