import {
  File,
  getStandardMessageAboutLockedFiles,
  kLinkExtensionWithFullStop,
  OtherFile,
} from "../file/File";
import { observable } from "mobx";
import { Field, FieldType, FieldVisibility } from "../field/Field";
import { FieldDefinition } from "../field/FieldDefinition";

import {
  NotifyMultipleProjectFiles,
  NotifyError,
  NotifyWarning,
  NotifyException,
  NotifyFileAccessProblem,
  NotifySuccess,
  NotifyNoBigDeal,
} from "../../components/Notify";
import * as fs from "fs-extra";
import * as Path from "path";
import * as glob from "glob";
import { FieldSet } from "../field/FieldSet";
import assert from "assert";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import { trash } from "../../other/crossPlatformUtilities";
import { CustomFieldRegistry } from "../Project/CustomFieldRegistry";
import { CopyManager, getExtension } from "../../other/CopyManager";
import { sanitizeForArchive } from "../../other/sanitizeForArchive";
import userSettingsSingleton from "../../other/UserSettings";
import { sentryBreadCrumb } from "../../other/errorHandling";
import filesize from "filesize";
import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import { FolderMetadataFile } from "../file/FolderMetaDataFile";
import { PatientFS } from "../../other/PatientFile";
import { getMediaFolderOrEmptyForThisProjectAndMachine } from "../Project/MediaFolderAccess";

export class IFolderSelection {
  @observable
  public index: number;
}

// Project, Session, or Person
export /*babel doesn't like this: abstract*/ class Folder {
  // Is the folder's checkbox ticked?
  @observable
  public checked: boolean = false;

  public directory: string = "";
  @observable
  public files: File[] = [];

  // file from this folder that is currently selected in the UI
  @observable
  public selectedFile: File | null;

  public metadataFile: FolderMetadataFile | null;
  protected safeFileNameBase: string;
  protected customFieldRegistry: CustomFieldRegistry;

  public constructor(
    directory: string,
    metadataFile: FolderMetadataFile | null,
    files: File[],
    customFieldRegistry: CustomFieldRegistry
  ) {
    this.customFieldRegistry = customFieldRegistry;
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
  public get hasCustomFieldsTable(): boolean {
    return false;
  }
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
    // note, I can't think of how the .meta file of the consent could be helpful, so
    // I'm not bothering to get it copied, or its contents preserved, except for size.
    fs.copyFileSync(sourceFile.pathInFolderToLinkFileOrLocalCopy, destPath);
    const destFile = new OtherFile(destPath, this.customFieldRegistry, true);
    destFile.addTextProperty("size", sourceFile.getTextProperty("size"), false);
    this.files.push(destFile);
  }

  public copyInOneFile(
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
        newFileName ? newFileName : Path.basename(pathToOriginalFile),
        userSettingsSingleton.IMDIMode
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
          this.customFieldRegistry,
          this.directory
        );

        this.files.push(f);
      } else {
        const f = new OtherFile(dest, this.customFieldRegistry, true);
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

  public copyInFiles(paths: string[]) {
    assert.ok(paths.length > 0, "addFiles given an empty array of files");
    sentryBreadCrumb(`addFiles ${paths.length} files.`);
    //let lastFile: File | null = null;
    paths.forEach((p: string) => {
      this.copyInOneFile(p);
      //lastFile = p;
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
    customFieldRegistry: CustomFieldRegistry
  ): File[] {
    Folder.cleanupZombieMetaFiles(directory);
    const files = new Array<File>();

    files.push(folderMetaDataFile);

    //collect the other files and the metdata files they are paired with
    const filePaths = glob.sync(Path.join(directory, "*.*"));
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
          const file = new OtherFile(path, customFieldRegistry);
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

  public moveFileToTrash(file: File) {
    ConfirmDeleteDialog.show(
      file.pathInFolderToLinkFileOrLocalCopy,
      (path: string) => {
        sentryBreadCrumb(
          `Moving to trash: ${file.pathInFolderToLinkFileOrLocalCopy}`
        );
        let continueTrashing = true; // if there is no described file, then can always go ahead with trashing metadata file
        if (fs.existsSync(file.pathInFolderToLinkFileOrLocalCopy)) {
          // electron.shell.showItemInFolder(file.describedFilePath);
          continueTrashing = trash(file.pathInFolderToLinkFileOrLocalCopy);
        }
        if (!continueTrashing) {
          return;
        }
        if (
          file.metadataFilePath &&
          file.metadataFilePath !== file.pathInFolderToLinkFileOrLocalCopy
        ) {
          if (fs.existsSync(file.metadataFilePath)) {
            if (!trash(file.metadataFilePath)) {
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
      }
    );
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
    this.saveAllFilesInFolder();

    const oldDirPath = this.directory;
    const oldFolderName = Path.basename(oldDirPath);
    if (oldFolderName === newFolderName) {
      return false; // nothing to do
    }

    const parentPath = Path.dirname(this.directory);
    const newDirPath = Path.join(parentPath, newFolderName);
    const couldNotRenameDirectory = t`lameta could not rename the directory.`;

    // first, we just do a trial run to see if this will work
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

    // ok, that worked, so now have all the folder rename themselves if their name depends on the folder name
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
    try {
      PatientFS.renameSync(this.directory, newDirPath);
      this.directory = newDirPath;
    } catch (err) {
      const msg = t`lameta was not able to rename the folder.`;
      NotifyFileAccessProblem(
        `${msg} (${this.displayName}).` + " [[STEP:Actual folder]]",
        err
      );
      return false; // don't continue on with telling the folders that they moved.
    }

    // ok, only after the folder was successfully renamed do we tell the individual files that they have been movd
    this.files.forEach((f) => {
      // no file i/o here
      f.updateRecordOfWhatFolderThisIsLocatedIn(newFolderName);
    });
    return true;
  }

  protected textValueThatControlsFolderName(): string {
    return "UNUSED-IN-THIS-CLASS";
  }

  public nameMightHaveChanged(): boolean {
    // Enhance: If something goes wrong here, we're going to have things out of sync. Is there some
    // way to do this atomically (that is, as a transaction), or at least do the most dangerous
    // part first (i.e. the file renaming)?
    // Then if that failed, we would need to rename the files that had already been changed, and then
    // change the id/name field back to what it was previously.
    const newFileName = sanitizeForArchive(
      this.textValueThatControlsFolderName(),
      userSettingsSingleton.IMDIMode
    );

    // Note, this code hasn't been tested with Linux, which has a case-sensitive file system.
    // Windows is always case-insensitive, and macos usually (but not always!) is. This method
    // so far gets by with being case sensitive.
    if (newFileName.length > 0 && newFileName !== this.safeFileNameBase) {
      const renameSucceeded = this.renameFilesAndFolders(newFileName);
      if (renameSucceeded) {
        this.safeFileNameBase = newFileName;
      }
      return renameSucceeded;
    }
    return true; // review not clear if true or false makes more sense if there was no relevant change?
  }

  public saveFolderMetaData() {
    assert.ok(this.metadataFile);

    if (this.metadataFile) {
      this.detectAndRepairMisnamedMetadataFile(
        this.directory,
        this.metadataFile.metadataFilePath,
        this.metadataFileExtensionWithDot
      );
      this.metadataFile.save();
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
  public saveAllFilesInFolder() {
    for (const f of this.files) {
      f.save();
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
        elm.match(new RegExp(`.*(${this.metadataFileExtensionWithDot})$`, "ig"))
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
