import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder";
import { File } from "../model/file/File";
import * as Path from "path";
import * as fs from "fs-extra";
import ImdiGenerator from "./ImdiGenerator";
import { log } from "util";

// This class handles making/copying all the files for an IMDI archive.
export default class ImdiBundler {
  public static saveImdiBundleToFolder(
    project: Project,
    rootDirectory: string,
    // If this is false, we're just making the IMDI files.
    // If true, then we're also copying in most of the project files (but not some Saymore-specific ones).
    copyInProjectFiles: boolean,
    folderFilter: (f: Folder) => boolean
  ) {
    try {
      if (fs.existsSync(rootDirectory)) {
        fs.removeSync(rootDirectory);
      }
      // make all parts of the directory as needed
      fs.ensureDirSync(rootDirectory);
    } catch (error) {
      console.log(error);
      alert(
        `There was a problem getting the directory ${rootDirectory} ready. Maybe close any open Finder/Explorer windows or other programs that might be showing file from that directory,  and try again. \r\n\r\n${error}`
      );
      return;
    }
    /* we want (from saymore classic)
     myproject_3-6-2019/  <--- rootDirectory
        myproject.imdi
        myproject/     <--- "secondLevel"
          session1.imdi
          session2.imdi
          session1/
             ...files...
          session2/
             ...files...
    */

    const childrenSubpaths: string[] = new Array<string>();
    const secondLevel = Path.basename(project.directory);
    try {
      fs.ensureDirSync(Path.join(rootDirectory, secondLevel));
    } catch (error) {
      alert(
        `There was a problem getting the directory ${Path.join(
          rootDirectory,
          secondLevel
        )} ready. Maybe close any open Finder/Explorer windows and try again`
      );
      return;
    }
    //---- Project Documents -----

    this.outputDocumentFolder(
      project,
      "OtherDocuments",
      "OtherDocuments.imdi",
      rootDirectory,
      secondLevel,
      project.otherDocsFolder,
      childrenSubpaths,
      copyInProjectFiles
    );

    this.outputDocumentFolder(
      project,
      "DescriptionDocuments",
      "DescriptionDocuments.imdi",
      rootDirectory,
      secondLevel,
      project.descriptionFolder,
      childrenSubpaths,
      copyInProjectFiles
    );

    //---- Sessions ----

    project.sessions.filter(folderFilter).forEach((session: Session) => {
      const imdi = ImdiGenerator.generateSession(session, project);
      const imdiFileName = `${session.filePrefix}.imdi`;
      fs.writeFileSync(
        Path.join(rootDirectory, secondLevel, imdiFileName),
        imdi
      );
      childrenSubpaths.push(secondLevel + "/" + imdiFileName);

      if (copyInProjectFiles) {
        this.copyFolderOfFiles(
          session.files,
          Path.join(
            rootDirectory,
            secondLevel,
            Path.basename(session.directory)
          )
        );
      }
    });

    // ---  Now that we know what all the child imdi's are, we can output the root  ---
    fs.writeFileSync(
      Path.join(rootDirectory, `${project.displayName}.imdi`),
      ImdiGenerator.generateCorpus(project, childrenSubpaths, false)
    );
  }

  // IMDI doesn't have a place for project-level documents, so we have to create IMDI
  // Sessions even though they are not related to actual sessions
  private static outputDocumentFolder(
    project: Project,
    name: string,
    imdiFileName: string,
    rootDirectory: string,
    secondLevel: string,
    folder: Folder,
    subpaths: string[],
    copyInProjectFiles: boolean
  ): void {
    if (folder.files.length > 0) {
      const generator = new ImdiGenerator(folder, project);
      const projectDocumentsImdi = generator.makePseudoSessionImdiForOtherFolder(
        name,
        folder
      );

      fs.writeFileSync(
        Path.join(rootDirectory, secondLevel, imdiFileName),
        projectDocumentsImdi
      );
      subpaths.push(secondLevel + "/" + imdiFileName);

      if (copyInProjectFiles) {
        this.copyFolderOfFiles(
          folder.files,
          Path.join(
            rootDirectory,
            secondLevel,
            Path.basename(imdiFileName, ".imdi")
          )
        );
      }
    }
  }

  private static copyFolderOfFiles(files: File[], targetDirectory: string) {
    fs.ensureDirSync(Path.join(targetDirectory));
    let errors = "";
    let count = 0;
    let failed = 0;
    files.forEach((f: File) => {
      if (ImdiGenerator.shouldIncludeFile(f.describedFilePath)) {
        count++;
        try {
          fs.copyFileSync(
            f.describedFilePath,
            Path.join(targetDirectory, Path.basename(f.describedFilePath))
          );
        } catch (error) {
          errors = errors + `Problem copying ${f.describedFilePath}+\r\n`;
          log(error);
          failed++;
        }
      }
    });

    if (errors.length > 0) {
      alert(`Failed to copy ${failed} of ${count} files\r\n${errors}`);
    }
  }
}
