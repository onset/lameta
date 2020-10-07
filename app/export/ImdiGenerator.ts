import assert from "assert";
import { Session } from "../model/Project/Session/Session";
import * as XmlBuilder from "xmlbuilder";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
const moment = require("moment");
import { File } from "../model/file/File";
import * as Path from "path";
import { Person, maxOtherLanguages } from "../model/Project/Person/Person";
import { Set } from "typescript-collections";
import * as mime from "mime";
import {
  getImdiResourceTypeForPath,
  GetFileFormatInfoForPath,
  getMimeType,
} from "../model/file/FileTypeInfo";
import { titleCase } from "title-case";
import { sentenceCase } from "sentence-case";
import { capitalCase } from "capital-case";
import { sanitizeForArchive } from "../filenameSanitizer";
import { values } from "mobx";
import { IPersonLanguage } from "../model/PersonLanguage";
const pkg = require("../package.json");

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

  private keysThatHaveBeenOutput = new Set<string>();

  // note, folder wil equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  public constructor(folder?: Folder, project?: Project) {
    // folder and project can be omitted in some tests that are ust calling a function that doesn't need them
    if (folder) this.folderInFocus = folder;
    if (project) this.project = project;
  }

  public static generateCorpus(
    project: Project,
    childrenSubPaths: string[],
    omitNamespaces?: boolean
  ): string {
    const generator = new ImdiGenerator(project, project);
    if (omitNamespaces) {
      generator.omitNamespaces = omitNamespaces;
    }
    return generator.corpus(childrenSubPaths);
  }
  public static generateProject(project: Project): string {
    const generator = new ImdiGenerator(project, project);
    return generator.projectXmlForPreview();
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
  private corpus(childrenSubpaths: string[]): string {
    const project = this.folderInFocus as Project;
    this.startXmlRoot("CORPUS");

    this.startGroup("Corpus");
    // we don't have a separate title vs. name field
    this.element("Name", project.displayName);

    // this mapping, funding--> title, is per Vera at ELAR 23/8/2019
    this.element(
      "Title",
      project.properties.getTextStringOrEmpty("fundingProjectTitle")
    );

    this.requiredField("Description", "projectDescription");
    for (const subpath of childrenSubpaths) {
      this.element("CorpusLink", subpath);
      this.attributeLiteral("Name", Path.basename(subpath, ".imdi"));
    }
    return this.makeString();
  }
  private projectXmlForPreview(): string {
    this.tail = XmlBuilder.create("Project");
    this.addProjectInfo();
    return this.makeString();
  }

  private addProjectInfo() {
    this.startGroup("Project");

    this.requiredField("Name", "title", this.project);
    this.requiredField("Title", "fundingProjectTitle", this.project);
    this.requiredField("Id", "grantId", this.project);
    this.group("Contact", () => {
      this.optionalField("Name", "contactPerson", this.project);
      //<Address> We don't currently have this field.
      //<Email> We don't currently have this field.
      //<Organization> We don't currently have this field.
      this.exitGroup(); // Contact
      //"An elaborate description of the scope and goals of the project."
      this.optionalField("Description", "projectDescription", this.project);
    });
  }
  private addActorsOfSession() {
    this.startGroup("Actors");
    const session = this.folderInFocus as Session;
    session.getAllContributionsToAllFiles().forEach((contribution) => {
      const trimmedName = contribution.personReference.trim();
      if (trimmedName.length === 0) {
        return;
      }
      const person = this.project.findPerson(trimmedName);
      if (person) {
        const referenceDate = session.properties.getDateField("date").asDate();
        this.actor(
          person,
          contribution.role,
          referenceDate,
          // send in any contribution comments to be listed under the <Keys> element
          [{ name: "contribution-comments", text: contribution.comments }]
        );
      } else {
        this.startGroup("Actor");
        this.tail.comment(`Could not find a person with name "${trimmedName}"`);
        this.element("Role", contribution.role);
        this.element("Name", trimmedName);
        this.element("FullName", trimmedName);
        this.element("Code", "");
        this.element("FamilySocialRole", "");
        this.element("Languages", "");
        this.element("EthnicGroup", "");
        this.element("Age", "");
        this.element("BirthDate", "Unspecified");
        this.element("Sex", "");
        this.element("Education", "");
        this.element("Anonymized", "false");
        this.element("Contact", "");
        this.element("Keys", "");
        this.element("Description", "");
        this.exitGroup(); //</Actor>
      }
    });
    this.exitGroup(); //</Actors>
  }
  private addSessionContentElement() {
    const session = this.folderInFocus as Session;
    this.group("Content", () => {
      this.requiredField("Genre", "genre");
      this.requiredField("SubGenre", "subgenre");
      this.element(
        "Task",
        "",
        false,
        "http://www.mpi.nl/IMDI/Schema/Content-Task.xml"
      ); // required but we don't have something to map to it
      this.element(
        "Modalities",
        "",
        false,
        "http://www.mpi.nl/IMDI/Schema/Content-Modalities.xml"
      ); // required but we don't have something to map to it
      this.element(
        "Subject",
        "",
        false,
        "http://www.mpi.nl/IMDI/Schema/Content-Subject.xml",
        //https://trello.com/c/u1PWlTQS/125-urgent-errors-in-imdi-output-content-subject
        VocabularyType.OpenVocabularyList
      ); // required but we don't have something to map to it

      this.group("CommunicationContext", () => {
        // Many of these are required even if lameta doesn't have this field.
        // See https://trello.com/c/YHKvcMDM/88-fill-in-empty-imdi-categories-under-content
        this.element(
          "Interactivity",
          "unspecified",
          true,
          "http://www.mpi.nl/IMDI/Schema/Content-Interactivity.xml"
        ); // required but we don't have something to map to it
        this.requiredField("PlanningType", "planningType");
        this.requiredField("Involvement", "involvement");
        this.requiredField("SocialContext", "socialContext");
        this.element(
          "EventStructure",
          "unspecified",
          true,
          "http://www.mpi.nl/IMDI/Schema/Content-EventStructure.xml"
        ); // required but we don't have something to map to it
        this.element(
          "Channel",
          "unspecified",
          true,
          "http://www.mpi.nl/IMDI/Schema/Content-Channel.xml"
        ); // required but we don't have something to map to it
      });

      /* If the recording is people speaking in English about Chinese, then
        +----------+---------+-----------+-----------+
        | language | lameta  | elar/imdi | PARADISEC |
        +----------+---------+-----------+-----------+
        | English  | working | working   | content   |
        | Chinese  | subject | content   | subject   |
        +----------+---------+-----------+-----------+
        */

      this.group("Languages", () => {
        const languages = session.getSubjectLanguageCodes();
        if (languages.length > 0) {
          languages.forEach((code) => {
            const langName = this.project.languageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
              code
            );
            this.addSessionLanguage(code, langName, "Content Language");
          });
        } else {
          this.addMissingSessionLanguage(
            "vernacularIso3CodeAndName",
            "Content Language"
          );
        }
        this.keysThatHaveBeenOutput.add("Session.languages");
        const workingLanguages = session.getWorkingLanguageCodes();
        if (workingLanguages.length > 0) {
          workingLanguages.forEach((code) => {
            const langName = this.project.languageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
              code
            );
            this.addSessionLanguage(code, langName, "Working Language");
          });
        } else {
          this.addMissingSessionLanguage(
            "analysisISO3CodeAndName",
            "Working Language"
          );
        }
        this.keysThatHaveBeenOutput.add("Session.workingLanguages");

        // this.addSessionLanguage(
        //   this.project.getWorkingLanguageCode(),
        //   this.project.getWorkingLanguageName(),
        //   "Working Language"
        // );
        // this.addMissingSessionLanguage(
        //   "analysisISO3CodeAndName",
        //   "Working Language"
        // );
      });
      this.addCustomKeys(this.folderInFocus);
    });
  }
  private addMissingSessionLanguage(key: string, description: string) {
    // Note, SayMore Sessions don't currently have their own language...
    // so we have to get these languages from the project
    const parts = this.project.properties
      .getTextStringOrEmpty(key)
      .split(":")
      .map((s) => s.trim());
    if (parts.length === 2) {
      this.addSessionLanguage(parts[0], parts[1], description);
    }
  }
  private addSessionLanguage(code: string, name: string, description: string) {
    this.group("Language", () => {
      this.element("Id", "ISO639-3:" + code);
      this.element(
        "Name",
        name,
        false,
        "http://www.mpi.nl/IMDI/Schema/MPI-Languages.xml"
      );
      this.element("Description", description);
    });
  }
  private addActorLanguage(lang: IPersonLanguage) {
    this.startGroup("Language");

    //In SayMore and lameta < 0.8.7, this was stored as a name, rather than
    // // Enhance: this matching algorithm is far from ideal.
    // // It won't match on alternate names
    // const code = this.project.languageFinder.findOne639_3CodeFromName(
    //   lang,
    //   "und"
    // );

    // Note. https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_MetaData_3.0.4.pdf allows
    // a variety of codes to be used. However ELAR in particular apparently can only
    // consume the ISO639-3 variety in 2018.
    // if (lang.length !== 3) {
    //   // und is not *exactly* right. We don't know if it was mislabelled or what.
    //   // mis (uncoded languages, originally an abbreviation for 'miscellaneous') is intended for languages which have not (yet) been included in the ISO standard.
    //   // und (undetermined) is intended for cases where the language in the data has not been identified, such as when it is mislabeled or never had been labeled. It is not intended for cases such as Trojan where an unattested language has been given a name.
    //   this.element("Id", "ISO639-3:und");
    // } else {
    //   this.element("Id", "ISO639-3:" + lang);
    // }
    this.element("Id", "ISO639-3:" + lang.tag);

    //this.fieldLiteral("Id", lang);
    this.element(
      "Name",
      this.project.languageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
        lang.tag
      )
    );
    this.attributeLiteral(
      "Link",
      "http://www.mpi.nl/IMDI/Schema/MPI-Languages.xml"
    );

    this.element("PrimaryLanguage", lang.primary ? "true" : "false");
    this.attributeLiteral("Type", "ClosedVocabulary");
    this.attributeLiteral("Link", "http://www.mpi.nl/IMDI/Schema/Boolean.xml");

    if (lang.father || lang.mother) {
      this.element(
        "Description",
        `${[
          lang.father ? "Also spoken by father." : undefined,
          lang.mother ? "Also spoken by mother." : undefined,
        ]
          .join(" ")
          .trim()}`
      );
    }
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

  // See https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_MetaData_3.0.4.pdf for details
  private session() {
    this.startXmlRoot("SESSION");
    this.attributeLiteral("ArchiveHandle", ""); // somehow this helps ELAR's process, to have this here, empty.

    this.startGroup("Session");
    this.requiredField("Name", "id");
    this.requiredField("Title", "title");
    this.field("Date", "date", true, "Unspecified");
    this.requiredField("Description", "description"); //https://trello.com/c/6VXkbU3a/110-imdi-empty-cells-need-to-become-xml-tags-eg-session-description
    this.keysThatHaveBeenOutput.add("Session.description");

    this.startGroup("MDGroup");
    /**/ this.sessionLocation();
    /**/ this.addProjectInfo();
    this.element("Keys", ""); // required for validation. there is also a Keys under Content, which is where stuff is going at the moment.
    /**/ this.addSessionContentElement();
    /**/ this.addActorsOfSession();
    this.exitGroup(); // MDGroup

    //throw new Error("Test throw from imdi " + Date.now().toLocaleString());

    this.resourcesGroup(this.folderInFocus);

    this.exitGroup(); //Session
    return this.makeString();
  }

  // custom fields (and any other fields that IMDI doesn't support) go in a <Keys> element
  // Used for session, person, media file (and many other places, in the schema, but those are the places that saymore currently lets you add custom things)
  private addCustomKeys(target: File | Folder, moreKeys?: any[]) {
    const blacklist = [
      "modifiedDate",
      "displayName",
      "type",
      "filename",
      "size",
      "contributions",
      "access",
      "accessDescription", // output by addAccess()
    ];
    this.group("Keys", () => {
      target.properties.keys().forEach((key) => {
        // only output things that don't have an explicit home in IMDI.
        // TODO: this is a good step, but it does output a large number of things that
        // we might not want to output. E.g. for  session: filename, size, modifiedDate, type("Session"), contributions
        // That means either we list a black list here, or on the field definition. And once we get into storing things
        // in the definition, maybe we might as well just have the definition tell us if it should go in Keys? E.g.
        // all custom fields would say yes, plus those in the fields.json5 set that we don't have a home for. The 3rd set
        // is things that the code adds, like type, size, modified date, etc. For now, using a blacklist here.

        if (
          !this.keysThatHaveBeenOutput.contains(target.type + "." + key) &&
          blacklist.indexOf(key) < 0
        ) {
          // don't export if we know it has been migrated
          const definition = target.properties.getFieldDefinition(key);
          if (
            definition &&
            definition.deprecated &&
            definition.deprecated.indexOf("migrated") > -1
          ) {
            return;
          }
          const fieldContents = target.properties.getTextStringOrEmpty(key);
          if (fieldContents && fieldContents.length > 0) {
            //https://trello.com/c/Xkq8cdoR/73-already-done-allow-for-more-than-one-topic
            const shouldSplitByCommas = ["topic", "keyword"].indexOf(key) > -1;
            const valueElements = shouldSplitByCommas
              ? fieldContents.split(",").map((x) => x.trim())
              : [fieldContents.trim()];
            valueElements.forEach((v) => {
              //https://trello.com/c/GdRJamgi/83-export-of-topic-field
              if (["topic", "status", "keyword"].indexOf(key) > -1) {
                v = sentenceCase(
                  v,
                  /* don't strip anything */ { stripRegexp: /^[]/ }
                );
              }

              this.tail = this.tail.element("Key", v);
              this.mostRecentElement = this.tail;
              this.attributeLiteral("Name", capitalCase(key)); //https://trello.com/c/GXxtRimV/68-topic-and-keyword-in-the-imdi-output-should-start-with-upper-case
              this.tail = this.tail.up();
            });
          }
        }
      });
      if (moreKeys) {
        moreKeys.forEach((m) => {
          this.tail = this.tail.element("Key", m.text);
          this.mostRecentElement = this.tail;
          this.attributeLiteral("Name", m.name);
          this.tail = this.tail.up();
        });
      }
    });
  }
  private sessionLocation() {
    this.startGroup("Location");
    this.requiredField(
      "Continent",
      "locationContinent",
      this.folderInFocus,
      /* project fallback */ "continent"
    );
    this.requiredField(
      "Country",
      "locationCountry",
      this.folderInFocus,
      /* project fallback */ "country"
    );
    this.requiredField(
      "Region",
      "locationRegion",
      this.folderInFocus,
      "region"
    ); // default to the region of the project
    this.optionalField("Address", "location", this.folderInFocus, "region"); // default to the region of the project

    // we removed this field in Dec 2019, so send it to custom
    // instead of making a second <Address>, which is not allowed
    //  this.optionalField("Address", "locationAddress"); // note, saymore also has a "location"
    this.exitGroup();
  }

  private resourcesGroup(folder: Folder) {
    this.startGroup("Resources");

    // schema requires that we group all the media files first, not intersperse them with written resources
    folder.files.forEach((f: File) => {
      if (
        ImdiGenerator.shouldIncludeFile(f.describedFilePath) &&
        this.isMediaFile(f)
      ) {
        this.mediaFile(f);
      }
    });
    folder.files.forEach((f: File) => {
      if (
        ImdiGenerator.shouldIncludeFile(f.describedFilePath) &&
        !this.isMediaFile(f)
      ) {
        this.writtenResource(f);
      }
    });

    this.exitGroup(); // Resources
  }

  // used by the ui imdi tabs, not actual imdi generator
  public resourceFile(f: File) {
    if (this.isMediaFile(f)) {
      return this.mediaFile(f);
    } else {
      return this.writtenResource(f);
    }
  }
  public static shouldIncludeFile(path: string): boolean {
    // skip these, on advice of ELAR
    return [".sprj", ".session", ".person"].indexOf(Path.extname(path)) === -1;
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

  private isMediaFile(f: File): boolean {
    const g = GetFileFormatInfoForPath(f.describedFilePath);
    return !!g?.isMediaType;
  }

  private sanitizedPathRelativeToProjectRoot(path: string): string {
    // If the project has the right setting, then this path is probably already sanitized (though there may be corner
    // cases where it isn't, e.g. the setting was set after files were added.) But in the ImdiBundler, we sanitize
    // files as they get copied to the export, regardless of that setting. This is because this is a *requirement* of
    // IMDI archives. Anyhow, since the bundler would have (or will have) export the sanitized version, we need to do
    // that to the file name we use for it in the xml.
    const basename = sanitizeForArchive(Path.basename(path), true);
    // Intentionally not using the OS's path separator here, because it's going to XML
    // that could then be read on any OS. (That could be wrong, and we
    // can fix it, but it's intentional to not use Path.join())
    const p = [Path.basename(Path.dirname(path)), basename].join("/");

    return p;
  }
  public mediaFile(f: File): string | null {
    return this.group("MediaFile", () => {
      this.element(
        "ResourceLink",
        this.sanitizedPathRelativeToProjectRoot(f.describedFilePath)
      );
      this.attributeLiteral("ArchiveHandle", ""); // somehow this helps ELAR's process, to have this here, empty.

      this.element(
        "Type",
        f.type.toLowerCase(),
        false,
        "http://www.mpi.nl/IMDI/Schema/MediaFile-Type.xml"
      );

      this.formatElement(
        f.describedFilePath,
        "https://www.mpi.nl/IMDI/Schema/MediaFile-Format.xml"
      );
      this.requiredField("Size", "size", f);
      this.element("Quality", "Unspecified");
      this.element("RecordingConditions", "");
      this.group("TimePosition", () => {
        this.element("Start", "Unspecified");
        this.element("End", "Unspecified");
      });

      this.addAccess(f);
      this.addCustomKeys(f);
    });
  }
  private formatElement(path: string, link: string): void {
    //  One document says this is Open vocabulary { AIFF, WAV, MPEG, JPEG, … }. (https://www.mpi.nl/ISLE/documents/draft/ISLE_MetaData_2.5.pdf)
    // Another says this is a mime type (https://www.mpi.nl/IMDI/Schema/MediaFile-Format.xml)
    // What we're doing here is emitting a mime type if we can determine it, otherwise the extension.
    // Review: should we instead be emitting, e.g. application/elan+xml for .eaf?
    this.element(
      "Format",
      getMimeType(Path.extname(path)) || Path.extname(path),
      false,
      link
    );
  }
  public writtenResource(f: File): string | null {
    return this.group("WrittenResource", () => {
      this.element(
        "ResourceLink",
        this.sanitizedPathRelativeToProjectRoot(f.describedFilePath)
      );
      this.attributeLiteral("ArchiveHandle", ""); // somehow this helps ELAR's process, to have this here, empty.

      // whereas this one just had this file name. NOte, you might expect that
      // "MediaResourceLink" doesn't belong under <WrittenResource/> but ELAR says it fails validation
      // without it.
      //this.element("ResourceLink", Path.basename(f.describedFilePath));

      // WrittenResource types
      // (each of these has subcategories)
      // Unknown, Unspecified, Primary Text, Annotation (sub category has things like gesture, phonetic, phonology, morphology, syntax, etc)
      // Lexical Analysis, Ethnography, Study

      this.group("MediaResourceLink", () => {});

      this.element("Date", "");
      const imdiResourceType = getImdiResourceTypeForPath(f.describedFilePath);

      this.element(
        "Type",
        imdiResourceType,
        false,
        "http://www.mpi.nl/IMDI/Schema/WrittenResource-Type.xml"
      );
      this.element("SubType", "");
      // "format" here is really mime type. See https://www.mpi.nl/IMDI/Schema/WrittenResource-Format.xml
      this.formatElement(
        f.describedFilePath,
        "https://www.mpi.nl/IMDI/Schema/WrittenResource-Format.xml"
      );
      this.requiredField("Size", "size", f);
      this.group("Validation", () => {
        this.element("Type", "");
        this.element("Methodology", "");
        this.element("Level", "Unspecified");
      });
      this.element("Derivation", "");
      this.element("CharacterEncoding", "");
      this.element("ContentEncoding", "");
      this.element("LanguageId", "");
      this.element("Anonymized", "Unspecified");

      // this bit is confusing... want this to work with Project Document Folders
      if (this.folderInFocus instanceof Session) {
        this.addAccess(f);
      }
      this.addCustomKeys(f);
    });
  }
  private addAccess(f: File) {
    const accessCode = this.folderInFocus.properties.getTextStringOrEmpty(
      "access"
    );

    this.group("Access", () => {
      if (accessCode.length > 0) {
        this.requiredField("Availability", "access");
      } else {
        this.element("Availability", "");
      }

      //this.attributeLiteral("ISO639-3", "eng");

      this.element("Date", "");
      this.element("Owner", "");
      this.element("Publisher", "");
      this.element("Contact", "");
      const accessDef = this.project.authorityLists.accessChoices.find(
        (c) => c.label === accessCode
      );

      // NB CAREFUL! It's easy to confuse accessDef.description (e.g. what does "U" mean?) with
      // accessDescription, which is "why am I limiting the access for this session?". The later
      // is actually "Access Explanation" in the UI. ELAR is (as far as I can tell) not interested
      // in the accessDef.description.

      /* if (
        accessDef &&
        accessDef.description &&
        accessDef.description.length > 0
      ) {
        const accessProtocol = this.project.properties.getTextStringOrEmpty(
          "accessProtocol"
        );
        //  ELAR DOESN'T WANT THIS IN IMDI
        // https://trello.com/c/JAEdatXh/71-access-description-should-only-include-access-explanation#comment-5e3443f825df1f4ba2c87eab
        // if (accessProtocol && accessProtocol && accessProtocol.length > 0) {
        //   this.element("Description", "Access Protocol:" + accessProtocol);
        //   //this.attributeLiteral("ISO639-3", "eng");
        // }
        // this.element("Description", accessDef.description);

        this.optionalField("Description", "accessDescription");
        //this.attributeLiteral("ISO639-3", "eng");
      } else {
        //      https://trello.com/c/GcNAmcOb/107-imdi-category-for-accessdescription-missing-from-imdi-export
        this.element("Description", "");
      }
    */
      this.requiredField("Description", "accessDescription");
    });

    //}
  }

  // See https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_MetaData_3.0.4.pdf for details
  public actor(
    person: Person,
    role: string,
    referenceDate?: Date | undefined,
    moreKeys?: any[]
  ): string | null {
    return this.group("Actor", () => {
      this.element("Role", role && role.length > 0 ? role : "Unspecified");
      this.requiredField("Name", "name", person);
      this.requiredField("FullName", "name", person);

      this.requiredField("Code", "code", person);
      this.element("FamilySocialRole", "");

      this.startGroup("Languages");
      // this.addActorLanguage(
      //   person,
      //   "primaryLanguage",
      //   person.properties.getTextStringOrEmpty("primaryLanguageLearnedIn"),
      //   true
      // );
      // this.keysThatHaveBeenOutput.add("Person." + "primaryLanguageLearnedIn");

      // for (let i = 0; i < maxOtherLanguages; i++) {
      //   this.addActorLanguage(person, "otherLanguage" + i);
      // }
      person.languages.forEach((l) => this.addActorLanguage(l));
      this.exitGroup(); // </Languages>
      this.requiredField("EthnicGroup", "ethnicGroup", person);
      // Note: age is relative to this session's date.
      // Note: for children in particular, IMDI need more than year. It wants years;months.days,
      // but SayMore currently only has a "birth year".
      /* Note, IMDI actually has this as an age range:

      <!--  Age Range    -->
      <xsd:complexType name="AgeRange_Type">
        <xsd:annotation>
          <xsd:documentation>Specifies age of a person in the form of a range</xsd:documentation>
        </xsd:annotation>
        <xsd:simpleContent>
          <xsd:extension base="imdi:AgeRange_Value_Type">
            <xsd:attributeGroup ref="imdi:ProfileAttributes"/>
          </xsd:extension>
        </xsd:simpleContent>
      </xsd:complexType>

      Then other docs say: The age of the actor. Please enter the age in the following format: YY or YY;MM or YY;MM.DD.
      If the exact age is not known, it is nevertheless useful to enter an approximate age. This will allow you later to 
      conduct searches on all actors who are in the age range between, e.g., 20 and 30 years of age.
      */
      const dateToCompareWith = referenceDate ? referenceDate : moment.today;
      if (!referenceDate) {
        this.tail.comment("The following is based on today's date.");
      }

      const birthYear = person.properties.getTextStringOrEmpty("birthYear");
      if (birthYear === "?") {
        this.element("Age", "unknown"); // ELAR request Oct-Dec 2019
      } else if (birthYear.trim() === "") {
        this.element("Age", "Unspecified"); // ELAR request https://trello.com/c/tnnCn8yQ/111-imdi-person-metadata-incomplete
        this.tail.comment("Could not compute age");
      } else {
        const age = person.ageOn(dateToCompareWith);
        if (age && age.length > 0) {
          this.element("Age", age);
        }
      }
      this.requiredFieldWithUnspecified("BirthDate", "birthYear", person);

      this.addGender(person);
      this.requiredField("Education", "education", person);

      this.element("Anonymized", "false"); // review: is this related to SayMore's "code" field?
      // Nov 2019 ELAR decided this is Personally identifiable information that they don't want in their archive
      // so we just pretend we output it so it won't come out in the keys
      this.keysThatHaveBeenOutput.add("Person.howToContact");

      if (
        this.folderInFocus.properties.getTextStringOrEmpty("howToContact")
          .length > 0
      ) {
        this.tail.comment(
          "Omitting howToContact, which is personally identifiable information."
        );
      }

      this.addCustomKeys(person, moreKeys);
      this.requiredField("Description", "description", person);
    });
  }
  private addGender(person: Person) {
    this.keysThatHaveBeenOutput.add("Person.gender");
    const gender = person.properties.getTextStringOrEmpty("gender");
    if (gender === "Other") {
      this.tail.comment(
        "Gender was actually 'Other'. The IMDI Schema does not have an 'other' option, so we are using 'Unspecified'."
      );
    }
    this.element(
      "Sex",
      gender === "Other" ? "Unspecified" : gender,
      true,
      "http://www.mpi.nl/IMDI/Schema/Actor-Sex.xml"
    );
  }

  //-----------------------------------------------------
  // Utility methods to add various things to the xml
  //-----------------------------------------------------

  private requiredFieldWithUnspecified(
    elementName: string,
    fieldName: string,
    target?: Folder | File,
    projectFallbackFieldName?: string
  ) {
    this.field(
      elementName,
      fieldName,
      true,
      "Unspecified",
      target,
      projectFallbackFieldName
    );
  }

  private requiredField(
    elementName: string,
    fieldName: string,
    target?: Folder | File,
    projectFallbackFieldName?: string
  ) {
    this.field(
      elementName,
      fieldName,
      true,
      "",
      target,
      projectFallbackFieldName
    );
  }

  private optionalField(
    elementName: string,
    fieldName: string,
    target?: Folder | File,
    projectFallbackFieldName?: string
  ) {
    this.field(
      elementName,
      fieldName,
      false,
      "",
      target,
      projectFallbackFieldName
    );
  }
  private field(
    elementName: string,
    fieldName: string,
    xmlElementIsRequired: boolean,
    defaultValue: string,
    target?: Folder | File,
    projectFallbackFieldName?: string
  ) {
    //if they specified a folder, use that, otherwise use the current default
    const f = target ? target : this.folderInFocus;
    let v = f.properties.getTextStringOrEmpty(fieldName);
    if (["genre", "subgenre", "socialContext"].indexOf(fieldName) > -1) {
      // For genre in IMDI export, ELAR doesn't want "formulaic_discourse",
      // they want "Formulaic Discourse"
      //https://trello.com/c/3H1oJsWk/66-imdi-save-genre-as-the-full-ui-form-not-the-underlying-token
      // Theoretically we could fish out the original English label, but this is quite safe and easy
      // and gives the same result since the keys are directly mappable to the English label via TitleCase.
      v = titleCase(v);
    }
    if (projectFallbackFieldName && (!v || v.length === 0)) {
      v = this.project.properties.getTextStringOrEmpty(
        projectFallbackFieldName
      );
    } else {
      assert.ok(f.type, "IMDI field f.type was null");
      //if (target) {  <-- I don't know what precipitated this; target is null when we are outputing folder fields, .e.g. session.description
      this.keysThatHaveBeenOutput.add(f.type + "." + fieldName);
      //}
    }

    //ELAR wants these capitalized
    v = v === "unspecified" ? "Unspecified" : v;

    const text = v && v.length > 0 ? v : defaultValue;
    if (xmlElementIsRequired || (v && v.length > 0)) {
      this.tail = this.tail.element(elementName, text);
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
      this.mostRecentElement.attribute(attributeName, v);
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
    vocabularyUrl?,
    vocabularyType?: VocabularyType
  ) {
    const newElement = this.tail.element(
      elementName,
      //https://trello.com/c/jRC5wpKp/67-imdi-unspecified-should-always-be-unspecified-with-upper-case-not-unspecified-with-lower-case
      value === "unspecified" ? "Unspecified" : value
    );
    if (isClosedVocabulary === true || isClosedVocabulary === false) {
      newElement.attribute("Link", vocabularyUrl);
      const type = isClosedVocabulary
        ? "ClosedVocabulary"
        : vocabularyType
        ? vocabularyType.toString()
        : "OpenVocabulary";
      newElement.attribute("Type", type);
    }

    this.mostRecentElement = newElement;
    this.tail = newElement.up();
  }
  private startXmlRoot(typeAttribute: string): XmlBuilder.XMLElementOrXMLNode {
    this.tail = XmlBuilder.create("METATRANSCRIPT");
    if (!this.omitNamespaces) {
      this.tail.a("xmlns", "http://www.mpi.nl/IMDI/Schema/IMDI");
      this.tail.a("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
      this.tail.a(
        "xsi:schemaLocation",
        "http://www.mpi.nl/IMDI/Schema/IMDI http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd"
      );
      this.tail.a("Type", typeAttribute);
      this.tail.a("Version", "0");
    }
    this.tail
      //.a("ArchiveHandle", "") // somehow this helps ELAR's process, to have this here, empty.)
      .a("Date", this.nowDate())
      .a("Originator", "lameta " + require("../package.json").version)
      .a("FormatId", "IMDI 3.0");
    this.mostRecentElement = this.tail;
    return this.tail;
  }
  private makeString(): string {
    return this.tail.end({ pretty: true });
  }
  private nowDate(): string {
    return moment(new Date()).format("YYYY-MM-DD");
  }

  // IMDI doesn't have a place for project-level documents, so we have to create IMDI
  // Sessions even though they are not related to actual sessions
  public makePseudoSessionImdiForOtherFolder(name: string, folder: Folder) {
    this.startXmlRoot("SESSION");
    this.attributeLiteral("ArchiveHandle", ""); // somehow this helps ELAR's process, to have this here, empty.

    this.startGroup("Session");
    this.element("Name", name);
    this.element("Title", name);
    this.element("Date", this.nowDate());
    this.tail.element("MDGroup").raw(
      `<Location>
      <Continent Type="ClosedVocabulary" Link="http://www.mpi.nl/IMDI/Schema/Continents.xml" />
      <Country Type="OpenVocabulary" Link="http://www.mpi.nl/IMDI/Schema/Countries.xml" />
    </Location>
    <Project>
      <Name />
      <Title />
      <Id />
      <Contact />
    </Project>
    <Keys />
    <Content>
      <Genre Type="OpenVocabulary" Link="http://www.mpi.nl/IMDI/Schema/Content-Genre.xml" />
      <SubGenre Type="OpenVocabulary" Link="http://www.mpi.nl/IMDI/Schema/Content-SubGenre.xml" />
      <Task Type="OpenVocabulary" Link="http://www.mpi.nl/IMDI/Schema/Content-Task.xml" />
      <Modalities Type="OpenVocabulary" Link="http://www.mpi.nl/IMDI/Schema/Content-Modalities.xml" />
      <Subject Type="OpenVocabularyList" Link="http://www.mpi.nl/IMDI/Schema/Content-Subject.xml" />
      <CommunicationContext>
        <Interactivity Link="http://www.mpi.nl/IMDI/Schema/Content-Interactivity.xml"
                      Type="ClosedVocabulary">Unspecified</Interactivity>
        <PlanningType Link="http://www.mpi.nl/IMDI/Schema/Content-PlanningType.xml"
                      Type="ClosedVocabulary">Unspecified</PlanningType>
        <Involvement Link="http://www.mpi.nl/IMDI/Schema/Content-Involvement.xml"
                    Type="ClosedVocabulary">Unspecified</Involvement>
        <SocialContext Link="http://www.mpi.nl/IMDI/Schema/Content-SocialContext.xml"
                      Type="ClosedVocabulary">Unspecified</SocialContext>
        <EventStructure Link="http://www.mpi.nl/IMDI/Schema/Content-EventStructure.xml"
                        Type="ClosedVocabulary">Unspecified</EventStructure>
        <Channel Link="http://www.mpi.nl/IMDI/Schema/Content-Channel.xml"
                Type="ClosedVocabulary">Unspecified</Channel>
      </CommunicationContext>
      <Languages />
      <Keys />
    </Content>
    <Actors />
  `
    );

    this.resourcesGroup(folder);
    this.exitGroup(); //Session
    return this.makeString();
  }
}

enum VocabularyType {
  ClosedVocabulary = "ClosedVocabulary",
  OpenVocabulary = "OpenVocabulary",
  OpenVocabularyList = "OpenVocabularyList",
}
