import { Session } from "../model/Project/Session/Session";
import * as XmlBuilder from "xmlbuilder";
import { Project } from "../model/Project/Project";
const titleCase = require("title-case");
import { Moment } from "moment";
import { Folder } from "../model/Folder";
const moment = require("moment");

export default class ImdiGenerator {
  private tail: XmlBuilder.XMLElementOrXMLNode;
  private folder: Folder;

  //We enable this when we want to keep unit test xpaths simple
  private omitNamespaces: boolean;

  public static generateCorpus(project: Project): string {
    const generator = new ImdiGenerator(project);
    return generator.corpus();
  }
  public static generateSession(
    session: Session,
    omitNamespaces?: boolean
  ): string {
    const generator = new ImdiGenerator(session);
    if (omitNamespaces) {
      generator.omitNamespaces = omitNamespaces;
    }
    return generator.session();
  }

  private constructor(folder: Folder) {
    this.folder = folder;
  }
  private corpus(): string {
    const project = this.folder as Project;
    this.startXmlRoot().a("Type", "CORPUS");

    this.group("Corpus");
    this.fieldLiteral("Name", titleCase(project.displayName));
    this.fieldLiteral("Title", project.displayName);
    this.field("Description", "projectDescription");

    for (const session of project.sessions) {
      this.field("CorpusLink", "id");
    }

    return this.makeString();
  }

  private session() {
    const session = this.folder as Project;

    this.startXmlRoot();
    this.group("Session");
    //this.fieldLiteral("Nxame", session.displayName);
    this.field("xDate", "date");
    this.field("Title", "title");
    this.field("Description", "description");

    this.group("MDGroup");
    this.field("Location", "location");
    this.field("Continent", "");

    this.group("Resources");
    return this.makeString();
  }

  //-----------------------------------------------------
  // Utility methods to add various things to the xml
  //-----------------------------------------------------

  private field(elementName: string, fieldName: string) {
    const v = this.folder.properties.getTextStringOrEmpty(fieldName);
    if (v && v.length > 0) {
      this.tail = this.tail.element(elementName, v).up();
    }
  }
  private group(elementName: string) {
    this.tail = this.tail.element(elementName);
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
