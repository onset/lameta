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
import LanguageFinder from "../components/LanguagePickerDialog/LanguageFinder";

export default class ImdiGenerator {
  private tail: XmlBuilder.XMLElementOrXMLNode;

  // if we're getting the imdi of a session, this will be a session,
  // same for project, focus, etc. But child folders (e.g. sessions)
  // will include some data from the parent project (which is also a folder)
  private folderInFocus: Folder;

  private project: Project;
  private mostRecentElement: XmlBuilder.XMLElementOrXMLNode;

  //We enable this when we want to keep unit test xpaths simple
  private omitNamespaces: boolean;
  private languageFinder: LanguageFinder;

  // note, folder wil equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  private constructor(
    folder: Folder,
    project: Project,
    languageFinder?: LanguageFinder
  ) {
    this.folderInFocus = folder;
    this.project = project;
    this.languageFinder = languageFinder
      ? languageFinder
      : new LanguageFinder();
  }

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
    omitNamespaces?: boolean,
    languageFinder?: LanguageFinder
  ): string {
    const generator = new ImdiGenerator(person, project, languageFinder);
    if (omitNamespaces) {
      generator.omitNamespaces = omitNamespaces;
    }
    generator.tail = XmlBuilder.create("IMDIFragment", { headless: true });
    generator.actor(person);
    return generator.makeString();
  }

  // see https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_Catalogue_3.0.0.pdf for details
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
    //Region - We don't currently have this field.
    this.field("Address", "location", this.project);
    this.exitGroup();
  }

  private addProjectInfo() {
    this.group("Project");
    //// we don't currently have a different name vs. title
    this.field("Name", "title", this.project); //A short name or abbreviation of the project.
    this.field("Title", "title", this.project); // The full title of the project.

    // <ID/>   We don't currently have an ID field for projects.
    this.group("Contact");
    this.field("Name", "contactPerson", this.project);
    //<Address> We don't currently have this field.
    //<Email> We don't currently have this field.
    //<Organization> We don't currently have this field.
    this.exitGroup(); // Contact
    //"An elaborate description of the scope and goals of the project."
    this.field("Description", "projectDescription", this.project);
    this.exitGroup(); // Project
  }
  private addActorsOfSession() {
    this.group("Actors");
    const session = this.folderInFocus as Session;
    session.properties
      .getTextStringOrEmpty("participants")
      .split(";")
      .forEach(name => {
        const trimmedName = name.trim();
        const person = this.project.findPerson(trimmedName);
        if (person) {
          this.actor(person);
        } else {
          this.group("Actor");
          this.tail.comment(
            `Could not find a person with name "${trimmedName}"`
          );
          this.exitGroup(); //</Actor>
        }
      });
    this.exitGroup(); //</Actors>
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

      // Enhance: this matching algorithm is far from ideal.
      // It won't match on alternate names
      const matches = this.languageFinder.find(lang);
      const code =
        matches.length > 0 &&
        // matches one of the names of the first choice exactly except for case and diacritics
        matches[0].someNameMatches(lang)
          ? matches[0].iso639_3
          : "???";

      // Note. https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_MetaData_3.0.4.pdf allows
      // a variety of codes to be used. However ELAR in particular apparently can only
      // consume the ISO639-3 variety in 2018.
      this.fieldLiteral("Id", "ISO639-3:" + code);
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

  // See https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_MetaData_3.0.4.pdf for details
  private session() {
    this.startXmlRoot();
    this.group("Session");
    this.field("Name", "id");
    this.field("Date", "date");
    this.field("Title", "title");
    this.field("Description", "description");

    this.group("MDGroup");
    /**/ this.sessionLocation();
    /**/ this.addProjectInfo();
    /**/ this.addCustomKeys();
    /**/ this.addContentElement();
    /**/ this.addActorsOfSession();
    this.exitGroup(); // MDGroup

    this.sessionResourcesGroup();

    this.exitGroup(); //Session
    return this.makeString();
  }
  // custom fields (and any other fields that IMDI doesn't support) go in a <Keys> element
  private addCustomKeys() {
    //TODO
    // QUESTION: the schema actually says <xsd:documentation>Project keys</xsd:documentation>. So these can't be session keys?
    // for now I'm going to assume that was a mistake in the schema.
  }
  private sessionLocation() {
    this.group("Location");
    this.field("Continent", "locationContinent");
    this.field("Country", "locationCountry");
    this.field("Region", "locationRegion");
    this.field("Address", "locationAddress");
    this.exitGroup();
  }

  private sessionResourcesGroup() {
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
    this.exitGroup(); // Resources
  }

  // See https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_MetaData_3.0.4.pdf for details
  private actor(person: Person) {
    this.group("Actor");
    this.tail.comment(
      "***** IMDI export is not complete yet in this version of SayMore.  *****"
    );
    this.field("Name", "name", person);
    this.field("FullName", "name", person);
    this.field("Code", "code", person);
    this.field("EthnicGroup", "ethnicGroup", person);
    // Note: age is relative to this session's date.
    // Note: for children in particular, IMDI need more than year. It wants years;months.days,
    // but SayMore currently only has a "birth year".
    this.field("Age", "???TODO???", person);
    this.field("BirthDate", "birthYear", person);
    this.field("Sex", "gender", person);
    this.field("Education", "education", person);
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
    this.exitGroup(); // </Languages>

    this.exitGroup(); //</Actor>
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
