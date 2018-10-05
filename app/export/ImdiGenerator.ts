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
  public constructor(
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

  // see https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_Catalogue_3.0.0.pdf for details
  private corpus(): string {
    const project = this.folderInFocus as Project;
    this.startXmlRoot().a("Type", "CORPUS");

    this.startGroup("Corpus");
    this.field("Name", "id");
    // we don't have a separate title vs. name field
    this.element("Name", project.displayName);
    this.element("Title", project.displayName);

    this.field("Description", "projectDescription");

    for (const session of project.sessions) {
      this.element("CorpusLink", session.filePrefix + ".imdi");
      this.attribute("Name", "id", session);
    }

    return this.makeString();
  }
  private addProjectLocation() {
    this.startGroup("Location");
    this.field("Continent", "continent", this.project);
    this.field("Country", "country", this.project);
    //Region - We don't currently have this field.
    this.field("Address", "location", this.project);
    this.exitGroup();
  }

  private addProjectInfo() {
    this.startGroup("Project");
    //// we don't currently have a different name vs. title
    this.field("Name", "title", this.project); //A short name or abbreviation of the project.
    this.field("Title", "title", this.project); // The full title of the project.

    // <ID/>   We don't currently have an ID field for projects.
    this.startGroup("Contact");
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
    this.startGroup("Actors");
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
          this.startGroup("Actor");
          this.tail.comment(
            `Could not find a person with name "${trimmedName}"`
          );
          this.exitGroup(); //</Actor>
        }
      });
    this.exitGroup(); //</Actors>
  }
  private addContentElement() {
    this.group("Content", () => {
      this.field("Genre", "genre");
      this.element("TODO", "More fields of session");
      this.group("Languages", () => {
        this.element("TODO", "Emit Languages of the session");
      });
    });
  }
  private addLanguage(lang: string, isPrimaryTongue?: boolean) {
    if (lang && lang.length > 0) {
      this.startGroup("Language");

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
      this.element("Id", "ISO639-3:" + code);
      //this.fieldLiteral("Id", lang);
      this.element("Name", lang);
      this.attributeLiteral(
        "Link",
        "http://www.mpi.nl/IMDI/Schema/MPI-Languages.xml"
      );

      this.element("PrimaryLanguage", isPrimaryTongue ? "true" : "false");
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
    this.startGroup("Session");
    this.field("Name", "id");
    this.field("Date", "date");
    this.field("Title", "title");
    this.field("Description", "description");

    this.startGroup("MDGroup");
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
  // Used for session, person, media file (and many other places, in the schema, but those are the places that saymore currently lets you add custom things)
  private addCustomKeys() {
    //TODO: some of the "More fields" will go here
    //TODO: all of the "custom fields" will go here
    //TODO: some (all?) of "properties" will go here. E.g., media recording equipment.
    // QUESTION: the schema actually says <xsd:documentation>Project keys</xsd:documentation>. So these can't be session keys?
    // for now I'm going to assume that was a mistake in the schema.
  }
  private sessionLocation() {
    this.startGroup("Location");
    this.field(
      "Continent",
      "locationContinent",
      this.folderInFocus,
      /* project fallback */ "continent"
    );
    this.field(
      "Country",
      "locationCountry",
      this.folderInFocus,
      /* project fallback */ "country"
    );
    this.field("Region", "locationRegion");
    this.field("Address", "locationAddress");
    this.exitGroup();
  }

  private sessionResourcesGroup() {
    this.startGroup("Resources");
    this.folderInFocus.files.forEach((f: File) => {
      this.resourceFile(f);
    });
    this.exitGroup(); // Resources
  }

  // when testing/developing, it has proved helpful to generate small portions
  // of the overall imdi, e.g. to show the imdi that will be generated for a
  // single media file. Methods for various elements can use this method to
  // either just start a new xml group if they are being called as part of a
  // larger xml document creation, or start a whole new document, if they
  // are being called in isolation.
  private group(
    elementName: string,
    addGroupContents: () => void
  ): string | null {
    const isStandalone = !this.tail;
    if (isStandalone) {
      this.tail = XmlBuilder.create(elementName, { headless: true });
      addGroupContents();
      return this.makeString();
    } else {
      this.startGroup(elementName);
      addGroupContents();
      this.exitGroup();
      return null; // we're building a larger xml doc, no need for the string yet
    }
  }

  public resourceFile(f: File): string | null {
    const isMediaFile =
      [".mp3", ".mp4", ".jpg", ".png", ".tiff"].indexOf(
        Path.extname(f.describedFilePath).toLowerCase()
      ) > -1;
    if (isMediaFile) {
      return this.mediaFile(f);
    } else {
      return this.writtenResource(f);
    }
  }
  private getImdiMediaFileType(saymoreType: string) {
    // build in ones are audio, video, image, document, drawing,text
    // this is an "open vocabulary", so we can have others
    switch (saymoreType) {
      case "Audio":
        return "audio";
      case "Video":
        return "video";
      case "ELAN":
        return "elan"; // not in predefined list
      case "Image":
        return "image";
      case "Text":
        return "text";
      default:
        return "document";
    }
  }
  public mediaFile(f: File): string | null {
    return this.group("MediaFile", () => {
      this.element("ResourceLink", Path.basename(f.describedFilePath));

      this.element(
        "Type",
        this.getImdiMediaFileType(f.type),
        false,
        "http://www.mpi.nl/IMDI/Schema/MediaFile-Type.xml"
      );
      this.element(
        "Format",
        "TODO",
        false,
        "http://www.mpi.nl/IMDI/Schema/MediaFile-Format.xml"
      );
      this.field("Size", "size", f);
      this.addCustomKeys();
    });
  }
  public writtenResource(f: File): string | null {
    return this.group("WrittenResource", () => {
      this.element("ResourceLink", Path.basename(f.describedFilePath));

      // WrittenResource types
      // (each of these has subcategories)
      // Unknown, Unspecified, Primary Text, Annotation (sub category has things like gesture, phonetic, phonology, morphology, syntax, etc)
      // Lexical Analysis, Ethnography, Study
      this.element(
        "Type",
        // the only type we can deduce is that ELAN is for annotation
        f.type === "ELAN" ? "Annotation" : "Unspecified",
        false,
        "http://www.mpi.nl/IMDI/Schema/WrittenResource-Type.xml"
      );
      this.field("Size", "size", f);
    });
  }
  // See https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_MetaData_3.0.4.pdf for details
  public actor(person: Person): string | null {
    return this.group("Actor", () => {
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
      this.element("TODO", "More fields of person");
      this.startGroup("Languages");
      this.addLanguage(
        person.properties.getTextStringOrEmpty("primaryLanguage"),
        true
      );
      this.addLanguage(
        person.properties.getTextStringOrEmpty("otherLanguage0")
      );
      this.addLanguage(
        person.properties.getTextStringOrEmpty("otherLanguage1")
      );
      this.addLanguage(
        person.properties.getTextStringOrEmpty("otherLanguage2")
      );
      this.addLanguage(
        person.properties.getTextStringOrEmpty("otherLanguage3")
      );
      this.exitGroup(); // </Languages>
    });
  }

  //-----------------------------------------------------
  // Utility methods to add various things to the xml
  //-----------------------------------------------------

  private field(
    elementName: string,
    fieldName: string,
    target?: Folder | File,
    projectFallbackFieldName?: string
  ) {
    //if they specified a folder, use that, otherwise use the current default
    const f = target ? target : this.folderInFocus;
    let v = f.properties.getTextStringOrEmpty(fieldName);
    if (projectFallbackFieldName && (!v || v.length === 0)) {
      v = this.project.properties.getTextStringOrEmpty(
        projectFallbackFieldName
      );
    }

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
  private startGroup(elementName: string) {
    this.tail = this.tail.element(elementName);
  }
  private exitGroup() {
    this.tail = this.tail.up();
  }
  private element(
    elementName: string,
    value: string,
    isClosedVocabulary?,
    vocabularyUrl?
  ) {
    console.assert(value);
    const newElement = this.tail.element(elementName, value);
    if (isClosedVocabulary === true || isClosedVocabulary === false) {
      newElement.attribute("Link", vocabularyUrl);
      const type = isClosedVocabulary ? "ClosedVocabulary" : "OpenVocabulary";
      newElement.attribute("Type", type);
    }

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
    // project.persons.forEach((person: Person) => {
    //   const imdi = this.actor(person, project);
    //   archive.append(imdi, {
    //     name: `${person.filePrefix}.imdi`
    //   });
    // });

    archive.finalize();
  }
}
