import { File, OtherFile } from "../file/File";
import { observable } from "mobx";
import { Field, FieldType, FieldVisibility } from "../field/Field";
import { FieldDefinition } from "../field/FieldDefinition";

import {
  NotifyMultipleProjectFiles,
  NotifyError,
  NotifyWarning,
} from "../../components/Notify";
import * as fs from "fs-extra";
import * as Path from "path";
import * as glob from "glob";
import { FieldSet } from "../field/FieldSet";
import assert from "assert";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import { trash } from "../../crossPlatformUtilities";
import { CustomFieldRegistry } from "../Project/CustomFieldRegistry";
import {
  safeAsyncCopyFileWithErrorNotification,
  getExtension,
} from "../../RobustLargeFileCopy";
import { sanitizeForArchive } from "../../sanitizeForArchive";
import userSettingsSingleton from "../../UserSettings";
import { sentryBreadCrumb } from "../../errorHandling";
import filesize from "filesize";
import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";

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

  public metadataFile: File | null;
  protected safeFileNameBase: string;
  protected customFieldRegistry: CustomFieldRegistry;

  public constructor(
    directory: string,
    metadataFile: File | null,
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
  public addOneFile(path: string, newFileName?: string) {
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

    const f = new OtherFile(dest, this.customFieldRegistry);
    const stats = fs.statSync(path);
    f.addTextProperty("size", filesize(stats.size, { round: 0 }), false);
    f.copyProgress = i18n._(t`Copy Requested...`);
    this.files.push(f);

    //throw new Error("testing");
    // nodejs on macos is flaky copying large files: https://github.com/nodejs/node/issues/30575
    // child_process.execFile('/bin/cp', ['--no-target-directory', source, target]

    window.setTimeout(
      () =>
        safeAsyncCopyFileWithErrorNotification(
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

  public addFiles(paths: string[]) {
    assert.ok(paths.length > 0, "addFiles given an empty array of files");
    sentryBreadCrumb(`addFiles ${paths.length} files.`);
    //let lastFile: File | null = null;
    paths.forEach((p: string) => {
      this.addOneFile(p);
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
          file.finishLoading();
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
      if (
        continueTrashing && // don't trash metadata if something went wrong trashing "described file"
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

      if (continueTrashing) {
        this.forgetFile(file);
      }
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
    const oldDirPath = this.directory;
    const oldFolderName = Path.basename(oldDirPath);
    if (oldFolderName === newFolderName) {
      return; // nothing to do
    }

    const parentPath = Path.dirname(this.directory);
    const newDirPath = Path.join(parentPath, newFolderName);

    this.files.forEach((f) => {
      f.updateNameBasedOnNewFolderName(newFolderName);
    });
    fs.renameSync(this.directory, newDirPath);
    this.directory = newDirPath;
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
      this.metadataFile.save();
    }
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
