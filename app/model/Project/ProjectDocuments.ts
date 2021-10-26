import { Folder, IFolderType } from "../Folder/Folder";
import { File, OtherFile } from "../file/File";
import * as Path from "path";
import * as glob from "glob";
import CustomFieldsTable from "../../components/CustomFieldsTable";
import { CustomFieldRegistry } from "./CustomFieldRegistry";

export class ProjectDocuments extends Folder {
  public get displayName(): string {
    return "Project Documents";
  }

  public constructor(
    directory: string,
    files: File[],
    customFieldRegistry: CustomFieldRegistry
  ) {
    super(directory, null, files, customFieldRegistry);
  }

  public get folderType(): IFolderType {
    return "project documents";
  }

  public static fromDirectory(
    rootDirectory: string,
    subDirectory: string,
    customFieldRegistry: CustomFieldRegistry
  ): ProjectDocuments {
    const directory = Path.join(rootDirectory, subDirectory);
    const files = new Array<File>();
    const filePaths = glob.sync(Path.join(directory, "*.*"));
    filePaths.forEach((path) => {
      const file = new OtherFile(
        path,
        new CustomFieldRegistry() /* we don't have custom fields on project files yet */
      );
      files.push(file);
    });
    return new ProjectDocuments(directory, files, customFieldRegistry);
  }
  public get propertyForCheckingId(): string {
    throw new Error(
      "Did not expect propertyForCheckingId to be called on ProjectDocuments"
    );
  }
  public importIdMatchesThisFolder(id: string): boolean {
    throw new Error(
      "Did not expect matchesId to be called on ProjectDocuments"
    );
  }
  public migrateFromPreviousVersions(): void {
    //nothing to do, yet
  }
}
