import { Session } from "../model/Project/Session/Session";
import * as XmlBuilder from "xmlbuilder";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder";
const moment = require("moment");
import { File } from "../model/file/File";
import * as Path from "path";
import { Person } from "../model/Project/Person/Person";
import Archiver = require("archiver");
import * as fs from "fs";

export default class ImdiGenerator {
  private tail: XmlBuilder.XMLElementOrXMLNode;

  // if we're getting the imdi of a session, this will be a session,
  // same for project, focus, etc. But child folders (e.g. sessions)
  // will include some data from the parent project (which is also a folder)
  private folderInFocus: Folder;

  private project: Folder;
  private mostRecentElement: XmlBuilder.XMLElementOrXMLNode;

  //We enable this when we want to keep unit test xpaths simple
  private omitNamespaces: boolean;

  public static generateCorpus(
    project: Project,
    omitNamespaces?: boolean
  ): string {
    const generator = new ImdiGenerator(project, project);
    if (omitNamespaces) {
      generator.omitNamespaces = omitNamespaces;
    }
    return generator.corpus();
  }
  public static generateSession(
    session: Session,
    project: Project,
    omitNamespaces?: boolean
  ): string {
    const generator = new ImdiGenerator(session, project);
    if (omitNamespaces) {
      generator.omitNamespaces = omitNamespaces;
    }
    return generator.session();
  }

  public static generateActor(
    person: Person,
    project: Project,
    omitNamespaces?: boolean
  ): string {
    const generator = new ImdiGenerator(person, project);
    if (omitNamespaces) {
      generator.omitNamespaces = omitNamespaces;
    }
    return generator.actor();
  }

  // note, folder wil equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  private constructor(folder: Folder, project: Project) {
    this.folderInFocus = folder;
    this.project = project;
  }
  private corpus(): string {
    const project = this.folderInFocus as Project;
    this.startXmlRoot().a("Type", "CORPUS");

    this.group("Corpus");
    this.field("Name", "id");
    // we don't have a separate title vs. name field
    this.fieldLiteral("Name", project.displayName);
    this.fieldLiteral("Title", project.displayName);

    this.field("Description", "projectDescription");

    for (const session of project.sessions) {
      this.fieldLiteral("CorpusLink", session.filePrefix + ".imdi");
      this.attribute("Name", "id", session);
    }

    return this.makeString();
  }
  private addProjectLocation() {
    this.group("Location");
    this.field("Continent", "continent", this.project);
    this.field("Country", "country", this.project);
    this.exitGroup();
  }

  private addProjectInfo() {
    this.group("Project");
    this.field("Title", "title", this.project);
    this.field("Contact", "contactPerson", this.project);
    this.exitGroup();
  }
  private addActorsOfSession() {
    this.group("Actors");
    this.fieldLiteral("TODO", "Wire people to sessions and emit actors");
    this.exitGroup();
  }
  private addContentElement() {
    this.group("Content");
    this.field("Genre", "genre");
    this.fieldLiteral("TODO", "More fields of session");
    this.group("Languages");
    this.fieldLiteral("TODO", "Emit Languages of the session");
    this.exitGroup();
    this.exitGroup();
  }
  private addLanguage(lang: string, isPrimaryTongue?: boolean) {
    if (lang && lang.length > 0) {
      this.group("Language");

      const iso639 = "???"; //lookup(lang);
      this.fieldLiteral("Id", "ISO639-3:" + iso639);
      //this.fieldLiteral("Id", lang);
      this.fieldLiteral("Name", lang);
      this.attributeLiteral(
        "Link",
        "http://www.mpi.nl/IMDI/Schema/MPI-Languages.xml"
      );

      this.fieldLiteral("PrimaryLanguage", isPrimaryTongue ? "true" : "false");
      this.attributeLiteral("Type", "ClosedVocabulary");
      this.attributeLiteral(
        "Link",
        "http://www.mpi.nl/IMDI/Schema/Boolean.xml"
      );

      // review: this is a to-literal definition of "mother tongue" (which itself has multiple definitions),
      // so I'm leaving it out entirely for now.
      /*const motherTongue = (this
        .folderInFocus as Person).properties.getTextStringOrEmpty(
        "mothersLanguage"
      );
      this.fieldLiteral(
        "MotherTongue",
        lang === motherTongue ? "true" : "false"
      );
*/
      this.exitGroup();
    }
  }

  private session() {
    const session = this.folderInFocus as Project;

    this.startXmlRoot();
    this.group("Session");
    this.field("Name", "id");
    this.field("Date", "date");
    this.field("Title", "title");
    this.field("Description", "description");

    this.group("MDGroup");
    this.addProjectLocation();
    this.addProjectInfo();
    this.addContentElement();
    this.addActorsOfSession();
    this.exitGroup();

    this.group("Resources");
    this.folderInFocus.files.forEach((f: File) => {
      if (ImdiGenerator.isMediaFile(f.describedFilePath)) {
        this.group("MediaFile");
        this.fieldLiteral("ResourceLink", Path.basename(f.describedFilePath));
        this.fieldLiteral("TODO", "More fields of resource");
        this.exitGroup();
      }
    });

    this.group("WrittenResource");
    if (this.folderInFocus.metadataFile != null) {
      this.fieldLiteral(
        "ResourceLink",
        Path.basename(this.folderInFocus.metadataFile.metadataFilePath)
      );
    }
    this.fieldLiteral("TODO", "More fields of written resource");
    this.exitGroup();

    this.exitGroup();
    return this.makeString();
  }

  private actor() {
    const person = this.folderInFocus as Person;

    this.tail = XmlBuilder.create("Actor", { headless: true });
    this.tail.comment(
      "***** IMDI export is not implemented yet. This is just a bit of scaffolding *****"
    );
    this.field("Name", "name");
    this.fieldLiteral("TODO", "More fields of person");
    this.group("Languages");
    this.addLanguage(
      person.properties.getTextStringOrEmpty("primaryLanguage"),
      true
    );
    this.addLanguage(person.properties.getTextStringOrEmpty("otherLanguage0"));
    this.addLanguage(person.properties.getTextStringOrEmpty("otherLanguage1"));
    this.addLanguage(person.properties.getTextStringOrEmpty("otherLanguage2"));
    this.addLanguage(person.properties.getTextStringOrEmpty("otherLanguage3"));
    this.exitGroup();

    return this.makeString();
  }

  private static isMediaFile(path: string): boolean {
    return (
      [".mp3", ".mp4", ".jpg", ".tiff"].indexOf(
        Path.extname(path).toLowerCase()
      ) > -1
    );
  }

  //-----------------------------------------------------
  // Utility methods to add various things to the xml
  //-----------------------------------------------------

  private field(elementName: string, fieldName: string, folder?: Folder) {
    //if they specified a folder, use that, otherwise use the current default
    const f = folder ? folder : this.folderInFocus;
    const v = f.properties.getTextStringOrEmpty(fieldName);
    if (v && v.length > 0) {
      this.tail = this.tail.element(elementName, v);
      const definition = f.properties.getFieldDefinition(fieldName);
      if (definition.imdiRange) {
        this.tail.attribute("Link", definition.imdiRange);
        const type = definition.imdiIsClosedVocabulary
          ? "ClosedVocabulary"
          : "OpenVocabulary";
        this.tail.attribute("Type", type);
      }
      this.mostRecentElement = this.tail;
      this.tail = this.tail.up();
    }
  }

  private attribute(attributeName: string, fieldName: string, folder?: Folder) {
    //if they specified a folder, use that, otherwise use the current default
    const f = folder ? folder : this.folderInFocus;

    const v = f.properties.getTextStringOrEmpty(fieldName);
    if (v && v.length > 0) {
      this.tail = this.mostRecentElement.attribute(attributeName, v);
    }
  }
  private attributeLiteral(attributeName: string, value: string) {
    this.mostRecentElement.attribute(attributeName, value);
  }
  private group(elementName: string) {
    this.tail = this.tail.element(elementName);
  }
  private exitGroup() {
    this.tail = this.tail.up();
  }
  private fieldLiteral(elementName: string, value: string) {
    console.assert(value);
    const newElement = this.tail.element(elementName, value);
    this.mostRecentElement = newElement;
    this.tail = newElement.up();
  }
  private startXmlRoot(): XmlBuilder.XMLElementOrXMLNode {
    this.tail = XmlBuilder.create("METATRANSCRIPT");
    if (!this.omitNamespaces) {
      this.tail.a("xmlns", "http://www.mpi.nl/IMDI/Schema/IMDI");
      this.tail.a("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
      this.tail.a(
        "xsi:schemaLocation",
        "http://www.mpi.nl/IMDI/Schema/IMDI http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd"
      );
    }
    this.tail
      .a("Date", moment(new Date()).format("YYYY-MM-DD"))
      .a("Originator", "SayMore JS");
    this.tail.comment("***** IMDI export is not fully implemented yet.  *****");
    return this.tail;
  }
  private makeString(): string {
    return this.tail.end({ pretty: true });
  }

  public static saveImdiZip(project: Project, path: string) {
    // create a file to stream archive data to.
    const output = fs.createWriteStream(path);
    const archive = Archiver("zip");

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on("close", () => {
      // console.log("saveImdiZip " + archive.pointer() + " total bytes");
      // console.log(
      //   "saveImdiZip archiver has been finalized and the output file descriptor has closed."
      // );
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on("warning", err => {
      if (err.code === "ENOENT") {
        console.log("saveImdiZip Warning: " + err);
      } else {
        // throw error
        throw err;
      }
    });

    // good practice to catch this error explicitly
    archive.on("error", err => {
      console.log("saveImdiZip error: " + err);
      alert("saveImdiZip error: " + err);
    });

    // pipe archive data to the file
    archive.pipe(output);

    archive.append(ImdiGenerator.generateCorpus(project, false), {
      name: `${project.displayName}.imdi`
    });
    project.sessions.forEach((session: Session) => {
      const imdi = ImdiGenerator.generateSession(session, project);
      archive.append(imdi, {
        name: `${session.filePrefix}.imdi`
      });
    });
    project.persons.forEach((person: Person) => {
      const imdi = ImdiGenerator.generateActor(person, project);
      archive.append(imdi, {
        name: `${person.filePrefix}.imdi`
      });
    });

    archive.finalize();
  }
}
