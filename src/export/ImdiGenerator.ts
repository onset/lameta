import pkg from "package.json";
import assert from "assert";
import { Session } from "../model/Project/Session/Session";
import * as XmlBuilder from "xmlbuilder";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
import moment from "moment";
import { File } from "../model/file/File";
import * as Path from "path";
import { Person } from "../model/Project/Person/Person";
import { Set } from "typescript-collections";
import {
  getImdiResourceTypeForPath,
  GetFileFormatInfoForPath,
  getMimeType
} from "../model/file/FileTypeInfo";
import { titleCase } from "title-case";
import { sanitizeForArchive } from "../other/sanitizeForArchive";
import { IPersonLanguage } from "../model/PersonLanguage";
import { sentryBreadCrumb } from "../other/errorHandling";
import { NotifyWarning } from "../components/Notify";
import { collectExportWarning } from "./ExportWarningCollector";
import { getStatusOfFile } from "../model/file/FileStatus";
import {
  capitalCase,
  sentenceCase,
  sentenceCaseUnlessAcronym
} from "../other/case";
import { Field } from "../model/field/Field";
import { fieldElement } from "./Imdi-static-fns";

// IMDI Date_Value_Type pattern from IMDI_3.0.xsd
// Valid: YYYY, YYYY-MM, YYYY-MM-DD, date ranges with /, "Unknown", "Unspecified", or empty
const imdiDatePattern =
  /^([0-9]{4}(-(0[1-9]|1[012])(-([0-2][0-9]|3[01]))?)?)(\/[0-9]{4}(-(0[1-9]|1[012])(-([0-2][0-9]|3[01]))?)?)?$|^Unknown$|^Unspecified$/;

// Pattern to match approximate birth years like "~1964"
const tildeBirthYearPattern = /^~(\d{4})$/;

// Track if we've already emitted the tilde birth year warning
let hasEmittedTildeBirthYearWarning = false;

/**
 * Reset the tilde birth year warning flag. Call this at the start of an export.
 */
export function resetTildeBirthYearWarning(): void {
  hasEmittedTildeBirthYearWarning = false;
}

/**
 * Check if a birth year/date value is valid for IMDI export.
 * - Returns the value if already valid
 * - Converts "~YYYY" to "YYYY/YYYY+1" range format
 * - Returns "Unspecified" for other non-conformant values
 */
export function getImdiConformantBirthDate(value: string): string {
  if (!value || value.trim() === "") {
    return "Unspecified";
  }
  const trimmed = value.trim();

  // Check if it's already a valid IMDI date
  if (imdiDatePattern.test(trimmed)) {
    return trimmed;
  }

  // Check for approximate birth year with tilde (e.g., "~1964")
  const tildeMatch = trimmed.match(tildeBirthYearPattern);
  if (tildeMatch) {
    const year = parseInt(tildeMatch[1], 10);
    // Convert to range format: YYYY-1/YYYY+1
    return `${year - 1}/${year + 1}`;
  }

  // Non-conformant - return Unspecified
  return "Unspecified";
}

/**
 * Check if a birth year has the tilde format (e.g., "~1964")
 */
export function isTildeBirthYear(value: string): boolean {
  return tildeBirthYearPattern.test(value.trim());
}

/**
 * Emit a warning for tilde birth years (only once per export)
 * Returns true if a warning was emitted (first time), false otherwise
 */
export function emitTildeBirthYearWarningOnce(): boolean {
  if (!hasEmittedTildeBirthYearWarning) {
    hasEmittedTildeBirthYearWarning = true;
    const warningMsg = `lameta found one or more Persons with Birth Years of the form "~1234". These will be converted to a range, e.g. "1233/1235".`;
    if (!collectExportWarning(warningMsg)) {
      NotifyWarning(warningMsg);
    }
    return true;
  }
  return false;
}

export enum IMDIMode {
  OPEX, // wrap in OPEX elements, name .opex
  RAW_IMDI
}
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
  private mode: IMDIMode;
  // note, folder wil equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  public constructor(mode: IMDIMode, folder?: Folder, project?: Project) {
    this.mode = mode;
    // folder and project can be omitted in some tests that are ust calling a function that doesn't need them
    if (folder) this.folderInFocus = folder;
    if (project) this.project = project;
  }

  public static generateCorpus(
    mode: IMDIMode,
    project: Project,
    childrenSubPaths: string[],

    omitNamespaces?: boolean
  ): string {
    const generator = new ImdiGenerator(mode, project, project);
    if (omitNamespaces) {
      generator.omitNamespaces = omitNamespaces;
    }
    return generator.corpus(childrenSubPaths);
  }
  public static generateProject(mode: IMDIMode, project: Project): string {
    const generator = new ImdiGenerator(mode, project, project);
    return generator.projectXmlForPreview();
  }
  public static generateSession(
    mode: IMDIMode,
    session: Session,
    project: Project,

    omitNamespaces?: boolean
  ): string {
    const generator = new ImdiGenerator(mode, session, project);
    if (omitNamespaces) {
      generator.omitNamespaces = omitNamespaces;
    }
    sentryBreadCrumb(
      `Generating IMDI for session ${session.metadataFile?.metadataFilePath}`
    );
    return generator.session();
  }

  // see https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_Catalogue_3.0.0.pdf for details
  private corpus(childrenSubpaths: string[]): string {
    const project = this.folderInFocus as Project;
    this.startXmlRoot("CORPUS");

    this.startGroup("Corpus");
    // we don't have a separate title vs. name field
    this.element("Name", project.displayName);

    this.element(
      "Title",
      project.properties.getTextStringOrEmpty("title") // Hanna 2024: Collection Title --> Corpus/Title
      // REVIEW previously, this was "fundingProjectTitle" per Vera at ELAR 23/8/2019
    );

    // this.element(
    //   "Title",
    //   project.properties.getTextStringOrEmpty("fundingProjectTitle")
    // );
    //this.requiredField("Description", "projectDescription");
    this.element(
      "Description",
      project.properties.getTextStringOrEmpty("collectionDescription")
    );
    this.attributeLiteral("Name", "short_description"); // Review: this is from ELAR email, I'm not clear why it is needed

    this.startGroup("MDGroup");

    // Location is required by the schema. I'm not clear if I should include it here or on on session
    this.sessionLocation();
    // Project is required by the schema
    this.addProjectInfo();
    this.group("Keys", () => {
      this.keyElement(
        "CorpusId",
        project.properties.getTextStringOrEmpty("collectionKey")
      );
      this.keyElement(
        "Funding Body",
        project.properties.getTextStringOrEmpty("fundingProjectFunder")
      );
    });

    // Content is required by the schema
    this.group("Content", () => {
      this.element("Genre", "Unspecified");
      // this.element("SubGenre", "Unspecified");
      // Modalities, Subject, CommunicationContext
      // this.element("Task", "Unspecified");
      // this.element("Modalities", "Unspecified");
      // this.element("Subject", "Unspecified");

      this.group("CommunicationContext", () => {
        // this.element("Interactivity", "Unspecified");
        // this.element("PlanningType", "Unspecified");
        // this.element("Involvement", "Unspecified");
        // this.element("SocialContext", "Unspecified");
        // this.element("EventStructure", "Unspecified");
        // this.element("Channel", "Unspecified");
      });
      this.group("Languages", () => {});
      this.group("Keys", () => {});
    });

    this.group("Actors", () => {
      this.addSimpleActor(
        "Collection Steward",
        project.properties.getTextStringOrEmpty("collectionSteward")
      );
      // split "Deputy Collection Stewards" into multiple actors
      const deputyCollectionStewards = project.properties.getTextStringOrEmpty(
        "collectionDeputySteward"
      );
      this.addSimpleActorMultiple(
        "Deputy Collection Steward",
        deputyCollectionStewards
      );
      this.addSimpleActorMultiple(
        "Depositor",
        project.properties.getTextStringOrEmpty("depositor")
      );
    });
    this.exitGroup(); // MDGroup

    for (const subpath of childrenSubpaths) {
      this.element("CorpusLink", subpath);
      // this element looks like this:
      // <CorpusLink Name="OtherDocuments">myProject/OtherDocuments.imdi</CorpusLink>
      let nameWithoutExtension = Path.basename(subpath, ".imdi");
      // remove ".opex", too
      nameWithoutExtension = nameWithoutExtension.replace(".opex", "");
      this.attributeLiteral("Name", nameWithoutExtension);
    }
    return this.makeString();
  }
  public keyElement(name: string, value: string) {
    this.element("Key", value);
    this.attributeLiteral("Name", name);
  }
  public addSimpleActorMultiple(role: string, names: string) {
    if (names.length > 0) {
      names.split(",").forEach((name) => {
        this.addSimpleActor(role, name.trim());
      });
    }
  }
  public addSimpleActor(role: string, name: string) {
    this.startGroup("Actor");
    this.element("Role", role);
    this.element("Name", name);
    this.element("FullName", name);
    this.element("Code", "");
    this.element("FamilySocialRole", "");
    this.element("Languages", "");
    this.element("EthnicGroup", "");
    this.element("Age", "Unspecified");
    this.element("BirthDate", "Unspecified");
    this.element("Sex", "");
    this.element("Education", "");
    this.element("Anonymized", "false");
    this.element("Contact", "");
    this.element("Keys", "");
    this.element("Description", "");
    this.exitGroup();
  }

  public projectXmlForPreview(): string {
    this.tail = XmlBuilder.create("Project");
    this.addProjectInfo();
    return this.makeString();
  }

  private addProjectInfo() {
    this.group("Project", () => {
      // Projects have names, titles, and ids too! Sigh.

      this.requiredField("Name", "title", this.project);
      this.requiredField("Title", "fundingProjectTitle", this.project);
      // ELAR would like to put some of fundingProjectFunder, fundingProjectAffiliation, fundingProjectLead, and fundingProjectContact under MDGroup/Project/Funder but that will need a new schema
      // for now, they have specified places for them *all over* (see fields.json5 & ImdiGenerator-courpus-metadata.spec.ts)

      this.requiredField("Id", "grantId", this.project);

      this.group("Contact", () => {
        this.optionalField("Name", "contactPerson", this.project);
        //<Address> We don't currently have this field.
        //<Email> We don't currently have this field.
        //<Organization> We don't currently have this field.
        //"An elaborate description of the scope and goals of the project."
        this.optionalField("Description", "projectDescription", this.project);
        this.optionalField(
          "Organisation",
          "fundingProjectAffiliation",
          this.project
        );
      });
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
        this.element("Role", this.getRoleOutput(contribution.role));
        this.element("Name", trimmedName);
        this.element("FullName", trimmedName);
        this.element("Code", "");
        this.element("FamilySocialRole", "");
        this.element("Languages", "");
        this.element("EthnicGroup", "");
        this.element("Age", "Unspecified");
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
            const langName =
              this.project.languageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
                code
              );
            this.addSessionLanguage(code, langName, "Subject Language");
          });
        } else {
          this.addMissingSessionLanguage(
            "collectionSubjectLanguages",
            "Subject Language"
          );
        }
        this.keysThatHaveBeenOutput.add("Session.languages");
        const workingLanguages = session.getWorkingLanguageCodes();
        if (workingLanguages.length > 0) {
          workingLanguages.forEach((code) => {
            const langName =
              this.project.languageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
                code
              );
            this.addSessionLanguage(code, langName, "Working Language");
          });
        } else {
          this.addMissingSessionLanguage(
            "collectionWorkingLanguages",
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
    this.element("Id", "ISO639-3:" + lang.code);

    //this.fieldLiteral("Id", lang);
    this.element(
      "Name",
      this.project.languageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
        lang.code
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
          lang.mother ? "Also spoken by mother." : undefined
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
    this.dateField("Date", "date");
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
      "notes", // ELAR says not to export Notes to IMDI
      "accessDescription" // output by addAccess()
    ];
    if (target instanceof Person) {
      blacklist.push("description"); // gets its own element
    }

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
              // Hanna asks that we not do this to topic and keyword
              if (["status" /*, "keyword", "topic",*/].indexOf(key) > -1) {
                // capitalize the first letter of each word
                v = sentenceCaseUnlessAcronym(v);
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

    // The schema's `Resources` element has xs:sequence, which requires that the resouces be
    // in order by type. MediaFile, WrittenResource, LexiconResource,
    // LexiconComponent, Source, Anonyms
    this.resourcesOfType(folder, "MediaFile");
    this.resourcesOfType(folder, "WrittenResource");
    this.exitGroup(); // Resources
  }

  private resourcesOfType(folder: Folder, type: string) {
    const sortedByFileNames = folder.files.sort((a, b) =>
      a.getRelativePathForExportingTheActualFile() <
      b.getRelativePathForExportingTheActualFile()
        ? -1
        : 1
    );
    sortedByFileNames.forEach((f: File) => {
      if (ImdiGenerator.shouldIncludeFile(f.getActualFilePath())) {
        const status = getStatusOfFile(f);
        if (status.missing) {
          // At the moment we're not even exporting metadata if the file is
          // missing. With some work to avoid some errors, it would be possible.
          const missingMsg =
            f.getNameToUseWhenExportingUsingTheActualFile() +
            ": " +
            getStatusOfFile(f).info;
          if (!collectExportWarning(missingMsg)) {
            NotifyWarning(missingMsg);
          }
        } else {
          if (status.status === "fileNamingProblem") {
            // Funnel to export log if collecting, otherwise show toast
            const namingMsg = f.getActualFilePath() + ": " + status.info;
            if (!collectExportWarning(namingMsg)) {
              NotifyWarning(namingMsg); // but still export it
            }
          }
          switch (type) {
            case "MediaFile":
              if (this.isMediaFile(f)) {
                this.mediaFile(f);
              }
              break;
            case "WrittenResource":
              if (!this.isMediaFile(f)) {
                this.writtenResource(f);
              }
              break;
          }
        }
      }
    });
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
    return (
      [".sprj", ".session", ".person", ".skip"].indexOf(Path.extname(path)) ===
      -1
    );
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
    const g = GetFileFormatInfoForPath(f.getActualFilePath());
    return !!g?.isMediaType;
  }

  private sanitizedRelativePath(path: string): string {
    // If the project has the right setting, then this path is probably already sanitized (though there may be corner
    // cases where it isn't, e.g. the setting was set after files were added.) But in the ImdiBundler, we sanitize
    // files as they get copied to the export, regardless of that setting. This is because this is a *requirement* of
    // IMDI archives. Anyhow, since the bundler would have (or will have) export the sanitized version, we need to do
    // that to the file name we use for it in the xml.
    const filename = sanitizeForArchive(Path.basename(path), "ASCII");
    const immediateParentDirectoryName = Path.basename(Path.dirname(path));

    const relativePath = Path.join(immediateParentDirectoryName, filename)
      // get a path that works across platforms.
      .replace(/\\/g, "/");

    // TODO: for IMDIMode===Opex, should we be including any path at all for written and media files?
    // There is a different case, for CorpusLink, which is when the root file points at the opex files, which would
    // still need to be relative to the root file.
    return relativePath;
  }
  public mediaFile(f: File): string | null {
    return this.group("MediaFile", () => {
      this.element(
        "ResourceLink",
        this.sanitizedRelativePath(f.getRelativePathForExportingTheActualFile())
      );
      this.attributeLiteral("ArchiveHandle", ""); // somehow this helps ELAR's process, to have this here, empty.

      this.element(
        "Type",
        titleCase(f.type), // while https://www.mpi.nl/IMDI/Schema/MediaFile-Type.xml shows these should be lower case, this is apparently an OpenVocabulary and ELAR's system requires upper case
        false,
        "http://www.mpi.nl/IMDI/Schema/MediaFile-Type.xml"
      );

      this.formatElement(
        f.getRelativePathForExportingTheActualFile(),
        "https://www.mpi.nl/IMDI/Schema/MediaFile-Format.xml"
      );
      this.requiredField("Size", "size", f);
      this.element("Quality", "Unspecified");
      this.element("RecordingConditions", "");
      this.group("TimePosition", () => {
        this.element("Start", "Unspecified");
        this.element("End", "Unspecified");
      });

      this.addAccess();
      this.addCustomKeys(f);
    });
  }
  private formatElement(path: string, link: string): void {
    //  One document says this is Open vocabulary { AIFF, WAV, MPEG, JPEG, … }. (https://www.mpi.nl/ISLE/documents/draft/ISLE_MetaData_2.5.pdf)
    // Another says this is a mime type (https://www.mpi.nl/IMDI/Schema/MediaFile-Format.xml)
    // What we're doing here is emitting a mime type if we can determine it, otherwise the extension.
    // Review: should we instead be emitting, e.g. application/elan+xml for .eaf?
    const mime = getMimeType(Path.extname(path));
    this.element("Format", mime || Path.extname(path), false, link);
  }
  public writtenResource(f: File): string | null {
    return this.group("WrittenResource", () => {
      this.element(
        "ResourceLink",
        this.sanitizedRelativePath(f.getRelativePathForExportingTheActualFile())
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
      const imdiResourceType = getImdiResourceTypeForPath(
        f.getRelativePathForExportingTheActualFile()
      );

      this.element(
        "Type",
        imdiResourceType,
        false,
        "http://www.mpi.nl/IMDI/Schema/WrittenResource-Type.xml"
      );
      this.element("SubType", "");
      // "format" here is really mime type. See https://www.mpi.nl/IMDI/Schema/WrittenResource-Format.xml
      this.formatElement(
        f.getRelativePathForExportingTheActualFile(),
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

      this.addAccess();
      this.addCustomKeys(f);
    });
  }
  // note, lameta doesn't have different access codes for different files,
  // so we're just outputting the access code for the session.
  private addAccess() {
    const accessCode =
      this.folderInFocus instanceof Session
        ? this.folderInFocus.properties.getTextStringOrEmpty("access")
        : "";

    /* NO: the schema requires a all the access fields, even if they are empty.
    if (accessCode.length === 0) {
      return; // if the folder doesn't have an access code, then there is nothing for us to output
      // this can happen on a Session, and will always happen if the file (e.g. an image) is
      // part of a Person, becuase lameta does not currently support access codes on Persons.
    }
    */

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
      // const accessDef = this.project.authorityLists.accessChoicesOfCurrentProtocol.find(
      //   (c) => c.label === accessCode
      // );

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
          "archiveConfigurationName"
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
      if (accessCode.length > 0) {
        this.requiredField("Description", "accessDescription");
      } else {
        this.element("Description", "");
      }
    });

    //}
  }

  private getRoleOutput(role: string): string {
    let roleOutput = "Unspecified";
    if (role && role.length > 0) {
      // replace underscores with spaces
      roleOutput = role.replace(/_/g, " ");
      // upper case the first letter of the first word only (per ELAR's Hanna)
      roleOutput = roleOutput.charAt(0).toUpperCase() + roleOutput.slice(1);
    }
    return roleOutput;
  }
  // See https://tla.mpi.nl/wp-content/uploads/2012/06/IMDI_MetaData_3.0.4.pdf for details
  public actor(
    person: Person,
    role: string,
    referenceDate?: Date | undefined,
    moreKeys?: any[]
  ): string | null {
    return this.group("Actor", () => {
      const roleOutput = this.getRoleOutput(role);

      this.element("Role", roleOutput);
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
      const dateToCompareWith = referenceDate ? referenceDate : undefined;

      const birthYear = person.properties.getTextStringOrEmpty("birthYear");
      if (birthYear === "?") {
        this.element("Age", "Unknown"); // ELAR request Oct-Dec 2019. IMDI schema requires capital "Unknown"
      } else if (birthYear.trim() === "") {
        this.element("Age", "Unspecified"); // ELAR request https://trello.com/c/tnnCn8yQ/111-imdi-person-metadata-incomplete
        this.tail.comment("Could not compute age");
      } else {
        const age = dateToCompareWith
          ? person.ageOn(dateToCompareWith)
          : "Unspecified";
        if (!dateToCompareWith) {
          this.tail.comment("Could not compute age");
        }
        // IMDI schema requires Age element to always appear before BirthDate (xs:sequence)
        // so we must always output Age, even if empty/Unspecified
        this.element("Age", age && age.length > 0 ? age : "Unspecified");
      }
      // BirthDate must conform to IMDI Date_Value_Type
      const rawBirthYear = person.properties.getTextStringOrEmpty("birthYear");
      const conformantBirthDate = getImdiConformantBirthDate(rawBirthYear);

      // Emit warnings for non-conformant birth years
      if (
        rawBirthYear.trim() !== "" &&
        rawBirthYear.trim() !== "?" &&
        conformantBirthDate !== rawBirthYear.trim()
      ) {
        if (isTildeBirthYear(rawBirthYear)) {
          // For tilde birth years, emit a single warning for all of them
          emitTildeBirthYearWarningOnce();
        } else {
          // For other non-conformant values, emit a per-person warning
          const personName = person.properties.getTextStringOrEmpty("name");
          const warningMsg = `Person "${personName}": BirthYear "${rawBirthYear}" is not valid for IMDI export. Using "Unspecified" instead.`;
          if (!collectExportWarning(warningMsg)) {
            NotifyWarning(warningMsg);
          }
        }
      }
      this.keysThatHaveBeenOutput.add("Person.birthYear");
      this.element("BirthDate", conformantBirthDate);

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
    target?: Folder | File
  ) {
    this.field(elementName, fieldName, true, "Unspecified", target);
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
  private dateField(elementName: string, fieldName: string) {
    const date = this.folderInFocus.properties.getTextStringOrEmpty(fieldName);
    const s =
      date === ""
        ? "Unspecified"
        : // all we're really doing here is stripping off the time portion
          new Date(date).toISOString().slice(0, 10);
    this.element(elementName, s);
    this.keysThatHaveBeenOutput.add(this.folderInFocus.type + "." + fieldName);
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
    const folder = target ? target : this.folderInFocus;

    // Note: Previously used stringify(folder) here which was extremely slow (~1.5s per session)
    // because it serialized the entire folder object on every field. Using lightweight info instead.
    const folderName =
      folder instanceof Folder
        ? folder.displayName
        : folder.getFilenameToShowInList();
    sentryBreadCrumb(
      `in ImdiGenerator:field, getFieldDefinition():(elementName:${elementName}) fieldName:${fieldName} folder:${folder.type}/${folderName}`
    );

    let field = folder.properties.getValue(fieldName) as Field;

    // as far as I can tell, this is only used for a case change, e.g "Country" or "country"
    if (projectFallbackFieldName && (!field || field.text.length === 0)) {
      field = this.project.properties.getValue(
        projectFallbackFieldName
      ) as Field;
    } else {
      assert.ok(folder.type, "IMDI field f.type was null");
      this.keysThatHaveBeenOutput.add(folder.type + "." + fieldName);
    }

    let value: string | Field = field;

    // ELAR, at least requires spaces to become underscores for IDs
    if (elementName === "Name" && fieldName === "id") {
      value = field.text.replace(/ /g, "_");
    }

    if (["genre", "subgenre", "socialContext"].indexOf(fieldName) > -1) {
      // For genre in IMDI export, ELAR doesn't want "formulaic_discourse",
      // they want "Formulaic discourse" (Sentence Case)

      // for some, we may have access to an explicit label. Probably makes no difference, the keys are always just snake case of the label.
      const label = folder.properties
        .getLabelOfValue(fieldName)
        // this probably isn't used. The idea is that if we didn't get new label, just replace the underscores
        .replace(/_/g, " ");

      value = sentenceCase(label);
    }

    const result = fieldElement(
      elementName,
      value,
      this.tail,
      this.mostRecentElement,
      xmlElementIsRequired,
      defaultValue
    );
    this.tail = result.tail;
    if (result.mostRecentElement)
      this.mostRecentElement = result.mostRecentElement;
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
    //in OPEX mode, we wrap the whole thing in a <opex:OPEXMetadata><opex:DescriptiveMetadata>
    if (this.mode === IMDIMode.OPEX) {
      this.tail = XmlBuilder.create("opex:OPEXMetadata");
      this.tail.a(
        "xmlns:opex",
        "http://www.openpreservationexchange.org/opex/v1.2"
      );
      const x = this.tail.element("opex:DescriptiveMetadata");
      this.tail = x.element("METATRANSCRIPT");
    } else {
      this.tail = XmlBuilder.create("METATRANSCRIPT");
    }
    if (!this.omitNamespaces) {
      this.tail.a("xmlns", "http://www.mpi.nl/IMDI/Schema/IMDI");
      this.tail.a("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
      this.tail.a(
        "xsi:schemaLocation",
        "http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd"
      );
      this.tail.a("Type", typeAttribute);
      this.tail.a("Version", "0");
    }
    this.tail
      //.a("ArchiveHandle", "") // somehow this helps ELAR's process, to have this here, empty.)
      .a("Date", this.nowDate())
      .a("Originator", "lameta " + pkg.version)
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
    this.startGroup("MDGroup");
    this.addProjectInfo();

    this.tail.element("Location").raw(
      `<Location>
      <Continent Type="ClosedVocabulary" Link="http://www.mpi.nl/IMDI/Schema/Continents.xml" />
      <Country Type="OpenVocabulary" Link="http://www.mpi.nl/IMDI/Schema/Countries.xml" />
    </Location>`
    );
    this.tail.element("Keys").raw("");
    this.tail.element("Content").raw(
      `<Content>
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
    </Content>`
    );
    this.tail.element("Actors").raw("");
    this.exitGroup(); //MDGroup
    this.resourcesGroup(folder);
    this.exitGroup(); //Session
    return this.makeString();
  }
}

enum VocabularyType {
  ClosedVocabulary = "ClosedVocabulary",
  OpenVocabulary = "OpenVocabulary",
  OpenVocabularyList = "OpenVocabularyList"
}
