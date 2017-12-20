import { Folder } from "./Folder";
import { File, OtherFile } from "./file/File";
import * as Path from "path";
import * as glob from "glob";

export class ProjectDocuments extends Folder {
  public get displayName(): string {
    return "Project Documents";
  }

  public constructor(directory: string, files: File[]) {
    super(directory, null, files);
  }

  public static fromDirectory(
    rootDirectory: string,
    subDirectory: string
  ): ProjectDocuments {
    const directory = Path.join(rootDirectory, subDirectory);
    const files = new Array<File>();
    const filePaths = glob.sync(Path.join(directory, "*.*"));
    filePaths.forEach(path => {
      const file = new OtherFile(path);
      files.push(file);
    });
    return new ProjectDocuments(directory, files);
  }
}
