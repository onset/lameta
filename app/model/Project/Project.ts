import * as fs from "fs-extra";
import * as mobx from "mobx";
import * as Path from "path";
import { Session } from "./Session/Session";
import { IFolderSelection, Folder } from "../Folder/Folder";
import { Person } from "./Person/Person";
import { File, Contribution } from "../file/File";
import { ProjectDocuments } from "./ProjectDocuments";
const sanitize = require("sanitize-filename");
import { AuthorityLists } from "./AuthorityLists/AuthorityLists";
import { remote, ipcRenderer } from "electron";
import { trash } from "../../other/crossPlatformUtilities";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import { FolderMetadataFile } from "../file/FolderMetaDataFile";
import { CustomFieldRegistry } from "./CustomFieldRegistry";
import { Field, FieldType, IChoice } from "../field/Field";
import { FieldDefinition } from "../field/FieldDefinition";
import { i18n } from "../../other/localization";
import { t } from "@lingui/macro";
import { analyticsEvent } from "../../other/analytics";
import userSettings from "../../other/UserSettings";
import { LanguageFinder } from "../../languageFinder/LanguageFinder";
import * as Sentry from "@sentry/browser";

const genres = require("./Session/genres.json");

import knownFieldDefinitions from "../field/KnownFieldDefinitions";
import { duplicateFolder } from "../Folder/DuplicateFolder";
import { ShowMessageDialog } from "../../components/ShowMessageDialog/MessageDialog";
import { NotifyException, NotifyWarning } from "../../components/Notify";
import { setCurrentProjectId } from "./MediaFolderAccess";

let sCurrentProject: Project | null = null;

export class ProjectHolder {
  @mobx.observable
  private projectInternal: Project | null;

  public get project(): Project | null {
    return this.projectInternal;
  }
  public setProject(p: Project | null) {
    if (this.projectInternal && !this.projectInternal.loadingError) {
      this.projectInternal.saveAllFilesInFolder();
    }
    if (p == null) {
      console.log("setting project to null");
      userSettings.PreviousProjectDirectory = null;
    } else {
      console.log("setting project to " + p.directory);
    }
    this.projectInternal = p;
    sCurrentProject = p;
  }
}

export class Project extends Folder {
  public loadingError: string;

  @mobx.observable
  public selectedSession: IFolderSelection;
  @mobx.observable
  public selectedPerson: IFolderSelection;
  @mobx.observable
  public sessions: Session[] = [];
  @mobx.observable
  public persons: Person[] = [];

  public descriptionFolder: Folder;
  public otherDocsFolder: Folder;
  public authorityLists: AuthorityLists;
  public languageFinder: LanguageFinder;

  public static getDefaultContentLanguageCode() {
    const codeAndName =
      sCurrentProject === null
        ? ""
        : sCurrentProject.properties.getTextStringOrEmpty(
            "vernacularIso3CodeAndName"
          );

    return codeAndName.split(":")[0].trim();
  }
  public static getDefaultWorkingLanguageCode() {
    const codeAndName =
      sCurrentProject === null
        ? ""
        : sCurrentProject.properties.getTextStringOrEmpty(
            "analysisIso3CodeAndName"
          );

    return codeAndName.split(":")[0].trim();
  }

  public importIdMatchesThisFolder(id: string): boolean {
    throw new Error("Did not expect matchesId on Project");
  }

  private constructor(
    directory: string,
    metadataFile: FolderMetadataFile,
    files: File[],
    descriptionFolder: Folder,
    otherDocsFolder: Folder,
    customFieldRegistry: CustomFieldRegistry
  ) {
    super(directory, metadataFile, files, customFieldRegistry);

    if (this.properties.getTextStringOrEmpty("guid").length === 0) {
      console.log("***adding guid");
      this.properties.addTextProperty("guid", NewGuid());
      this.wasChangeThatMobxDoesNotNotice();
    }

    if (this.properties.getTextStringOrEmpty("title").length === 0) {
      this.properties.setText("title", Path.basename(directory));
    }
    // Note, we'd rather have an id that cannot change, but don't have one to
    // work with at the moment.
    setCurrentProjectId(this.properties.getTextStringOrEmpty("guid"));

    this.selectedSession = new IFolderSelection();
    this.selectedPerson = new IFolderSelection();
    this.descriptionFolder = descriptionFolder;
    this.otherDocsFolder = otherDocsFolder;
    this.authorityLists = new AuthorityLists(() =>
      this.persons.map((p) => p.displayName)
    );

    this.setupProtocolChoices();
    this.setupGenreDefinition();

    this.knownFields = knownFieldDefinitions.project; // for csv export

    this.languageFinder = new LanguageFinder(() =>
      this.getContentLanguageCodeAndName()
    );
    if (directory.indexOf("sample data") > -1) {
      window.setTimeout(
        () =>
          NotifyWarning(
            "Not saving because directory contains the words 'sample data'"
          ),
        2000 // delay so that the UI is up enough to show this
      );
    }
  }
  public get accessProtocol(): string {
    return this.properties.getTextStringOrEmpty("accessProtocol");
  }
  public static fromDirectory(directory: string): Project {
    try {
      const customFieldRegistry = new CustomFieldRegistry();
      const metadataFile = new ProjectMetadataFile(
        directory,
        customFieldRegistry
      );

      const descriptionFolder = ProjectDocuments.fromDirectory(
        directory,
        "DescriptionDocuments",
        customFieldRegistry
      );

      const otherDocsFolder = ProjectDocuments.fromDirectory(
        directory,
        "OtherDocuments",
        customFieldRegistry
      );

      const files = this.loadChildFiles(
        directory,
        metadataFile,
        customFieldRegistry
      );
      // console.log(
      //   "Project had " + files.length + " files. " + JSON.stringify(files)
      // );

      const project = new Project(
        directory,
        metadataFile,
        files,
        descriptionFolder,
        otherDocsFolder,
        customFieldRegistry
      );
      sCurrentProject = project;
      const sesssionsDir = Path.join(directory, "Sessions");
      fs.ensureDirSync(sesssionsDir);
      fs.readdirSync(sesssionsDir, "utf8").forEach((childName) => {
        const dir = Path.join(sesssionsDir, childName);
        if (fs.lstatSync(dir).isDirectory()) {
          // console.log(dir);
          const session = Session.fromDirectory(
            dir,
            project.customFieldRegistry
          );
          project.sessions.push(session);
        }
        // else ignore it
      });
      const peopleDir = Path.join(directory, "People");
      fs.ensureDirSync(peopleDir);
      fs.readdirSync(peopleDir, "utf8").forEach((childName) => {
        const dir = Path.join(peopleDir, childName);
        if (fs.lstatSync(dir).isDirectory()) {
          //console.log(dir);
          const person = Person.fromDirectory(
            dir,
            project.customFieldRegistry,
            // note: we have to use a fat arrow thing here in order to bind the project to the method, since we are in a static method at the moment
            (o, n) =>
              project.updateSessionReferencesToPersonWhenIdChanges(o, n),
            project.languageFinder
          );
          project.persons.push(person);
        }
        // else ignore it
      });

      project.selectedSession.index = project.sessions.length > 0 ? 0 : -1;
      project.selectedPerson.index = project.persons.length > 0 ? 0 : -1;

      //project.files[0].save();
      // tslint:disable-next-line:no-unused-expression
      return project;
    } catch (err) {
      Sentry.captureException(err);
      console.error(err);
      // tslint:disable-next-line: no-object-literal-type-assertion
      return { loadingError: err.message } as Project;
    }
  }

  private makePersonFromDirectory(dir: string): Person {
    return Person.fromDirectory(
      dir,
      this.customFieldRegistry,
      // note: we have to use a fat arrow thing here in order to bind the project to the method, since we are in a static method at the moment
      (o, n) => this.updateSessionReferencesToPersonWhenIdChanges(o, n),
      this.languageFinder
    );
  }

  public selectSession(session: Session) {
    this.selectedSession.index = this.sessions.findIndex((s) => s === session);
  }

  public get displayName(): string {
    return this.properties.getTextStringOrEmpty("title");
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
  public makeSessionForImport(): Session {
    const dir = this.getUniqueFolder(
      Path.join(this.directory, "Sessions"), // we don't localize the directory name.
      t`New Session`
    );
    //const metadataFile = new FolderMetadataFile(dir, "Session", ".session");
    const session = Session.fromDirectory(dir, this.customFieldRegistry);
    session.properties.setText("id", Path.basename(dir));
    // no, not yet this.sessions.push(session);
    // no, not yet this.selectedSession.index = this.sessions.length - 1;
    analyticsEvent("Create", "Create Session From Import");
    return session;
  }
  public makePersonForImport(): Person {
    const dir = this.getUniqueFolder(
      Path.join(this.directory, "People"), // we don't localize the directory name.
      t`New Person`
    );
    const person = this.makePersonFromDirectory(dir);
    person.properties.setText("name", Path.basename(dir));
    analyticsEvent("Create", "Create Person From Import");
    return person;
  }

  public finishSessionImport(session: Session) {
    this.sessions.push(session);
    //no: wait until we have imported them all. Importer will then select one. // this.selectedSession.index = this.sessions.length - 1;
  }
  public finishPersonImport(person: Person) {
    this.persons.push(person);
  }

  public addSession() {
    const dir = this.getUniqueFolder(
      Path.join(this.directory, "Sessions"), // we don't localize the directory name.
      t`New Session`
    );
    //const metadataFile = new FolderMetadataFile(dir, "Session", ".session");
    const session = Session.fromDirectory(dir, this.customFieldRegistry);
    session.properties.setText("id", Path.basename(dir));
    this.sessions.push(session);
    this.selectedSession.index = this.sessions.length - 1;
    analyticsEvent("Create", "Create Session");
  }
  public duplicateCurrentSession() {
    const session = this.sessions[this.selectedSession.index];
    const { success, metadataFilePath, directory } = duplicateFolder(session);
    if (success) {
      const newSession = Session.fromDirectory(
        directory,
        this.customFieldRegistry
      );
      newSession.properties.setText("id", Path.basename(directory));
      this.sessions.push(newSession);
      this.selectedSession.index = this.sessions.length - 1;
      analyticsEvent("Duplicate", "Duplicate Session");
    }
  }
  public duplicateCurrentPerson() {
    const person = this.persons[this.selectedPerson.index];
    const { success, metadataFilePath, directory } = duplicateFolder(person);
    if (success) {
      const newPerson = this.setupPerson(directory);
      newPerson.properties.setText("name", Path.basename(directory));
      this.persons.push(newPerson);
      this.selectedPerson.index = this.persons.length - 1;
      analyticsEvent("Duplicate", "Duplicate person");
    }
  }

  setupPerson(dir: string): Person {
    return Person.fromDirectory(
      dir,
      this.customFieldRegistry,
      // note: we have to use a fat arrow thing here in order to bind the project to the callback
      (o, n) => this.updateSessionReferencesToPersonWhenIdChanges(o, n),
      this.languageFinder
    );
  }

  public addPerson(name?: string): Person {
    const dir = this.getUniqueFolder(
      Path.join(this.directory, "People"), // we don't localize the directory name.
      t`New Person`
    );
    //const metadataFile = new FolderMetadataFile(dir, "Person", ".person");
    const person = this.setupPerson(dir);
    person.properties.setText("name", name ?? t`New Person`);
    this.persons.push(person);
    person.nameMightHaveChanged();
    person.saveFolderMetaData;
    this.selectedPerson.index = this.persons.length - 1;
    analyticsEvent("Create", "Create Person");
    return person;
  }

  private setupProtocolChoices() {
    this.authorityLists.setAccessProtocol(
      this.properties.getTextStringOrEmpty("accessProtocol"),
      this.properties.getTextStringOrEmpty("customAccessChoices")
    );

    // when the user changes the chosen access protocol, we need to let the authorityLists
    // object know so that it can provide the correct set of choices to the Settings form.
    this.properties
      .getValueOrThrow("accessProtocol")
      .textHolder.map.intercept((change) => {
        this.authorityLists.setAccessProtocol(
          change.newValue as string,
          this.properties.getTextStringOrEmpty("customAccessChoices")
        );
        return change;
      });
    this.properties
      .getValueOrThrow("customAccessChoices")
      .textHolder.map.intercept((change) => {
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

  private setupGenreDefinition() {
    const genreChoices = genres.map((g: any) => {
      return {
        ...g,
        // bit of a mismatch in the naming
        description: g.definition,
      };
    });
    console.assert(genreChoices.length > 0);

    const genreFieldDefinition = knownFieldDefinitions.session.find(
      (o: any) => o.key === "genre"
    ) as FieldDefinition;
    //AuthorityLists.convertGenresToCSVForLocalization(genreChoices);
    genreFieldDefinition.complexChoices = genreChoices;
  }

  protected validateFieldThatControlsFolderName(
    folderArray: Folder[],
    folder: Folder,
    value: string,
    fieldNameInUiLanguage: string,
    folderKind: string
  ) {
    let msg = "";
    const wouldBeFolderName = sanitize(value);

    if (value.trim().length === 0) {
      msg = t`The ${fieldNameInUiLanguage} cannot be empty`;
    } else if (wouldBeFolderName.trim().length === 0) {
      msg = t`That name would lead to an empty filename.`;
    } else if (
      folderArray.some(
        (f) =>
          f !== folder &&
          (f.filePrefix.toLowerCase() === wouldBeFolderName.toLowerCase() ||
            f.wouldCollideWithIdFields(value))
      )
    ) {
      msg = t`There is already a ${folderKind} "${value}".`;
    }
    if (msg.length > 0) {
      ShowMessageDialog({
        title: "Cannot use that name",
        text: msg,
        buttonText: "OK",
      });
      return false;
    } else {
      return true;
    }
  }
  public validateSessionId(session: Session, id: string): boolean {
    return this.validateFieldThatControlsFolderName(
      this.sessions,
      session,
      id,
      t`ID`,
      t`Session`
    );
  }
  public validatePersonFullName(person: Person, name: string): boolean {
    return this.validateFieldThatControlsFolderName(
      this.persons,
      person,
      name,
      t`Full Name`,
      t`Person`
    );
  }
  public validatePersonCode(person: Person, code: string): boolean {
    if (
      code.trim().length > 0 &&
      this.persons.some((p) => p !== person && p.wouldCollideWithIdFields(code))
    ) {
      remote.dialog
        .showMessageBox({
          title: "lameta",
          message: t`There is already a Person with that name or code.`,
        })
        .then(() => {});
      return false;
    }
    return true;
  }
  public saveAllFilesInFolder() {
    this.saveFolderMetaData();
    for (const f of this.sessions) {
      f.saveAllFilesInFolder();
    }
    for (const f of this.persons) {
      f.saveAllFilesInFolder();
    }
  }
  public unMarkAllSessions() {
    this.sessions.forEach((s) => {
      s.marked = false;
    });
  }
  public countOfMarkedSessions(): number {
    return this.sessions.filter((s) => s.marked).length;
  }
  public haveSelectedSession(): boolean {
    return this.selectedSession.index >= 0;
  }

  public haveSelectedPerson(): boolean {
    return this.selectedPerson.index >= 0;
  }

  public deleteCurrentSession() {
    const session = this.sessions[this.selectedSession.index];
    ConfirmDeleteDialog.show(`${session.displayName}`, (path: string) => {
      this.deleteSession(session);
    });
  }
  public deleteMarkedSessions() {
    const session = this.sessions[this.selectedSession.index];
    ConfirmDeleteDialog.show(
      `${this.countOfMarkedSessions()} Sessions`,
      (path: string) => {
        this.sessions
          .filter((s) => s.marked)
          .forEach((session) => {
            this.deleteSession(session);
          });
      }
    );
  }
  public getOrCreatePerson(name: string): Person {
    if (!name || !name.trim()) {
      throw new Error("getOrCreatePerson() given an empty name");
    }
    const lcName = name.trim().toLowerCase();
    const found = this.persons.find(
      (p) =>
        p.properties.getTextStringOrEmpty("name").toLowerCase() === lcName ||
        p.properties.getTextStringOrEmpty("code").toLowerCase() === lcName
    );
    if (found) return found;
    else {
      return this.addPerson(name.trim());
    }
  }
  public deleteSession(session: Session) {
    try {
      if (trash(session.directory)) {
        const index = this.sessions.findIndex((s) => s === session);
        // NB: the splice() actually causes a UI update, so we have to get the selection changed beforehand
        // in case we had the last one selected and now there won't be a selection at that index.
        const countAfterWeRemoveThisOne = this.sessions.length - 1;
        this.selectedSession.index = countAfterWeRemoveThisOne > 0 ? 0 : -1;
        this.sessions.splice(index, 1);
        // console.log(
        //   `Deleting session index:${index}. selectedSession.index:${this.selectedSession.index}`
        // );
        //this.sessions.forEach((s) => console.log(`remaining session ${s.id}`));
      } else throw Error("Failed to delete session.");
    } catch (e) {
      NotifyException(e, "Error trying to delete session.");
    }
  }
  public deletePerson(person: Person) {
    try {
      if (trash(person.directory)) {
        const index = this.persons.findIndex((s) => s === person);
        // NB: the splice() actually causes a UI update, so we have to get the selection changed beforehand
        // in case we had the last one selected and now there won't be a selection at that index.
        const countAfterWeRemoveThisOne = this.persons.length - 1;
        this.selectedPerson.index = countAfterWeRemoveThisOne > 0 ? 0 : -1;
        this.persons.splice(index, 1);
        // console.log(
        //   `Deleting session index:${index}. selectedSession.index:${this.selectedSession.index}`
        // );
        //this.persons.forEach((s) => console.log(`remaining person ${s.id}`));
      } else throw Error("Failed to delete session.");
    } catch (e) {
      NotifyException(e, "Error trying to delete person.");
    }
  }
  public deleteCurrentPerson() {
    const person = this.persons[this.selectedPerson.index];
    ConfirmDeleteDialog.show(`${person.displayName}`, (path: string) => {
      // if (trash(person.directory)) {
      //   // NB: the splice() actually causes a UI update, so we have to get the selection changed beforehand
      //   // in case we had the last one selected and now there won't be a selection at that index.
      //   const countAfterWeRemoveThisOne = this.persons.length - 1;
      //   const indexToDelete = this.selectedPerson.index;
      //   this.selectedPerson.index = countAfterWeRemoveThisOne > 0 ? 0 : -1;
      //   this.persons.splice(indexToDelete, 1);
      // }
      this.deletePerson(person);
    });
  }

  public findPerson(name: string): Person | undefined {
    return this.persons.find((p) => {
      return p.referenceIdMatches(name);
    });
  }

  // called by Person when name or code changes
  // To see where this is used, search for updateExternalReferencesToThisPerson
  public updateSessionReferencesToPersonWhenIdChanges(
    oldId: string,
    newId: string
  ): void {
    this.sessions.forEach((session) =>
      session.updateSessionReferencesToPersonWhenIdChanges(oldId, newId)
    );
  }

  public getContributionsMatchingPerson(id: string): Contribution[] {
    const lowerCaseName = id.toLocaleLowerCase();
    const arraysOfMatchingContributions = this.sessions.map((session) => {
      return session
        .getAllContributionsToAllFiles()
        .map((contribution) => {
          if (contribution.personReference.toLowerCase() === lowerCaseName) {
            // the session name isn't normally part of the contribution because it is owned
            // by the session. But we stick it in here for display purposes. Alternatively,
            // we could stick in the session itself; might be useful for linking back to it.
            contribution.sessionName = session.displayName;
            return contribution;
          }
          return undefined;
        })
        .filter((c) => c); // remove the undefined's;
    });

    //flatten
    return [].concat.apply([], arraysOfMatchingContributions);
  }

  // public getSessionPeopleMatchingPersonName(personName: string): Session[] {
  //   const lowerCaseName = personName.toLocaleLowerCase();
  //   return this.sessions.filter(session =>
  //     session
  //       .getParticipantNames()
  //       .some(name => name.toLowerCase() === lowerCaseName)
  //   );
  // }

  /*  public getContentLanguageName(): string {
    return this.getContentLanguageCode()
      .split(":")
      .slice(-1)[0]
      .trim(); // last element (will be the name , if there is a ':')
  }
  public getContentLanguageCode(): string {
    return this.properties.getTextStringOrEmpty("vernacularIso3CodeAndName");
  }*/

  public getContentLanguageCodeAndName():
    | {
        iso639_3: string;
        englishName: string;
      }
    | undefined {
    const projectDefaultContentLanguage: string = this.properties.getTextStringOrEmpty(
      "vernacularIso3CodeAndName"
    );

    if (projectDefaultContentLanguage.trim().length === 0) {
      // hasn't been defined yet, e.g. a new project
      return undefined;
    }
    const parts = projectDefaultContentLanguage.split(":").map((p) => p.trim());
    if (!parts[0]) {
      return undefined; // hasn't been defined yet, e.g. a new project (but somehow still has a colon)
    }
    // In the degenerate case in which there was no ":" in the <vernacularIso3CodeAndName> element,
    // use the code as the name.
    const langName = parts.length > 1 ? parts[1] : parts[0];
    return { iso639_3: parts[0].toLowerCase(), englishName: langName };
  }

  public getWorkingLanguageName(): string {
    return this.getWorkingLanguageCode().split(":").slice(-1)[0].trim(); // last element (will be the name , if there is a ':')
  }
  public getWorkingLanguageCode(): string {
    return this.properties.getTextStringOrEmpty("analysisIso3CodeAndName");
  }
}

export class ProjectMetadataFile extends FolderMetadataFile {
  constructor(directory: string, customFieldRegistry: CustomFieldRegistry) {
    super(
      directory,
      "Project",
      false,
      ".sprj",
      knownFieldDefinitions.project,
      customFieldRegistry
    );
    this.finishLoading();
  }
}

function NewGuid() {
  let sGuid = "";
  for (let i = 0; i < 32; i++) {
    sGuid += Math.floor(Math.random() * 0xf).toString(0xf);
  }
  return sGuid;
}

// // We store the media folder in a way that is unique to the title of the
// // project and the machine we are on.
// export function getMediaFolderOrEmptyForThisProjectAndMachine() {
//   if (sCurrentProject === null) {
//     throw new Error(
//       "getMediaFolderOrEmptyForThisProjectAndMachine() called when sCurrentProject is null"
//     );
//   }
//   // Note, we'd rather have an id that cannot change, but don't have one to
//   // work with at the moment.
//   const id = sCurrentProject.properties.getTextStringOrEmpty("title");
//   if (!id) {
//     NotifyWarning("The title for this project is empty.");
//     return "";
//   }
//   return getMediaFolderOrEmptyForProjectAndMachine(id);
// }
// export function setMediaFolderOrEmptyForThisProjectAndMachine(path: string) {
//   if (sCurrentProject === null) {
//     throw new Error(
//       "setMediaFolderOrEmptyForThisProjectAndMachine() called when sCurrentProject is null"
//     );
//   }
//   if (!path) {
//     throw new Error(
//       "setMediaFolderOrEmptyForThisProjectAndMachine() called with empty path"
//     );
//   }

//   // Note, we'd rather have an id that cannot change, but don't have one to
//   // work with at the moment.
//   const id = sCurrentProject.properties.getTextStringOrEmpty("title");
//   if (!id) {
//     NotifyWarning("The title for this project is empty.");
//     return "";
//   }
//   return setMediaFolderOrEmptyForProjectAndMachine(id, path);
// }
