import {
  File,
  getStandardMessageAboutLockedFiles,
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
import { translateMessage } from "../../other/localization";
import { PatientFS } from "../../other/PatientFile";

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
  public copyInOneFile(path: string, newFileName?: string) {
    if (
      ["session", "person", "meta"].includes(getExtension(path)?.toLowerCase())
    ) {
      NotifyWarning(`Cannot add files of type ${getExtension(path)}`);
      return;
    }
    const n = sanitizeForArchive(
      newFileName ? newFileName : Path.basename(path),
      userSettingsSingleton.IMDIMode
    );
    const dest = Path.join(this.directory, n);

    if (fs.existsSync(dest)) {
      NotifyWarning(`There is already a file here with the name "${n}"`);
      return;
    }

    const f = new OtherFile(dest, this.customFieldRegistry, true);
    const stats = fs.statSync(path);
    f.addTextProperty("size", filesize(stats.size, { round: 0 }), false);
    f.copyProgress = i18n._(t`Copy Requested...`);
    this.files.push(f);

    //throw new Error("testing");
    // nodejs on macos is flaky copying large files: https://github.com/nodejs/node/issues/30575
    // child_process.execFile('/bin/cp', ['--no-target-directory', source, target]

    window.setTimeout(
      () =>
        CopyManager.safeAsyncCopyFileWithErrorNotification(
          path,
          dest,
          (progress: string) => {
            f.copyProgress = progress;
          }
        )
          .then((successfulDestinationPath) => {
            const pendingFile = this.files.find(
              (x) => x.describedFilePath === dest
            );
            if (!pendingFile) {
              NotifyError(
                `Something went wrong copying ${path} to ${dest}: could not find a matching pending file.`
              );
              return;
            }
            //const f = new OtherFile(dest, this.customFieldRegistry);
            //this.files.push(f);
            pendingFile!.finishLoading();
          })
          .catch((error) => {
            console.log(`error ${error}`);
            const fileIndex = this.files.findIndex(
              (x) => x.describedFilePath === dest
            );
            if (fileIndex < 0) {
              NotifyError(
                `Something went wrong copying ${path} to ${dest}: could not find a matching pending file.`
              );
              return;
            }
            this.files.splice(fileIndex, 1);
          }),
      0
    );
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

  ///Load the files constituting a session, person, or project
  protected static loadChildFiles(
    directory: string,
    folderMetaDataFile: File,
    customFieldRegistry: CustomFieldRegistry
  ): File[] {
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
    ConfirmDeleteDialog.show(file.describedFilePath, (path: string) => {
      sentryBreadCrumb(`Moving to trash: ${file.describedFilePath}`);
      let continueTrashing = true; // if there is no described file, then can always go ahead with trashing metadata file
      if (fs.existsSync(file.describedFilePath)) {
        // electron.shell.showItemInFolder(file.describedFilePath);
        continueTrashing = trash(file.describedFilePath);
      }
      if (!continueTrashing) {
        return;
      }
      if (
        file.metadataFilePath &&
        file.metadataFilePath !== file.describedFilePath
      ) {
        if (fs.existsSync(file.metadataFilePath)) {
          console.log(`attempting trash of meta: ${file.metadataFilePath}`);
          if (!trash(file.metadataFilePath)) {
            NotifyError(
              "Failed to trash metadatafile:" + file.metadataFilePath
            );
          }
        }
      }
      if (this.selectedFile === file) {
        this.selectedFile = this.files.length > 0 ? this.files[0] : null;
      }
      // there was a bug at one time with something still holding a reference to this.
      file.metadataFilePath = "error: this file was previously put in trash";
      file.describedFilePath = "";
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
  protected renameFilesAndFolders(newFolderName: string) {
    this.saveAllFilesInFolder();

    const oldDirPath = this.directory;
    const oldFolderName = Path.basename(oldDirPath);
    if (oldFolderName === newFolderName) {
      return; // nothing to do
    }

    const parentPath = Path.dirname(this.directory);
    const newDirPath = Path.join(parentPath, newFolderName);
    const couldNotRenameDirectory = translateMessage(
      /*i18n*/ { id: "lameta could not rename the directory." }
    );

    // first, we just do a trial run to see if this will work
    try {
      PatientFS.renameSync(this.directory, newDirPath);
      PatientFS.renameSync(newDirPath, this.directory);
    } catch (err) {
      NotifyException(
        err,
        couldNotRenameDirectory +
          getStandardMessageAboutLockedFiles() +
          " [[LOCATION:Precheck]]"
      );
      return;
    }
    try {
      this.files.forEach((f) => {
        f.throwIfFilesMissing();
      });
    } catch (err) {
      NotifyException(
        err,
        couldNotRenameDirectory +
          getStandardMessageAboutLockedFiles() +
          " [[LOCATION:Files Exist]]"
      );
      return;
    }

    // ok, that worked, so now have all the folder rename themselves if their name depends on the folder name
    this.files.forEach((f) => {
      try {
        f.updateNameBasedOnNewFolderName(newFolderName);
      } catch (err) {
        const base = Path.basename(f.metadataFilePath);
        NotifyException(
          err,
          `Could not rename ${base}` +
            getStandardMessageAboutLockedFiles() +
            " [[LOCATION:File names]]"
        );
      }
    });
    // and actually do the rename
    try {
      PatientFS.renameSync(this.directory, newDirPath);
      this.directory = newDirPath;
    } catch (err) {
      NotifyException(
        err,
        `Could not rename the directory containing ${this.displayName}.` +
          getStandardMessageAboutLockedFiles() +
          " [[LOCATION:Actual folder]]"
      );
      return; // don't continue on with telling the folders that they moved.
    }

    // ok, only after the folder was successfully renamed do we tell the individual files that they have been movd
    this.files.forEach((f) => {
      // no file i/o here
      f.updateRecordOfWhatFolderThisIsLocatedIn(newFolderName);
    });
  }

  protected textValueThatControlsFolderName(): string {
    return "UNUSED-IN-THIS-CLASS";
  }

  public nameMightHaveChanged() {
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
      this.safeFileNameBase = newFileName;
      this.renameFilesAndFolders(newFileName);
    }
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
          NotifyError(
            `Failed to fix the name of ${matchingPaths[0]} to fit the folder name.`
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
