import * as fs from "fs-extra";
import { makeObservable, observable, runInAction } from "mobx";
import * as mobx from "mobx";
import * as Path from "path";
import { Session } from "./Session/Session";
import { Folder, IFolderType, FolderGroup } from "../Folder/Folder";
import { Person } from "./Person/Person";
import { File, Contribution } from "../file/File";
import { ProjectDocuments } from "./ProjectDocuments";
const sanitize = require("sanitize-filename");
import { AuthorityLists } from "./AuthorityLists/AuthorityLists";
import * as remote from "@electron/remote";
import {
  asyncTrash,
  asyncTrashWithContext
} from "../../other/crossPlatformUtilities";
import { FolderMetadataFile } from "../file/FolderMetaDataFile";
import { EncounteredVocabularyRegistry } from "./EncounteredVocabularyRegistry";
import { FieldDefinition } from "../field/FieldDefinition";
import { t } from "@lingui/macro";
import { analyticsEvent } from "../../other/analytics";
import userSettings from "../../other/UserSettings";
import { LanguageFinder } from "../../languageFinder/LanguageFinder";
import * as Sentry from "@sentry/browser";

import genres from "./Session/genres.json";

import {
  fieldDefinitionsOfCurrentConfig,
  prepareGlobalFieldDefinitionCatalog
} from "../field/ConfiguredFieldDefinitions";
import { duplicateFolder } from "../Folder/DuplicateFolder";
import { ShowMessageDialog } from "../../components/ShowMessageDialog/MessageDialog";
import { ShowDeleteDialog } from "../../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import {
  NotifyError,
  NotifyException,
  NotifyNoBigDeal,
  NotifyWarning
} from "../../components/Notify";
import { setCurrentProjectId } from "./MediaFolderAccess";
import { CapitalCase } from "../../other/case";
import { IChoice } from "../field/Field";

let sCurrentProject: Project | null = null;

export class ProjectHolder {
  private projectInternal: Project | null;

  constructor() {
    makeObservable<ProjectHolder, "projectInternal">(this, {
      projectInternal: observable
    });
  }

  public get project(): Project | null {
    return this.projectInternal;
  }
  public setProject(p: Project | null) {
    if (this.projectInternal && !this.projectInternal.loadingError) {
      this.projectInternal.saveAllFilesInFolder();
    }
    if (p == null) {
      //console.log("setting project to null");
      userSettings.PreviousProjectDirectory = null;
    } else {
      //console.log("setting project to " + p.directory);
    }
    this.projectInternal = p;
    sCurrentProject = p;
  }
}

export class Project extends Folder {
  public loadingError: string;

  // @observable
  // public sessions.selected: IFolderSelection;
  // @observable
  // public persons.selected: IFolderSelection;
  public sessions: FolderGroup = new FolderGroup();
  public persons: FolderGroup = new FolderGroup();

  public descriptionFolder: Folder;
  public otherDocsFolder: Folder;
  public authorityLists: AuthorityLists;
  public languageFinder: LanguageFinder;

  public get folderType(): IFolderType {
    return "project";
  }

  public static getDefaultContentLanguageCode() {
    const codeAndName =
      sCurrentProject === null
        ? ""
        : sCurrentProject.properties.getTextStringOrEmpty(
            "vernacularIso3CodeAndName"
          );

    return codeAndName.split(":")[0].trim();
  }

  // trying to find https://lameta.notion.site/Error-when-renaming-files-4943fd45037b45e2828ece3e9b80db48
  public getFolderNamesForDebugging(): string {
    return (
      "sessions: " +
      this.sessions.items
        .map((f) => this.getFolderNamesForOneFolder(f))
        .join(",") +
      "\r\npeople: " +
      this.persons.items
        .map((f) => this.getFolderNamesForOneFolder(f))
        .join(",")
    );
  }

  // trying to find https://lameta.notion.site/Error-when-renaming-files-4943fd45037b45e2828ece3e9b80db48
  private getFolderNamesForOneFolder(f: Folder): string {
    const metafileDir = Path.basename(
      Path.dirname(f.metadataFile!.metadataFilePath)
    );
    const folderName = Path.basename(f.directory);
    if (folderName === metafileDir) return folderName;
    throw Error(
      `metadatafile dir doesn't match the folder's dir ${folderName} ${metafileDir}`
    );
  }

  public getFolderArrayFromType(folderType: string): FolderGroup {
    // kinda hacky here. "session"-->"sessions", "person"-->"persons"
    return this[folderType + "s"];
  }
  public migrateFromPreviousVersions(): void {
    //nothing to do, yet
  }
  public findFolderById(
    folderType: IFolderType,
    id: string
  ): Folder | undefined {
    const folders = this.getFolderArrayFromType(folderType);

    return (folders as any).items.find((f) => f.importIdMatchesThisFolder(id));
  }

  public consoleLogAllIds(folderType: IFolderType) {
    const folders = this.getFolderArrayFromType(folderType);
    folders.items.forEach((f: Folder) => console.log(f.displayName));
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
  public get propertyForCheckingId(): string {
    throw new Error(
      "Did not expect propertyForCheckingId to be called on Project"
    );
  }
  private constructor(
    directory: string,
    metadataFile: FolderMetadataFile,
    files: File[],
    descriptionFolder: Folder,
    otherDocsFolder: Folder,
    customVocabularies: EncounteredVocabularyRegistry
  ) {
    super(directory, metadataFile, files, customVocabularies);

    makeObservable(this, {
      sessions: observable,
      persons: observable
    });

    if (this.properties.getTextStringOrEmpty("guid").length === 0) {
      //console.log("***adding guid");
      this.properties.addTextProperty("guid", NewGuid());
      this.wasChangeThatMobxDoesNotNotice();
    }

    if (this.properties.getTextStringOrEmpty("title").length === 0) {
      this.properties.setText("title", Path.basename(directory));
    }
    // Note, we'd rather have an id that cannot change, but don't have one to
    // work with at the moment.
    setCurrentProjectId(this.properties.getTextStringOrEmpty("guid"));

    // this.sessions.selected = new IFolderSelection();
    // this.persons.selected = new IFolderSelection();
    this.descriptionFolder = descriptionFolder;
    this.otherDocsFolder = otherDocsFolder;
    this.authorityLists = new AuthorityLists(() => {
      // review: does this stay up to date? Would it be better to just have
      // this be a function that gets called when we need it?
      const peopleWithPersonRecords = this.persons.items.map(
        (p) =>
          ({
            id: p[p.propertyForCheckingId],
            label: p.displayName,
            description: ""
          } as IChoice)
      );
      const peopleWithJustAName = this.customVocabularies
        .getChoices("contributor")
        .map(
          (c) =>
            ({
              id: c,
              label: c,
              description: "❓"
            } as IChoice)
        )
        .filter(
          (c) =>
            !peopleWithPersonRecords.some(
              (p) => p.label.toLowerCase() === c.label.toLowerCase()
            )
        );
      return peopleWithPersonRecords.concat(peopleWithJustAName);
    });

    this.customVocabularies.setup("contributor", CapitalCase);
    this.setupProtocolChoices();
    this.setupGenreDefinition();

    this.knownFields = fieldDefinitionsOfCurrentConfig.project; // for csv export

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
      const customVocabularies = new EncounteredVocabularyRegistry();
      const metadataFile = new ProjectMetadataFile(
        directory,
        customVocabularies
      );

      const descriptionFolder = ProjectDocuments.fromDirectory(
        directory,
        "DescriptionDocuments",
        customVocabularies
      );

      const otherDocsFolder = ProjectDocuments.fromDirectory(
        directory,
        "OtherDocuments",
        customVocabularies
      );

      const files = this.loadChildFiles(
        directory,
        metadataFile,
        customVocabularies
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
        customVocabularies
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
            project.customVocabularies
          );
          project.sessions.items.push(session);
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
            project.customVocabularies,
            // note: we have to use a fat arrow thing here in order to bind the project to the method, since we are in a static method at the moment
            (o, n) =>
              project.updateSessionReferencesToPersonWhenIdChanges(o, n),
            project.languageFinder
          );
          project.persons.items.push(person);
        }
        // else ignore it
      });

      project.sessions.selectedIndex =
        project.sessions.items.length > 0 ? 0 : -1;
      project.persons.selectedIndex = project.persons.items.length > 0 ? 0 : -1;

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
      this.customVocabularies,
      // note: we have to use a fat arrow thing here in order to bind the project to the method, since we are in a static method at the moment
      (o, n) => this.updateSessionReferencesToPersonWhenIdChanges(o, n),
      this.languageFinder
    );
  }

  public selectFolder(folder: Folder) {
    this.sessions.selectedIndex = this.sessions.items.findIndex(
      (s) => s === folder
    );
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
  public makeFolderForImport(folderType: IFolderType): Folder {
    let dir: string;
    switch (folderType) {
      case "session": {
        const dir = this.getUniqueFolder(
          Path.join(this.directory, "Sessions"), // we don't localize the directory name.
          t`New Session`
        );
        //const metadataFile = new FolderMetadataFile(dir, "Session", ".session");
        const session = Session.fromDirectory(dir, this.customVocabularies);
        session.properties.setText("id", Path.basename(dir));
        // no, not yet this.sessions.items.push(session);
        // no, not yet this.sessions.selected.index = this.sessions.items.length - 1;
        analyticsEvent("Create", "Create Session From Import");
        return session;
        break;
      }
      case "person": {
        const dir = this.getUniqueFolder(
          Path.join(this.directory, "People"), // we don't localize the directory name.
          t`New Person`
        );
        const person = this.makePersonFromDirectory(dir);
        person.properties.setText("name", Path.basename(dir));
        analyticsEvent("Create", "Create Person From Import");
        return person;
      }
      default:
        throw Error(
          "Unexpected folderType on makeFolderForImport: " + folderType
        );
    }
  }

  public finishFolderImport(folder: Folder) {
    folder.migrateFromPreviousVersions();
    this.getFolderArrayFromType(folder.folderType).items.push(folder as any);
    //no: wait until we have imported them all. Importer will then select one. // this.sessions.selected.index = this.sessions.items.length - 1;
  }

  public addSession(): Session {
    const dir = this.getUniqueFolder(
      Path.join(this.directory, "Sessions"), // we don't localize the directory name.
      t`New Session`
    );
    //const metadataFile = new FolderMetadataFile(dir, "Session", ".session");
    const session = Session.fromDirectory(dir, this.customVocabularies);
    session.properties.setText("id", Path.basename(dir));
    this.sessions.items.push(session);
    this.sessions.selectedIndex = this.sessions.items.length - 1;
    analyticsEvent("Create", "Create Session");
    return session;
  }
  public duplicateCurrentSession() {
    const session = this.sessions.items[this.sessions.selectedIndex];
    const { success, metadataFilePath, directory } = duplicateFolder(session);
    if (success) {
      const newSession = Session.fromDirectory(
        directory,
        this.customVocabularies
      );
      newSession.properties.setText("id", Path.basename(directory));
      this.sessions.items.push(newSession);
      this.sessions.selectedIndex = this.sessions.items.length - 1;
      analyticsEvent("Duplicate", "Duplicate Session");
    }
  }
  public duplicateCurrentPerson() {
    const person = this.persons.items[this.persons.selectedIndex];
    const { success, metadataFilePath, directory } = duplicateFolder(person);
    if (success) {
      const newPerson = this.setupPerson(directory);
      newPerson.properties.setText("name", Path.basename(directory));
      this.persons.items.push(newPerson);
      this.persons.selectedIndex = this.persons.items.length - 1;
      analyticsEvent("Duplicate", "Duplicate person");
    }
  }

  setupPerson(dir: string): Person {
    return Person.fromDirectory(
      dir,
      this.customVocabularies,
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
    this.persons.items.push(person);
    person.nameMightHaveChanged();
    person.saveFolderMetaData;
    this.persons.selectedIndex = this.persons.items.length - 1;
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
    mobx.reaction(
      () => {
        return {
          protocol:
            this.properties.getTextField("accessProtocol").textHolder
              .textInDefaultLanguage,
          customChoices: this.properties.getTextStringOrEmpty(
            "customAccessChoices"
          )
        };
      },
      ({ protocol, customChoices }) => {
        console.log("accessProtocol changed to " + protocol);
        this.authorityLists.setAccessProtocol(protocol, customChoices);
      }
    );
    mobx.reaction(
      () => this.properties.getValueOrThrow("accessProtocol").text,
      (newValue) =>
        //      .textHolder.map.intercept((change) => { mobx6 doesn't have this intercept
        this.authorityLists.setAccessProtocol(
          newValue,
          this.properties.getTextStringOrEmpty("customAccessChoices")
        )
    );
    mobx.reaction(
      () => this.properties.getValueOrThrow("customAccessChoices").text,
      (newValue) => {
        const currentProtocol =
          this.properties.getTextStringOrEmpty("accessProtocol");
        // a problem with this is that it's going going get called for every keystroke in the Custom Access Choices box
        this.authorityLists.setAccessProtocol(currentProtocol, newValue);
      }
    );
    // this.properties
    //   .getValueOrThrow("customAccessChoices")
    //    .textHolder.map.intercept((change) => {
    //     const currentProtocol = this.properties.getTextStringOrEmpty(
    //       "accessProtocol"
    //     );
    //     // a problem with this is that it's going going get called for every keystrock in the Custom Access Choices box
    //     this.authorityLists.setAccessProtocol(
    //       currentProtocol,
    //       change.newValue as string
    //     );
    //     return change;
    //   });
  }

  private setupGenreDefinition() {
    const genreChoices = genres.map((g: any) => {
      return {
        ...g,
        // bit of a mismatch in the naming
        description: g.definition
      };
    });
    console.assert(genreChoices.length > 0);

    const genreFieldDefinition = fieldDefinitionsOfCurrentConfig.session.find(
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
        buttonText: "OK"
      });
      return false;
    } else {
      return true;
    }
  }
  public validateSessionId(session: Session, id: string): boolean {
    return this.validateFieldThatControlsFolderName(
      this.sessions.items,
      session,
      id,
      t`ID`,
      t`Session`
    );
  }
  public validatePersonFullName(person: Person, name: string): boolean {
    return this.validateFieldThatControlsFolderName(
      this.persons.items,
      person,
      name,
      t`Full Name`,
      t`Person`
    );
  }
  public validatePersonCode(person: Person, code: string): boolean {
    if (
      code.trim().length > 0 &&
      this.persons.items.some(
        (p) => p !== person && p.wouldCollideWithIdFields(code)
      )
    ) {
      remote.dialog
        .showMessageBox({
          title: "lameta",
          message: t`There is already a Person with that name or code.`
        })
        .then(() => {});
      return false;
    }
    return true;
  }
  public saveAllFilesInFolder() {
    this.saveFolderMetaData();
    for (const f of this.sessions.items) {
      // this gets called when we lose focus, and if we're in the process of deleting, then we don't want to save
      if (!f.beingDeleted) f.saveAllFilesInFolder(false);
    }
    for (const f of this.persons.items) {
      if (!f.beingDeleted) f.saveAllFilesInFolder(false);
    }
  }

  public haveSelectedSession(): boolean {
    return this.sessions.selectedIndex >= 0;
  }

  public haveSelectedPerson(): boolean {
    return this.persons.selectedIndex >= 0;
  }

  public deleteCurrentSession() {
    const session = this.sessions.items[this.sessions.selectedIndex] as Session;
    ShowDeleteDialog(`"${session.id}"`, () => {
      this.deleteFolder(session);
    });
  }
  public deleteMarkedFolders(folderType: IFolderType) {
    const folders = this.getFolderArrayFromType(folderType);
    ShowDeleteDialog(
      `${folders.countOfMarkedFolders()} Items and all their contents`,
      async () => {
        const originalFolders = folders.items.slice();

        const isFilled = <T extends object>(
          v: PromiseSettledResult<T>
        ): v is PromiseFulfilledResult<T> => v.status === "fulfilled";

        // attempt the directory deletions
        const deletionPromises = new Array<
          Promise<{ succeeded: boolean; path: string; context: Folder }>
        >();
        originalFolders
          .filter((s) => s.marked)
          .forEach((folder) => {
            folder.beingDeleted = true; // prevent trying to save if lameta loses focus
            const p = asyncTrashWithContext<Folder>(folder.directory, folder);
            deletionPromises.push(p);
          });

        const deletionPromiseResults = await Promise.allSettled(
          deletionPromises
        );
        // for each folder that was deleted, remove it from the array
        runInAction(() => {
          deletionPromiseResults.forEach((p) => {
            const fp = p as PromiseFulfilledResult<{
              succeeded: boolean;
              path: string;
              context: Folder;
            }>;
            if (isFilled(p)) {
              const folder = fp?.value.context;
              if (p.value.succeeded) {
                // remove this folder from the array
                folders.items.splice(folders.items.indexOf(folder), 1);
              } else {
                folder.beingDeleted = false;
                NotifyWarning(`Could not delete ${folder.directory}`);
              }
            } else {
              NotifyError(`Unexpected error in deletion promise`); // we do a try catch so it should not be possible to get an unfufilled promise
            }
          });
          folders.selectedIndex = folders.items.length > 0 ? 0 : -1;
        });

        runInAction(() => {
          folders.items
            .filter((s) => s.marked)
            .filter((s) =>
              deletionPromiseResults.some(
                (r) => isFilled(r) && r.value.path === s.directory
              )
            )
            .filter((s) =>
              deletionPromiseResults.some(
                (r) => isFilled(r) && r.value.succeeded
              )
            )
            .forEach((folder) => {
              // remove this folder from the array
              folders.items.splice(folders.items.indexOf(folder), 1);
              folder.wasDeleted = true;
            });
          folders.selectedIndex = folders.items.length > 0 ? 0 : -1;
        });
      }
    );
  }
  public getOrCreatePerson(name: string): Person {
    if (!name || !name.trim()) {
      throw new Error("getOrCreatePerson() given an empty name");
    }
    const lcName = name.trim().toLowerCase();
    const found = this.persons.items.find(
      (p) =>
        p.properties.getTextStringOrEmpty("name").toLowerCase() === lcName ||
        p.properties.getTextStringOrEmpty("code").toLowerCase() === lcName
    ) as Person;
    if (found) return found;
    else {
      return this.addPerson(name.trim());
    }
  }

  public async deleteFolder(folder: Folder, immediateWithoutTrash = false) {
    const folderType = folder.folderType;
    folderType;
    try {
      let didDelete = false;
      if (immediateWithoutTrash) {
        fs.rmdirSync(folder.directory, { recursive: true });
        didDelete = true;
      }

      //console.log("deleting " + folder.displayName);
      else didDelete = await (await asyncTrash(folder.directory)).succeeded;
      if (didDelete) {
        //console.log("Project did delete " + folder.directory);
        const folders = this.getFolderArrayFromType(folder.folderType);
        const index = folders.items.findIndex((f) => f === folder);
        // NB: the splice() actually causes a UI update, so we have to get the selection changed beforehand
        // in case we had the last one selected and now there won't be a selection at that index.

        const countAfterWeRemoveThisOne = folders.items.length - 1;
        folders.selectedIndex = countAfterWeRemoveThisOne > 0 ? 0 : -1;
        folders.items.splice(index, 1);
        folder.wasDeleted = true;
        //console.log(folders.items.length);
        // console.log(
        //   `Deleting folder index:${index}. selectedIndex:${
        //     this.getFolderArrayFromType(folderType).selectedIndex
        //   }`
        // );
        //this.getFolderArrayFromType(folderType).items.forEach((s) =>
        // console.log(
        //   `after folder deletion, this folder remains ${s.displayName}`
        // )
        //);
      } else throw Error("Failed to delete folder.");
    } catch (e) {
      console.log(e);
      NotifyException(e, "Error trying to delete folder.");
    }
  }

  // public deleteSession(session: Session) {
  //   try {
  //     if (trash(session.directory)) {
  //       const index = this.sessions.items.findIndex((s) => s === session);
  //       // NB: the splice() actually causes a UI update, so we have to get the selection changed beforehand
  //       // in case we had the last one selected and now there won't be a selection at that index.
  //       const countAfterWeRemoveThisOne = this.sessions.items.length - 1;
  //       this.sessions.selected.index = countAfterWeRemoveThisOne > 0 ? 0 : -1;
  //       this.sessions.items.splice(index, 1);
  //       // console.log(
  //       //   `Deleting session index:${index}. sessions.selected.index:${this.sessions.selected.index}`
  //       // );
  //       //this.sessions.forEach((s) => console.log(`remaining session ${s.id}`));
  //     } else throw Error("Failed to delete session.");
  //   } catch (e) {
  //     NotifyException(e, "Error trying to delete session.");
  //   }
  // }
  // public deletePerson(person: Person) {
  //   try {
  //     if (trash(person.directory)) {
  //       const index = this.persons.items.findIndex((s) => s === person);
  //       // NB: the splice() actually causes a UI update, so we have to get the selection changed beforehand
  //       // in case we had the last one selected and now there won't be a selection at that index.
  //       const countAfterWeRemoveThisOne = this.persons.items.length - 1;
  //       this.persons.selected.index = countAfterWeRemoveThisOne > 0 ? 0 : -1;
  //       this.persons.items.splice(index, 1);
  //       // console.log(
  //       //   `Deleting session index:${index}. sessions.selected.index:${this.sessions.selected.index}`
  //       // );
  //       //this.persons.forEach((s) => console.log(`remaining person ${s.id}`));
  //     } else throw Error("Failed to delete session.");
  //   } catch (e) {
  //     NotifyException(e, "Error trying to delete person.");
  //   }
  // }
  public deleteCurrentPerson() {
    const person = this.persons.items[this.persons.selectedIndex];
    ShowDeleteDialog(`"${person.displayName}"`, () => {
      // if (trash(person.directory)) {
      //   // NB: the splice() actually causes a UI update, so we have to get the selection changed beforehand
      //   // in case we had the last one selected and now there won't be a selection at that index.
      //   const countAfterWeRemoveThisOne = this.persons.items.length - 1;
      //   const indexToDelete = this.persons.selected.index;
      //   this.persons.selected.index = countAfterWeRemoveThisOne > 0 ? 0 : -1;
      //   this.persons.items.splice(indexToDelete, 1);
      // }
      this.deleteFolder(person);
    });
  }

  public findPerson(name: string): Person | undefined {
    return this.persons.items.find((p: Person) =>
      p.referenceIdMatches(name)
    ) as Person;
  }

  // called by Person when name or code changes
  // To see where this is used, search for updateExternalReferencesToThisPerson
  public updateSessionReferencesToPersonWhenIdChanges(
    oldId: string,
    newId: string
  ): void {
    this.sessions.items.forEach((session: Session) =>
      session.updateSessionReferencesToPersonWhenIdChanges(oldId, newId)
    );
  }

  public getContributionsMatchingPerson(id: string): Contribution[] {
    const lowerCaseName = id.toLocaleLowerCase();
    const arraysOfMatchingContributions = this.sessions.items.map(
      (session: Session) => {
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
      }
    );

    //flatten
    return [].concat.apply([], arraysOfMatchingContributions);
  }

  // public getSessionPeopleMatchingPersonName(personName: string): Session[] {
  //   const lowerCaseName = personName.toLocaleLowerCase();
  //   return this.sessions.items.filter(session =>
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

  // used only by unit tests
  public setContentLanguageCodeAndName(code: string, name: string) {
    this.properties.setText("vernacularIso3CodeAndName", `${code}:${name}`);
  }
  public getContentLanguageCodeAndName():
    | {
        iso639_3: string;
        englishName: string;
      }
    | undefined {
    const projectDefaultContentLanguage: string =
      this.properties.getTextStringOrEmpty("vernacularIso3CodeAndName");

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
  constructor(
    directory: string,
    customVocabularies: EncounteredVocabularyRegistry
  ) {
    // here we have a bootstrapping problem; we need to know the name
    // of the selected configuration
    // before making the metadataFile for this project, but (the way things
    // are currently structured) we need to know the configuration
    // before we can make the metadataFile for this project.
    const configuration =
      ProjectMetadataFile.peekIntoSprjForConfigurationName(directory);
    prepareGlobalFieldDefinitionCatalog(configuration);

    super(
      directory,
      "Project",
      false,
      ".sprj",
      fieldDefinitionsOfCurrentConfig.project,
      customVocabularies
    );
    this.finishLoading();
  }

  // peek into the xml to get the configuration we're supposed to be using
  // TODO: is this the right approach
  private static peekIntoSprjForConfigurationName(directory: string): string {
    const name = Path.basename(directory);
    const metadataPath = Path.join(directory, name + ".sprj");
    if (!fs.existsSync(metadataPath)) {
      return "default";
    }

    // read in the metadataPath xml file and then use a regex to extract the value of the AccessProtocol element.
    const contents = fs.readFileSync(metadataPath, "utf8");
    // TODO: should we migrate? Probably duplicate for backwards compat for a while?
    // TODO: change name to "archiveRepository" or "configuration", for now, using the existing AccessProtocol

    const regex = /<AccessProtocol>(.*)<\/AccessProtocol>/gm;
    return regex.exec(contents)?.[1] || "default";
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
