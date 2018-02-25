import { Session } from "../model/Project/Session/Session";
import * as XmlBuilder from "xmlbuilder";
import { Project } from "../model/Project/Project";
const titleCase = require("title-case");
import { Moment } from "moment";
import { Folder } from "../model/Folder";
import { Field } from "../model/field/Field";
const moment = require("moment");

export default class ImdiGenerator {
  private tail: XmlBuilder.XMLElementOrXMLNode;

  // if we're getting the imdi of a session, this will be a session,
  // same for project, focus, etc. But child folders (e.g. sessions)
  // will include some data from the parent project (which is also a folder)
  private folderInFocus: Folder;

  private project: Folder;

  //We enable this when we want to keep unit test xpaths simple
  private omitNamespaces: boolean;

  public static generateCorpus(project: Project): string {
    const generator = new ImdiGenerator(project, project);
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
    this.fieldLiteral("Title", project.displayName);
    this.field("Description", "projectDescription");

    for (const session of project.sessions) {
      this.field("CorpusLink", "id");
    }

    return this.makeString();
  }
  private addProjectLocation() {
    this.group("Location");
    this.field("Continent", "continent", this.project);
    this.field("Country", "country", this.project);
    this.exitGroup();
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

    this.group("Resources");
    return this.makeString();
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
      this.tail = this.tail.up();
    }
  }
  private group(elementName: string) {
    this.tail = this.tail.element(elementName);
  }
  private exitGroup() {
    this.tail = this.tail.up();
  }
  private fieldLiteral(elementName: string, value: string) {
    console.assert(value);
    this.tail = this.tail.element(elementName, value).up();
  }
  private startXmlRoot(): XmlBuilder.XMLElementOrXMLNode {
    this.tail = XmlBuilder.create("METATRANSCRIPT");
    if (!this.omitNamespaces) {
      this.tail.a("xmlns", "http://www.mpi.nl/IMDI/Schema/IMDI");
    }
    this.tail
      .a("Date", moment(new Date()).format("YYYY-MM-DD"))
      .a("Originator", "SayMore Mac");
    return this.tail;
  }
  private makeString(): string {
    return this.tail.end({ pretty: true });
  }
}
