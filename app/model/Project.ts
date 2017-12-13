import * as fs from "fs";
import * as mobx from "mobx";
import * as Path from "path";
import { Session } from "./Session";
import { IFolderSelection, Folder } from "./Folder";
import { Person } from "./Person";
import { File } from "./File";

export class Project extends Folder {
  @mobx.observable public selectedSession: IFolderSelection;
  @mobx.observable public selectedPerson: IFolderSelection;
  @mobx.observable public sessions: Session[] = [];
  @mobx.observable public persons: Person[] = [];

  constructor(directory: string, files: File[]) {
    super(directory, files);
    this.selectedSession = new IFolderSelection();
    this.selectedPerson = new IFolderSelection();

    const manditoryTextProperies = [
      "iso639Code",
      "title",
      "fundingProjectTitle",
      "projectDescription",
      "vernacularISO3CodeAndName",
      "location",
      "region",
      "country",
      "continent",
      "contactPerson",
      "accessProtocol",
      "contentType",
      "applications",
      "dateAvailable",
      "rightsHolder",
      "depositor",
      "relatedPublications"
    ];

    manditoryTextProperies.forEach(key =>
      this.properties.manditoryTextProperty(key, "")
    );
  }

  public get metadataFileExtensionWithDot(): string {
    return ".sprj";
  }

  public static fromDirectory(directory: string): Project {
    const files = this.loadChildFiles(directory, ".sprj", "Project");
    const project = new Project(directory, files);

    fs
      .readdirSync(Path.join(directory, "Sessions"), "utf8")
      .forEach(childName => {
        const dir = Path.join(directory, "Sessions", childName);
        if (fs.lstatSync(dir).isDirectory()) {
          console.log(dir);
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
          console.log(dir);
          const person = Person.fromDirectory(dir);
          project.persons.push(person);
        }
        // else ignore it
      });

    project.selectedSession.index = 0;
    project.selectedPerson.index = 0;
    return project;
  }
}
