import { File, OtherFile } from "../file/File";
import { observable, makeObservable, runInAction } from "mobx";
import { Field } from "../field/Field";
import { FieldDefinition } from "../field/FieldDefinition";

import {
  NotifyMultipleProjectFiles,
  NotifyError,
  NotifyWarning,
  NotifyException,
  NotifyFileAccessProblem
} from "../../components/Notify";
import * as fs from "fs-extra";
import * as Path from "path";
import { FieldSet } from "../field/FieldSet";
import assert from "assert";
import {
  asyncTrash,
  getAllFilesSync
} from "../../other/crossPlatformUtilities";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { CopyManager, getExtension } from "../../other/CopyManager";
import { sanitizeForArchive } from "../../other/sanitizeForArchive";
import { sentryBreadCrumb } from "../../other/errorHandling";
import filesize from "filesize";
import { t } from "@lingui/macro";
import { FolderMetadataFile } from "../file/FolderMetaDataFile";
import { PatientFS } from "../../other/patientFile";
import { getMediaFolderOrEmptyForThisProjectAndMachine } from "../Project/MediaFolderAccess";
import { ShowDeleteDialog } from "../../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import temp from "temp";
import userSettingsSingleton from "../../other/UserSettings";

// There are two `FolderGroup` instances, one for projects and one for sessions.
export class FolderGroup {
  //NB: originally we just had this class extend an array, rather than having this property. That was nice for consumers.
  // However I was struggling to get mobx (v5) to observe the items then. Splitting it out solved the problem.
  public items: Folder[];

  public selectedIndex: number;

  constructor() {
    makeObservable(this, {
      items: observable,
      selectedIndex: observable
    });

    this.items = new Array<Folder>();
    this.selectedIndex = -1;
  }

  public selectFirstMarkedFolder() {
    const foundIndex = this.items.findIndex((f) => f.marked);
    if (foundIndex >= 0) this.selectedIndex = foundIndex;
  }

  public unMarkAll() {
    this.items.forEach((f) => {
      f.marked = false;
    });
  }
  public countOfMarkedFolders(): number {
    return this.items.filter((f) => f.marked).length;
  }
}

export type IFolderType =
  | "project"
  | "session"
  | "person"
  | "project documents";

// Project, Session, or Person
export abstract class Folder {
  // help with a hard to track down bug where folders are deleted but later something tries to save them.
  public wasDeleted = false;
  public beingDeleted = false;

  // Is the folder's checkbox ticked?
  public marked: boolean = false;

  public directory: string = "";
  public files: File[] = [];

  // file from this folder that is currently selected in the UI
  public selectedFile: File | null;

  public metadataFile: FolderMetadataFile | null;
  protected currentFileNameBase: string;
  protected customVocabularies: EncounteredVocabularyRegistry;

  public constructor(
    directory: string,
    metadataFile: FolderMetadataFile | null,
    files: File[],
    customVocabularies: EncounteredVocabularyRegistry
  ) {
    makeObservable(this, {
      marked: observable,
      files: observable,
      selectedFile: observable
    });

    this.customVocabularies = customVocabularies;
    this.directory = directory;
    this.metadataFile = metadataFile;
    this.files = files;
    this.selectedFile = metadataFile;
    //this.properties.addCustomProperty("color", "blue");
  }
  public get filePrefix(): string {
    return Path.basename(Path.basename(this.directory));
  }

  // Person overrides this to look at both the name and the code field
  public wouldCollideWithIdFields(value: string): boolean {
    return (
      value.trim().toLowerCase() ===
      this.textValueThatControlsFolderName().toLowerCase()
    );
  }
  public get /*overridden by subclasses*/ metadataFileExtensionWithDot(): string {
    return "--error--";
  }
  public get hasMoreFieldsTable(): boolean {
    return false;
  }

  public abstract importIdMatchesThisFolder(id: string): boolean;
  public abstract get folderType(): IFolderType;
  public abstract get propertyForCheckingId(): string;
  public abstract migrateFromPreviousVersions(): void;

  // the awkward things is that these Folder objects (Project/Session/Person) do
  // have one of their files that contains their properties, but it is natural
  // to think of these properties as belonging to the (Project/Session/Person) itself.
  // So for the time being, we're wrapping the properties of that first file so that
  // they are directly accessible via objects of this class.
  public get properties(): FieldSet {
    if (this.metadataFile) {
      return this.metadataFile.properties;
    } else {
      return new FieldSet(); //review... property document folders don't have properties
    }
  }

  // This is a stripped-down version of copyInOneFile. It takes File object instead
  // of a path, because the file is already a project File object. This might be a useful function
  // for a future "copy" user function, but
  // 1) we'd need to copy over all the meta data
  // 2) it is currently synchronous. If we change that, it will break tests so something would have to be done.
  public copyInOneProjectFileIfNotThereAlready(
    sourceFile: File,
    destDirectory: string
  ) {
    const destPath = Path.join(
      destDirectory,
      Path.basename(sourceFile.pathInFolderToLinkFileOrLocalCopy)
    );
    if (fs.existsSync(destPath)) {
      return;
    }

    // just for unit tests
    if (!fs.existsSync(sourceFile.pathInFolderToLinkFileOrLocalCopy))
      throw new Error(
        `copyInOneProjectFileIfNotThereAlready ${sourceFile.pathInFolderToLinkFileOrLocalCopy} doesn't exist.`
      );

    // note, I can't think of how the .meta file of the consent could be helpful, so
    // I'm not bothering to get it copied, or its contents preserved, except for size.
    fs.copyFileSync(sourceFile.pathInFolderToLinkFileOrLocalCopy, destPath);
    const destFile = new OtherFile(destPath, this.customVocabularies, true);
    destFile.addTextProperty("size", sourceFile.getTextProperty("size"), false);
    this.files.push(destFile);
  }

  public async addFileForTestAsync(name: string) {
    const dir = temp.mkdirSync("lameta-folder-temp-for-test");
    const path = Path.join(dir, name);
    fs.writeFileSync(path, "test");
    await this.copyInOneFileAsync(path);
  }

  public copyInOneFileAsync(
    pathToOriginalFile: string,
    newFileName?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (
        ["session", "person", "meta"].includes(
          getExtension(pathToOriginalFile)?.toLowerCase()
        )
      ) {
        NotifyWarning(
          t`Cannot add files of that type` +
            ` (${getExtension(pathToOriginalFile)}`
        );
        return;
      }
      const n = sanitizeForArchive(
        newFileName ? newFileName : Path.basename(pathToOriginalFile)
      );
      const stats = fs.statSync(pathToOriginalFile);
      const dest = Path.join(this.directory, n);

      if (fs.existsSync(dest)) {
        NotifyWarning(
          t`There is already a file here with the name` + ` (${n})`
        );
        return;
      }
      const mediaFolder = getMediaFolderOrEmptyForThisProjectAndMachine();
      const linkInsteadOfCopy =
        !!mediaFolder && isSubDirectory(mediaFolder, pathToOriginalFile);

      if (linkInsteadOfCopy) {
        const f = OtherFile.CreateLinkFile(
          pathToOriginalFile,
          this.customVocabularies,
          this.directory
        );

        this.files.push(f);
      } else {
        const f = new OtherFile(dest, this.customVocabularies, true);
        f.addTextProperty("size", filesize(stats.size, { round: 0 }), false);
        f.copyProgress = t`Copy Requested...`;
        window.setTimeout(
          () =>
            CopyManager.safeAsyncCopyFileWithErrorNotification(
              pathToOriginalFile,
              dest,
              (progress: string) => {
                f.copyProgress = progress;
              }
            )
              .then((successfulDestinationPath) => {
                const pendingFile = this.files.find(
                  (x) => x.pathInFolderToLinkFileOrLocalCopy === dest
                );
                if (!pendingFile) {
                  NotifyError(
                    // not translating for now
                    `Something went wrong copying ${pathToOriginalFile} to ${dest}: could not find a matching pending file.`
                  );
                  reject();
                  return;
                }
                pendingFile!.finishLoading();
                resolve();
              })
              .catch((error) => {
                console.log(`error ${error}`);
                const fileIndex = this.files.findIndex(
                  (x) => x.pathInFolderToLinkFileOrLocalCopy === dest
                );
                if (fileIndex < 0) {
                  NotifyException(
                    error, // not translating for now
                    `Something went wrong copying ${pathToOriginalFile} to ${dest}: could not find a matching pending file.`
                  );
                  reject();
                  return;
                }
                this.files.splice(fileIndex, 1);
              }),
          0
        );

        this.files.push(f);
      }
    });
  }

  public async copyInFiles(paths: string[]) {
    assert.ok(paths.length > 0, "addFiles given an empty array of files");
    sentryBreadCrumb(`addFiles ${paths.length} files.`);

    await runInAction(async () => {
      await paths.forEach(async (p: string) => {
        await this.copyInOneFileAsync(p);
      });
    });
  }
  get type(): string {
    const x = this.properties.getValue("type") as Field;
    return x ? x.text : "???";
  }

  public get /*babel doesn't like this: abstract*/ displayName(): string {
    return "";
  }
  public knownFields: FieldDefinition[];

  // renaming failures can lead to ____.meta files that don't match anything, they just gum up the works

  private static cleanupZombieMetaFiles(directory: string) {
    /*** this is ready to go but I'm afraid to pull the trigger
     
    const metaFilePaths = glob.sync(Path.join(directory, "*.meta"));
    metaFilePaths.forEach((metaFilePath) => {
      const basename = Path.basename(metaFilePath, Path.extname(metaFilePath));
      const filePathThatWouldMatchTheMetaFileName = Path.join(
        Path.dirname(metaFilePath),
        basename
      );
      if (!fs.existsSync(filePathThatWouldMatchTheMetaFileName)) {
        console.log("Removing zombie meta file" + metaFilePath);
        if (!trash(metaFilePath)) {
          NotifyWarning(
            `lameta was not able to put this file in the trash (${metaFilePath})`
          );
        } else {
          NotifyNoBigDeal(
            `Moved unused lameta meta file to trash because there is no matching file to annotate. ${Path.basename(
              metaFilePath
            )}`
          );
        }
      }
    });

    ****/
  }

  ///Load the files constituting a session, person, or project
  protected static loadChildFiles(
    directory: string,
    folderMetaDataFile: File,
    customVocabularies: EncounteredVocabularyRegistry
  ): File[] {
    Folder.cleanupZombieMetaFiles(directory);
    const files = new Array<File>();

    files.push(folderMetaDataFile);

    //collect the other files and the metdata files they are paired with
    // get all the files in the directory without using glob
    const filePaths = getAllFilesSync(directory);
    filePaths.forEach((path) => {
      if (path !== folderMetaDataFile.metadataFilePath) {
        // We don't explicitly do anything with the the .meta companion files here,
        // because the the constructor of the ComponentFile is responsible for finding & loading it, (or creating it if missing?).
        if (
          !path.endsWith(".meta") &&
          !path.endsWith(".test") &&
          !fs.lstatSync(path).isDirectory() && // there's a problem with saymore classic oral annotation folders sneaking in
          Path.normalize(path) !==
            Path.normalize(folderMetaDataFile.metadataFilePath)
        ) {
          const file = new OtherFile(path, customVocabularies);
          files.push(file);
        }
      }
    });
    return files;
  }
  private forgetFile(file: File) {
    const index = this.files.indexOf(file);
    this.files.splice(index, 1);
  }

  public MoveFileToTrashWithUI(file: File) {
    ShowDeleteDialog(file.pathInFolderToLinkFileOrLocalCopy, async () => {
      sentryBreadCrumb(
        `Moving to trash: ${file.pathInFolderToLinkFileOrLocalCopy}`
      );
      let continueTrashing = true; // if there is no described file, then can always go ahead with trashing metadata file
      if (fs.existsSync(file.pathInFolderToLinkFileOrLocalCopy)) {
        // electron.shell.showItemInFolder(file.describedFilePath);
        continueTrashing = (
          await asyncTrash(file.pathInFolderToLinkFileOrLocalCopy)
        ).succeeded;
      }
      if (!continueTrashing) {
        return;
      }
      if (
        file.metadataFilePath &&
        file.metadataFilePath !== file.pathInFolderToLinkFileOrLocalCopy
      ) {
        if (fs.existsSync(file.metadataFilePath)) {
          if (!(await asyncTrash(file.metadataFilePath))) {
            NotifyError(
              t`lameta was not able to put this file in the trash` +
                ` (${file.metadataFilePath})`
            );
          }
        }
      }
      if (this.selectedFile === file) {
        this.selectedFile = this.files.length > 0 ? this.files[0] : null;
      }
      file.wasDeleted();
      file.properties = new FieldSet();

      this.forgetFile(file);
    });
  }
  public renameChildWithFilenameMinusExtension(
    childFile: File,
    newCoreName: string
  ): boolean {
    return childFile.tryToRenameBothFiles(newCoreName);
  }

  // TODO see https://sentry.io/organizations/meacom/issues/1268125527/events/3243884b36944f418d975dc6f7ebd80c/
  protected renameFilesAndFolders(newFolderName: string): boolean {
    sentryBreadCrumb(`renameFilesAndFolders ${newFolderName}.`);
    if (this.files.some((f) => f.copyInProgress)) {
      NotifyWarning(
        t`Please wait until all files are finished copying into this folder`
      );
      return false;
    }
    this.saveAllFilesInFolder(true);

    const oldDirPath = this.directory;
    const oldFolderName = Path.basename(oldDirPath);
    if (oldFolderName === newFolderName) {
      return false; // nothing to do
    }

    const parentPath = Path.dirname(this.directory);
    const newDirPath = Path.join(parentPath, newFolderName);
    const couldNotRenameDirectory = t`lameta could not rename the directory.`;
    if (
      oldFolderName.toLowerCase() !== newFolderName.toLowerCase() &&
      fs.pathExistsSync(newDirPath)
    ) {
      // this could almost just be silent. To see it, create several new people in a row
      NotifyWarning(
        t`lameta tried to rename the folder "${oldFolderName}" to "${newFolderName}", but there is already a folder with that name.`
      );
      return false;
    }
    // first, we just do a trial run to see if this will work
    console.debug(
      `renameFilesAndFolders() at point where it test the directory name.`
    );
    try {
      PatientFS.renameSync(this.directory, newDirPath);
      PatientFS.renameSync(newDirPath, this.directory);
    } catch (err) {
      NotifyFileAccessProblem(
        couldNotRenameDirectory + " [[STEP:Precheck]]",
        err
      );
      return false;
    }
    try {
      this.files.forEach((f) => {
        f.throwIfFilesMissing();
      });
    } catch (err) {
      NotifyFileAccessProblem(
        couldNotRenameDirectory + " [[STEP:Files Exist]]",
        err
      );
      return false;
    }

    console.debug(
      `renameFilesAndFolders() at point where checks for files that have the basename as part of their name.`
    );

    // ok, that worked, so now have all the files rename themselves if their name depends on the folder name
    this.files.forEach((f) => {
      try {
        f.updateNameBasedOnNewFolderName(newFolderName);
      } catch (err) {
        const base = Path.basename(f.metadataFilePath);
        const msg = t`lameta was not able to rename one of the files in the folder.`;
        NotifyFileAccessProblem(
          `${msg} (${base})` + " [[STEP:File names]]",
          err
        );
      }
    });
    // and actually do the rename
    console.debug(
      `renameFilesAndFolders() at point where it actually renames the directory (to ${newDirPath}).`
    );
    try {
      PatientFS.renameSync(this.directory, newDirPath);
      this.directory = newDirPath;
      // console.log(
      //   `** Renamed Folder from ${oldFolderName} to ${newFolderName}.`
      // );
    } catch (err) {
      const msg = t`lameta was not able to rename the folder.`;
      NotifyFileAccessProblem(
        `${msg} (${this.displayName}).` + " [[STEP:Actual folder]]",
        err
      );
      return false; // don't continue on with telling the folders that they moved.
    }

    console.debug(
      `renameFilesAndFolders() at point where it tells the file objects in memory about their new location.`
    );

    // ok, only after the folder was successfully renamed do we tell the individual files that they have been moved
    this.files.forEach((f) => {
      // no file i/o here
      try {
        f.updateRecordOfWhatFolderThisIsLocatedIn(newFolderName);
      } catch (err) {
        console.error(
          `renameFilesAndFolders(): Error updating record of what folder this is located in for ${f.pathInFolderToLinkFileOrLocalCopy}`
        );
        throw err;
      }
    });

    // console.log(
    //   `** Completed on Disk renaming Folder from ${oldFolderName} to ${newFolderName}.`
    // );
    return true;
  }

  protected textValueThatControlsFolderName(): string {
    return "UNUSED-IN-THIS-CLASS";
  }

  public getNeedRenameOfFolder(): boolean {
    const newFileName = sanitizeForArchive(
      this.textValueThatControlsFolderName()
    );

    // Note, this code hasn't been tested with Linux, which has a case-sensitive file system.
    // Windows is always case-insensitive, and macos usually (but not always!) is. This method
    // so far gets by with being case sensitive.
    return newFileName.length > 0 && newFileName !== this.currentFileNameBase;
  }

  public nameMightHaveChanged(): boolean {
    const newFileName = sanitizeForArchive(
      this.textValueThatControlsFolderName()
    );

    // Note, this code hasn't been tested with Linux, which has a case-sensitive file system.
    // Windows is always case-insensitive, and macos usually (but not always!) is. This method
    // so far gets by with being case sensitive.
    if (newFileName.length > 0) {
      const currentFolderName = Path.basename(this.directory);
      if (newFileName !== currentFolderName) {
        //newFileName !== this.safeFileNameBase  REVIEW: I don't understand the logic that was here

        const renameSucceeded = this.renameFilesAndFolders(newFileName);
        if (renameSucceeded) {
          this.currentFileNameBase = newFileName;
        }
        return renameSucceeded;
      }
      return true; // review not clear if true or false makes more sense if there was no relevant change?
    }
    return false;
  }

  public saveFolderMetaData() {
    assert.ok(this.metadataFile);

    if (this.metadataFile) {
      this.detectAndRepairMisnamedMetadataFile(
        this.directory,
        this.metadataFile.metadataFilePath,
        this.metadataFileExtensionWithDot
      );
      this.metadataFile.save(false);
    }
  }

  public detectAndRepairMisnamedMetadataFile(
    directory: string,
    expectedMetadataFilePath: string,
    metadataFileExtensionWithDot: string
  ) {
    if (!fs.existsSync(expectedMetadataFilePath)) {
      const matchingPaths = this.findZombieMetadataFiles(
        directory,
        metadataFileExtensionWithDot
      );
      if (matchingPaths.length > 1) {
        try {
          PatientFS.renameSync(matchingPaths[0], expectedMetadataFilePath);
          return;
        } catch (err) {
          NotifyException(
            err,
            `lameta was not able to fix the name of ${matchingPaths[0]} to fit the folder name.` // intentionally not adding the translation list
          );
          // not sure what to do now....
        }
      }
    }
  }
  private findZombieMetadataFiles(directory: string, extension: string) {
    const dir = fs.readdirSync(directory);
    return dir.filter((f) => f.match(new RegExp(`.*(${extension})$`, "ig")));
  }
  public saveAllFilesInFolder(beforeRename: boolean = false) {
    if (this.beingDeleted) {
      console.warn(
        `Skipping saveAllFilesInFolder( ${this.displayName}) because beingDeleted`
      );
      return;
    }

    // 9/2021 there is a very hard to reproduce bug where, after deletion, something is trying to save
    // either the folder or something in the folder.
    if (this.wasDeleted) {
      debugger;
      console.error(
        ` called on ${this.displayName} which was already deleted.`
      );
      return;
    }
    for (const f of this.files) {
      f.save(beforeRename);
    }
  }

  public wasChangeThatMobxDoesNotNotice() {
    if (this.metadataFile) {
      this.metadataFile.wasChangeThatMobxDoesNotNotice();
    }
  }
  public recomputedChangeWatcher() {
    if (this.metadataFile) {
      this.metadataFile.recomputedChangeWatcher();
    }
  }

  public runSanityCheck() {
    if (fs.existsSync(this.directory)) {
      // will sometimes be false for things like DescriptionDocuments
      const dir = fs.readdirSync(this.directory);
      const x = dir.filter((elm) =>
        // about ^(?!~)
        //  opening a file in ms word creates a hidden file that starts with ~
        // the fact that it's open with Word is probably going to cause problems,
        // but this temp file is not a problem, don't want to give a misleading error message.
        elm.match(
          new RegExp(`^(?!~).*(${this.metadataFileExtensionWithDot})$`, "ig")
        )
      );
      if (x.length > 1) {
        NotifyMultipleProjectFiles(
          this.filePrefix,
          this.metadataFileExtensionWithDot,
          Path.basename(this.directory) + this.metadataFileExtensionWithDot,
          this.directory
        );
      }
    }
  }
}
function isSubDirectory(root: string, path: string) {
  const relative = Path.relative(root, path);
  return relative && !relative.startsWith("..") && !Path.isAbsolute(relative);
}
