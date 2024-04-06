import { Folder, IFolderType } from "../Folder/Folder";
import { File, OtherFile } from "../file/File";
import * as Path from "path";
import { globSync } from "glob";
import CustomFieldsTable from "../../components/CustomFieldsTable";
import { EncounteredVocabularyRegistry } from "./EncounteredVocabularyRegistry";
import { getAllFilesSync } from "../../other/crossPlatformUtilities";

export class ProjectDocuments extends Folder {
  public get displayName(): string {
    return "Project Documents";
  }

  public constructor(
    directory: string,
    files: File[],
    customVocabularies: EncounteredVocabularyRegistry
  ) {
    super(directory, null, files, customVocabularies);
  }

  public get folderType(): IFolderType {
    return "project documents";
  }

  public static fromDirectory(
    rootDirectory: string,
    subDirectory: string,
    customVocabularies: EncounteredVocabularyRegistry
  ): ProjectDocuments {
    const directory = Path.join(rootDirectory, subDirectory);
    const files = new Array<File>();
    const filePaths = getAllFilesSync(directory);
    filePaths.forEach((path) => {
      const file = new OtherFile(
        path,
        new EncounteredVocabularyRegistry() /* we don't have custom fields on project files yet */
      );
      files.push(file);
    });
    return new ProjectDocuments(directory, files, customVocabularies);
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
