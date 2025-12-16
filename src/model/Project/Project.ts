import JSON5 from "json5";
import * as fs from "fs-extra";
import { makeObservable, observable, runInAction } from "mobx";
import * as mobx from "mobx";
import * as Path from "path";
import { getIdValidationMessageOrUndefined, Session } from "./Session/Session";
import { Folder, IFolderType } from "../Folder/Folder";
import { FolderGroup } from "../Folder/FolderGroup";
import { Person } from "./Person/Person";
import { File, Contribution } from "../file/File";
import { ProjectDocuments } from "./ProjectDocuments";
import { AuthorityLists } from "./AuthorityLists/AuthorityLists";
import * as remote from "@electron/remote";
import {
  asyncTrash,
  asyncTrashWithContext
} from "../../other/crossPlatformUtilities";
import { FolderMetadataFile } from "../file/FolderMetaDataFile";
import { languageSlotColors } from "../../containers/theme";
import { EncounteredVocabularyRegistry } from "./EncounteredVocabularyRegistry";
import { FieldDefinition } from "../field/FieldDefinition";
import { t } from "@lingui/macro";
import { analyticsEvent } from "../../other/analytics";
import userSettings from "../../other/UserSettings";
import {
  LanguageFinder,
  staticLanguageFinder
} from "../../languageFinder/LanguageFinder";
import { LanguageSlot } from "../field/TextHolder";
// FIXED: Import safeCaptureException instead of using Sentry directly
// CONTEXT: This prevents E2E test failures from Sentry RendererTransport errors
import { safeCaptureException } from "../../other/errorHandling";

import genres from "./Session/genres.json";

import {
  fieldDefinitionsOfCurrentConfig,
  prepareGlobalFieldDefinitionCatalog
} from "../field/ConfiguredFieldDefinitions";
import { duplicateFolder } from "../Folder/DuplicateFolder";
import { ShowDeleteDialog } from "../../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import {
  NotifyError,
  NotifyException,
  NotifyNoBigDeal,
  NotifyWarning
} from "../../components/Notify";
import { setCurrentProjectId } from "./MediaFolderAccess";
import { capitalCase } from "../../other/case";
import { IChoice } from "../field/Field";
import { locateDependencyForFilesystemCall } from "../../other/locateDependency";
import {
  GetOtherConfigurationSettings,
  SetOtherConfigurationSettings
} from "./OtherConfigurationSettings";
import { sanitizeForArchive } from "../../other/sanitizeForArchive";
import { initializeSanitizeForArchive } from "../../other/sanitizeForArchive";

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
      // removed Apri 2024 but not sure userSettings.PreviousProjectDirectory = null;
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

  /**
   * Returns true if the project has slash-syntax multilingual fields
   * that need to be converted to tagged format.
   * This is persisted in the project file.
   */
  public get multilingualConversionPending(): boolean {
    const value = this.properties.getTextStringOrEmpty(
      "multilingualConversionPending"
    );
    return value === "true";
  }

  /**
   * Set whether the project has pending multilingual conversion.
   * Saves the project metadata after setting.
   */
  public setMultilingualConversionPending(pending: boolean): void {
    this.properties.setText(
      "multilingualConversionPending",
      pending ? "true" : "false"
    );
    this.saveFolderMetaData();
  }

  public get folderType(): IFolderType {
    return "project";
  }

  public static getDefaultSubjectLanguages() {
    return sCurrentProject === null
      ? ""
      : sCurrentProject.properties.getTextStringOrEmpty(
          "collectionSubjectLanguages"
        );
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
    // nothing here but see migrate() on ProjectMetadataFile
  }

  /**
   * Check if the current archive configuration has any multilingual fields.
   */
  public static configurationHasMultilingualFields(): boolean {
    const areas = ["project", "session", "person"] as const;
    for (const area of areas) {
      const definitions = fieldDefinitionsOfCurrentConfig[area] || [];
      for (const def of definitions) {
        if (def.multilingual === true) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Detect if sessions have slash-syntax content in multilingual fields.
   * Checks up to the first 4 sessions; returns true if ANY has slash-syntax.
   */
  public detectSlashSyntaxInSessions(): boolean {
    const sessionsToCheck = this.sessions.items.slice(0, 4);
    if (sessionsToCheck.length === 0) {
      return false;
    }

    for (const session of sessionsToCheck) {
      const fields = session.properties.values();
      for (const field of fields) {
        if (field.definition?.multilingual && field.looksLikeSlashSyntax?.()) {
          return true; // Found at least one session with slash-syntax
        }
      }
    }

    return false;
  }

  /**
   * Check and set multilingualConversionPending based on archive config and session content.
   * Called during project load and when archive configuration changes.
   *
   * If pending is already "true", we don't change it.
   * If pending is "false" or unset, we check for slash-syntax content and set to true if found.
   * This allows re-detection if new slash-syntax content is added after a previous migration.
   */
  public checkAndSetMultilingualConversionPending(): void {
    const existingValue = this.properties.getTextStringOrEmpty(
      "multilingualConversionPending"
    );
    const allProps = this.properties
      .values()
      .map((f) => `${f.key}=${f.text}`)
      .join(", ");
    console.log(
      `[Project] checkAndSetMultilingualConversionPending: existingValue="${existingValue}", metadataFile=${this.metadataFile?.metadataFilePath}`
    );
    console.log(`[Project] All properties: ${allProps}`);

    // If already true, don't change it - the user hasn't completed migration yet
    if (existingValue === "true") {
      console.log(`[Project] Already set to "true", not changing`);
      return;
    }

    // Check if configuration has multilingual fields and sessions have slash syntax
    // This runs even if existingValue is "false" to catch new slash-syntax content
    const hasMultilingualFields = Project.configurationHasMultilingualFields();
    const hasSlashSyntax = this.detectSlashSyntaxInSessions();
    console.log(
      `[Project] hasMultilingualFields=${hasMultilingualFields}, hasSlashSyntax=${hasSlashSyntax}`
    );
    if (hasMultilingualFields && hasSlashSyntax) {
      console.log(`[Project] Setting multilingualConversionPending to true`);
      this.setMultilingualConversionPending(true);
    }
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

  public static getDefaultWorkingLanguages(): string {
    return sCurrentProject === null
      ? ""
      : sCurrentProject.properties.getTextStringOrEmpty(
          "collectionWorkingLanguages"
        );
  }

  /**
   * Returns the raw metadata languages string from the project.
   * Used for multilingual text field language slots (UI, export, etc.)
   * This is separate from working languages which describe what languages
   * are used in the recordings/documentation work.
   */
  public static getDefaultMetadataLanguages(): string {
    return sCurrentProject === null
      ? ""
      : sCurrentProject.properties.getTextStringOrEmpty("metadataLanguages");
  }

  // Color palette for language slots - imported from theme
  public static readonly SLOT_COLORS = languageSlotColors;

  /**
   * Parses a working languages string into LanguageSlot objects.
   * Normalizes codes to BCP47 preferred format (2-letter when available).
   * Exported for testing.
   * @param workingLanguages Format: "eng:English;spa:Spanish" or "eng;spa"
   */
  public static parseWorkingLanguagesToSlots(
    workingLanguages: string
  ): LanguageSlot[] {
    if (!workingLanguages || workingLanguages.trim() === "") {
      // Fallback to English - use "en" per BCP47
      return [
        {
          tag: "en",
          label: "en",
          name: "English",
          color: Project.SLOT_COLORS[0]
        }
      ];
    }

    // Format is "eng:English;spa:Spanish" or just "eng;spa"
    const entries = workingLanguages.split(";").filter((e) => e.trim() !== "");
    const seenTags = new Set<string>();
    const slots: LanguageSlot[] = [];

    entries.forEach((entry, index) => {
      const parts = entry.split(":");
      const rawCode = parts[0].trim().toLowerCase();
      // Normalize to BCP47 preferred format (2-letter when available)
      const code = staticLanguageFinder
        ? staticLanguageFinder.normalizeToBcp47(rawCode)
        : rawCode;
      // Use provided name, or look up the localized name from the language finder
      let name: string;
      if (parts.length > 1 && parts[1].trim()) {
        name = parts[1].trim();
      } else if (staticLanguageFinder) {
        name =
          staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(code);
      } else {
        name = code.toUpperCase();
      }

      // Get the autonym (language name in its own script)
      const autonym = staticLanguageFinder
        ? staticLanguageFinder.getAutonym(code)
        : undefined;

      // Skip duplicates (e.g., if both "en" and "eng" are in the list)
      if (seenTags.has(code)) return;
      seenTags.add(code);

      // Use first 2 chars for label
      const label = code.length >= 2 ? code.substring(0, 2) : code;
      slots.push({
        tag: code,
        label: label,
        name: name,
        autonym: autonym,
        color: Project.SLOT_COLORS[slots.length % Project.SLOT_COLORS.length]
      });
    });

    return slots;
  }

  /**
   * Returns an array of LanguageSlot objects for the project's metadata languages.
   * Each slot includes a tag, label, name, and auto-assigned color.
   * Falls back to English if no metadata languages are configured.
   * Used for multilingual text fields throughout the UI and export.
   */
  public static getMetadataLanguageSlots(): LanguageSlot[] {
    const metadataLangs = Project.getDefaultMetadataLanguages();
    return Project.parseLanguagesToSlots(metadataLangs);
  }

  /**
   * Parses a languages string into LanguageSlot objects.
   * Normalizes codes to BCP47 preferred format (2-letter when available).
   * Exported for testing.
   * @param languages Format: "eng:English;spa:Spanish" or "eng;spa"
   */
  public static parseLanguagesToSlots(languages: string): LanguageSlot[] {
    return Project.parseWorkingLanguagesToSlots(languages);
  }

  /**
   * Returns true if the current project has slash-syntax multilingual fields
   * that need to be converted to tagged format.
   */
  public static getMultilingualConversionPending(): boolean {
    return sCurrentProject?.multilingualConversionPending ?? false;
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
            // Check if this contributor matches any person by name OR code
            // This handles the case where a contributor was added by full name
            // but the person record has a code (which becomes their displayName)
            !this.persons.items.some((person: Person) =>
              person.referenceIdMatches(c.label)
            )
        );
      return peopleWithPersonRecords.concat(peopleWithJustAName);
    });

    this.customVocabularies.setup(
      "contributor",
      (x) => x /* ELAR asked for no changes ever */
    );
    this.setupProtocolChoices();
    this.setupGenreDefinition();

    this.knownFields = fieldDefinitionsOfCurrentConfig.project; // for csv export

    this.languageFinder = new LanguageFinder(
      () => this.getFirstSubjectLanguageCodeAndName() // REVIEW now that we have multiple languages
    );
    this.loadSettingsFromConfiguration();

    // Note: Role-based People search is now handled inside FolderSearchTermsIndex
    // via getCurrentProject() to avoid cross-layer hooks.

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
    return this.properties.getTextStringOrEmpty("archiveConfigurationName");
  }
  public static fromDirectory(directory: string): Project {
    const startTime = performance.now();
    let sessionCount = 0;
    let personCount = 0;
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
          sessionCount++;
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
          personCount++;
        }
        // else ignore it
      });

      project.sessions.selectedIndex =
        project.sessions.items.length > 0 ? 0 : -1;
      project.sessions.selectedIndex =
        project.sessions.items.length > 0 ? 0 : -1;
      project.persons.selectedIndex = project.persons.items.length > 0 ? 0 : -1;

      // Check for slash-syntax multilingual fields that need conversion
      project.checkAndSetMultilingualConversionPending();

      const elapsed = performance.now() - startTime;
      console.log(
        `[Project.fromDirectory] Loaded ${sessionCount} sessions + ${personCount} people in ${elapsed.toFixed(
          0
        )}ms (sync)`
      );

      //project.files[0].save();
      // tslint:disable-next-line:no-unused-expression
      return project;
    } catch (err) {
      // FIXED: Use safeCaptureException instead of direct Sentry.captureException(err)
      // PROBLEM: Direct Sentry calls in E2E tests caused auto-initialization and
      // RendererTransport errors when window.__electronCall wasn't available
      // SOLUTION: safeCaptureException checks E2E environment before calling Sentry
      safeCaptureException(err);
      console.error(err);
      // tslint:disable-next-line: no-object-literal-type-assertion
      return { loadingError: err.message } as Project;
    }
  }

  // Count how many sessions and people folders exist without loading them
  public static countFoldersInDirectory(directory: string): {
    sessionCount: number;
    personCount: number;
  } {
    let sessionCount = 0;
    let personCount = 0;

    const sessionsDir = Path.join(directory, "Sessions");
    if (fs.existsSync(sessionsDir)) {
      const sessionEntries = fs.readdirSync(sessionsDir, "utf8");
      sessionCount = sessionEntries.filter((childName) => {
        const dir = Path.join(sessionsDir, childName);
        return fs.existsSync(dir) && fs.lstatSync(dir).isDirectory();
      }).length;
    }

    const peopleDir = Path.join(directory, "People");
    if (fs.existsSync(peopleDir)) {
      const peopleEntries = fs.readdirSync(peopleDir, "utf8");
      personCount = peopleEntries.filter((childName) => {
        const dir = Path.join(peopleDir, childName);
        return fs.existsSync(dir) && fs.lstatSync(dir).isDirectory();
      }).length;
    }

    return { sessionCount, personCount };
  }

  // Set to true to skip the async yielding and measure pure loading time
  // Set to false (default) to yield to UI after each item for progress updates
  // TIMING TEST: Change to true, rebuild, and compare console output
  private static SKIP_ASYNC_YIELD_FOR_TIMING = false;

  // How many items to process before yielding to the UI
  // Higher = faster loading but less responsive progress bar
  // Lower = smoother progress but slower overall
  private static YIELD_BATCH_SIZE = 5;

  // Async project loading with progress reporting
  // Uses async generator pattern to allow UI updates between items
  public static async fromDirectoryAsync(
    directory: string,
    onProgress?: (progress: {
      phase: "sessions" | "people";
      overallCurrent: number;
      overallTotal: number;
    }) => void
  ): Promise<Project> {
    const startTime = performance.now();
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

      const project = new Project(
        directory,
        metadataFile,
        files,
        descriptionFolder,
        otherDocsFolder,
        customVocabularies
      );
      sCurrentProject = project;

      // Load sessions with progress
      const sessionsDir = Path.join(directory, "Sessions");
      fs.ensureDirSync(sessionsDir);
      const sessionEntries = fs.readdirSync(sessionsDir, "utf8");
      const sessionDirs = sessionEntries.filter((childName) => {
        const dir = Path.join(sessionsDir, childName);
        return fs.lstatSync(dir).isDirectory();
      });

      // Pre-count people directories for overall progress calculation
      const peopleDir = Path.join(directory, "People");
      fs.ensureDirSync(peopleDir);
      const peopleEntries = fs.readdirSync(peopleDir, "utf8");
      const peopleDirs = peopleEntries.filter((childName) => {
        const dir = Path.join(peopleDir, childName);
        return fs.lstatSync(dir).isDirectory();
      });

      const overallTotal = sessionDirs.length + peopleDirs.length;

      for (let i = 0; i < sessionDirs.length; i++) {
        const childName = sessionDirs[i];
        const dir = Path.join(sessionsDir, childName);

        const session = Session.fromDirectory(dir, project.customVocabularies);
        project.sessions.items.push(session);

        // Yield to event loop every YIELD_BATCH_SIZE items to allow UI updates
        if (
          !this.SKIP_ASYNC_YIELD_FOR_TIMING &&
          (i + 1) % this.YIELD_BATCH_SIZE === 0
        ) {
          if (onProgress) {
            onProgress({
              phase: "sessions",
              overallCurrent: i + 1,
              overallTotal
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // Final progress update for sessions
      if (onProgress && sessionDirs.length > 0) {
        onProgress({
          phase: "sessions",
          overallCurrent: sessionDirs.length,
          overallTotal
        });
      }

      // Load people with progress
      for (let i = 0; i < peopleDirs.length; i++) {
        const childName = peopleDirs[i];
        const dir = Path.join(peopleDir, childName);

        const person = Person.fromDirectory(
          dir,
          project.customVocabularies,
          (o, n) => project.updateSessionReferencesToPersonWhenIdChanges(o, n),
          project.languageFinder
        );
        project.persons.items.push(person);

        // Yield to event loop every YIELD_BATCH_SIZE items to allow UI updates
        if (
          !this.SKIP_ASYNC_YIELD_FOR_TIMING &&
          (i + 1) % this.YIELD_BATCH_SIZE === 0
        ) {
          if (onProgress) {
            onProgress({
              phase: "people",
              overallCurrent: sessionDirs.length + i + 1,
              overallTotal
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      project.sessions.selectedIndex =
        project.sessions.items.length > 0 ? 0 : -1;
      project.persons.selectedIndex = project.persons.items.length > 0 ? 0 : -1;

      // Check for slash-syntax multilingual fields that need conversion
      project.checkAndSetMultilingualConversionPending();

      const elapsed = performance.now() - startTime;
      console.log(
        `[Project.fromDirectoryAsync] Loaded ${sessionDirs.length} sessions + ${
          peopleDirs.length
        } people in ${elapsed.toFixed(0)}ms` +
          (this.SKIP_ASYNC_YIELD_FOR_TIMING
            ? " (TIMING MODE - no UI yields)"
            : ` (with UI yields every ${this.YIELD_BATCH_SIZE} items)`)
      );

      return project;
    } catch (err) {
      safeCaptureException(err);
      console.error(err);
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
      name = baseName + i;
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
          sanitizeForArchive(t`New Session`)
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
          sanitizeForArchive(t`New Person`)
        );
        const person = this.makePersonFromDirectory(dir);
        person.properties.setText(
          "name",
          Path.basename(dir).replace(/_/g, " ")
        );
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
      sanitizeForArchive(t`New Session`)
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
      sanitizeForArchive(t`New Person`)
    );
    //const metadataFile = new FolderMetadataFile(dir, "Person", ".person");
    const person = this.setupPerson(dir);
    person.properties.setText(
      "name",
      name ?? Path.basename(dir).replace(/_/g, " ")
    );
    this.persons.items.push(person);
    person.nameMightHaveChanged();
    person.saveFolderMetaData;
    this.persons.selectedIndex = this.persons.items.length - 1;
    analyticsEvent("Create", "Create Person");
    return person;
  }

  private setupProtocolChoices() {
    console.log(
      "setting up protocol choices. archiveConfigurationName is " +
        this.properties.getTextStringOrEmpty("archiveConfigurationName")
    );
    this.authorityLists.setAccessProtocol(
      this.properties.getTextStringOrEmpty("archiveConfigurationName"),
      this.properties.getTextStringOrEmpty("customAccessChoices")
    );
    /* not needed anymore because we reopen the project when the archiveConfigurationName changes
    // when the user changes the chosen access protocol, we need to let the authorityLists
    // object know so that it can provide the correct set of choices to the Settings form.
    mobx.reaction(
      () => {
        return {
          protocol: this.properties.getTextStringOrEmpty(
            "archiveConfigurationName"
          ),
          customChoices: this.properties.getTextStringOrEmpty(
            "customAccessChoices"
          )
        };
      },
      ({ protocol, customChoices }) => {
        console.log("configurationName changed to " + protocol);
        this.authorityLists.setAccessProtocol(protocol, customChoices);
      }
    );

    
    mobx.reaction(
      () => this.properties.getValueOrThrow("archiveConfigurationName").text,
      (newValue) =>
        //      .textHolder.map.intercept((change) => { mobx6 doesn't have this intercept
        this.authorityLists.setAccessProtocol(
          newValue,
          this.properties.getTextStringOrEmpty("customAccessChoices")
        )
    );
    */
    mobx.reaction(
      () => this.properties.getValueOrThrow("customAccessChoices").text,
      (newValue) => {
        const currentProtocol = this.properties.getTextStringOrEmpty(
          "archiveConfigurationName"
        );
        // a problem with this is that it's going going get called for every keystroke in the Custom Access Choices box
        this.authorityLists.setAccessProtocol(currentProtocol, newValue);
      }
    );

    // this.properties
    //   .getValueOrThrow("customAccessChoices")
    //    .textHolder.map.intercept((change) => {
    //     const currentProtocol = this.properties.getTextStringOrEmpty(
    //       "archiveConfigurationName"
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

  // return undefined if there is no error
  protected getValidationMessageForFieldThatControlsFolderName(
    folderArray: Folder[],
    folder: Folder,
    value: string,
    fieldNameInUiLanguage: string,
    folderKind: string
  ): string | undefined {
    let msg = "";
    const wouldBeFolderName = sanitizeForArchive(value);

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
    return msg || undefined;
  }
  public getValidationMessageForSessionId(
    session: Session,
    id: string
  ): string | undefined {
    let msg = getIdValidationMessageOrUndefined(id);
    if (msg === undefined) {
      msg = this.getValidationMessageForFieldThatControlsFolderName(
        this.sessions.items,
        session,
        id,
        t`ID`,
        t`Session`
      );
    }
    return msg;
  }

  public getValidationMessageForPersonFullName(
    person: Person,
    name: string
  ): string | undefined {
    return this.getValidationMessageForFieldThatControlsFolderName(
      this.persons.items,
      person,
      name,
      t`Full Name`,
      t`Person`
    );
  }

  public getValidationMessageForPersonCode(
    person: Person,
    code: string
  ): string | undefined {
    if (
      code.trim().length > 0 &&
      this.persons.items.some(
        (p) => p !== person && p.wouldCollideWithIdFields(code)
      )
    ) {
      return t`There is already a Person with that name or code.`;
    }
    return undefined; // no problem
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

  public static getContributionsMatchingPersonStatic(
    personId: string
  ): Contribution[] {
    return sCurrentProject!.getContributionsMatchingPerson(personId);
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

  // used only by unit tests
  public setCollectionSubjectLanguages(content: string) {
    this.properties.setText("collectionSubjectLanguages", content);
  }

  private getFirstLanguageCodeAndName(fieldName: string):
    | {
        iso639_3: string;
        englishName: string;
      }
    | undefined {
    const languages: string = this.properties.getTextStringOrEmpty(fieldName);

    if (languages.trim().length === 0) {
      return undefined; // hasn't been defined yet, e.g. a new project
    }
    const firstCodeLangPair = languages.split(";")[0].trim();
    if (!firstCodeLangPair) {
      return undefined;
    }
    const parts = firstCodeLangPair.split(":");
    // In the degenerate case in which there was no ":" in the incoming xml element,
    // use the code as the name.
    const langName = parts.length > 1 ? parts[1] : parts[0];
    return {
      iso639_3: parts[0].trim().toLowerCase(),
      englishName: langName.trim()
    };
  }
  public getFirstSubjectLanguageCodeAndName():
    | {
        iso639_3: string;
        englishName: string;
      }
    | undefined {
    return this.getFirstLanguageCodeAndName("collectionSubjectLanguages");
  }

  public getWorkingLanguageName(): string | undefined {
    return this.getFirstLanguageCodeAndName("collectionWorkingLanguages")
      ?.englishName;
  }
  public getWorkingLanguageCode(): string | undefined {
    return this.getFirstLanguageCodeAndName("collectionWorkingLanguages")
      ?.iso639_3;
  }

  private loadSettingsFromConfiguration() {
    const factoryPath = locateDependencyForFilesystemCall(
      `archive-configurations/lameta/settings.json5`
    );
    SetOtherConfigurationSettings(
      JSON5.parse(fs.readFileSync(factoryPath, "utf8"))
    );

    // now see if there are any settings in the confuration that
    // can override the defaults

    const configurationName = this.properties.getTextStringOrEmpty(
      "archiveConfigurationName"
    );
    if (
      configurationName === "default" ||
      configurationName === undefined ||
      configurationName.trim() === ""
    ) {
      return;
    }
    const path = locateDependencyForFilesystemCall(
      `archive-configurations/${configurationName}/settings.json5`
    );

    if (!fs.existsSync(path)) {
      return;
    }
    // read in these settings and merge them with the defaults
    const settings = JSON5.parse(fs.readFileSync(path, "utf8"));
    SetOtherConfigurationSettings({
      ...GetOtherConfigurationSettings(),
      ...settings
    });
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
    const configurationName =
      ProjectMetadataFile.peekIntoSprjForConfigurationName(directory);
    prepareGlobalFieldDefinitionCatalog(configurationName);

    super(
      directory,
      "Project",
      false,
      ".sprj",
      fieldDefinitionsOfCurrentConfig.project,
      customVocabularies
    );

    this.finishLoading();
    this.migrate();
  }

  private migrate() {
    // if ArchiveConfigurationName is not found but ArchiveProtocol is, copy it over

    const archiveConfigurationName = this.properties.getTextStringOrEmpty(
      "archiveConfigurationName"
    );
    // the fields.json5 sets the default to "unknown"
    if (
      archiveConfigurationName.length === 0 ||
      archiveConfigurationName === "default"
    ) {
      const archiveProtocol =
        this.properties.getTextStringOrEmpty("AccessProtocol");
      if (archiveProtocol.length > 0) {
        this.properties.setText("archiveConfigurationName", archiveProtocol);
        // delete AccessProtocol
        this.properties.removeProperty("AccessProtocol");
      }
    }

    // Before lameta 3, we could store a single language for the vernacular. If we
    // find a file using that but no modern collectionSubjectLanguage, collectionSubjectLanguage
    // should be loaded with the value from VernacularISO3CodeAndName.
    // If instead we do have a non-empty collectionSubjectLanguage, then we should set
    // VernacularISO3CodeAndName to the first item in it.
    this.migrateLanguageField(
      "VernacularISO3CodeAndName", // note, uppercase because it is unknown to our field definitions, so it keeps the same case as the xml tag
      "collectionSubjectLanguages"
    );
    // same for the anlysis language
    this.migrateLanguageField(
      "AnalysisISO3CodeAndName", // note, uppercase because it is unknown to our field definitions, so it keeps the same case as the xml tag
      "collectionWorkingLanguages"
    );
  }

  private migrateLanguageField(legacySingle: string, modernMultiple: string) {
    if (this.properties.getTextStringOrEmpty(modernMultiple).length === 0) {
      this.properties.setText(
        modernMultiple,
        this.properties.getTextStringOrEmpty(legacySingle)
      );
    }
    // remove the legacy value if it is there
    this.properties.removeProperty(legacySingle);

    this.properties.removeProperty("VernacularISO3CodeAndName");

    // otheriwse, ignore the legacy value

    // else {
    //   const parts = this.properties
    //     .getTextStringOrEmpty(modernMultiple)
    //     .split(";");
    //   this.properties.setText(legacySingle, parts[0] || "");
    // }
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

    // Initially (up through v2), lameta only had an "Access Protocol", not the full set of configurations
    // that we have now (which include and access protocol).
    // Starting with lameta 3, we write to "ArchiveConfigurationName" & "Access Protocol" (for backwards compat).
    // We fall back to the old "AccessProtocol" if ArchiveConfigurationName is not found (written by an sayjmore or an older lameta).
    const regex =
      /<ArchiveConfigurationName>(.*)<\/ArchiveConfigurationName>/gm;
    let config = regex.exec(contents)?.[1];
    if (!config) {
      const legacyRegex = /<AccessProtocol>(.*)<\/AccessProtocol>/gm;
      config = legacyRegex.exec(contents)?.[1];
    }
    return config || "default";
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

export function archiveUsesImdi(): boolean {
  return sCurrentProject?.accessProtocol === "ELAR";
}
export function archiveLimitsToPortableCharacters(): boolean {
  // We don't know them all, so let's be conservative.
  // It appears that ELAR, PARADISEC, and REAP all have these restrictions.

  return !userSettings.IgnoreFileNamingRules; // normally false, dev can turn it on
}

initializeSanitizeForArchive(archiveLimitsToPortableCharacters);
