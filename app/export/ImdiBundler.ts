import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder";
import { File } from "../model/file/File";
import * as Path from "path";
import Archiver from "archiver";
import * as fs from "fs";
import ImdiGenerator from "./ImdiGenerator";

export default class ImdiBundler {
  // We want a way to make a zip of the whole project, and a different
  // way to just output the one IMDI file.
  public static saveImdiZip(
    project: Project,
    path: string,
    includeFiles: boolean
  ) {
    // create a file to stream archive data to.
    const output = fs.createWriteStream(path);
    const archive = Archiver("zip");

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on("close", () => {});

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on("warning", err => {
      if (err.code === "ENOENT") {
        console.log("saveImdiZip Warning: " + err);
      } else {
        // throw error
        throw err;
      }
    });

    // good practice to catch this error explicitly
    archive.on("error", err => {
      alert("saveImdiZip error: " + err);
    });

    // pipe archive data to the file
    archive.pipe(output);

    const childrenSubpaths: string[] = new Array<string>();

    /* we want (from saymore classic)
     myproject.imdi
     myproject/     <--- "secondLevel"
         session1.imdi
         session2.imdi
         session1/
            ...files...
         session2/
            ...files...
    */

    const secondLevel = project.displayName;

    if (includeFiles) {
      project.files.forEach((f: File) => {
        if (ImdiGenerator.shouldIncludeFile(f.describedFilePath)) {
          //NB: archive.file(f.describedFilePath... gives an error I couldn't figure out,
          // so we just read it in manually.
          archive.append(fs.readFileSync(f.describedFilePath), {
            name: Path.basename(f.describedFilePath)
          });
        }
      });
    }
    //---- Project Documents -----

    this.outputDocumentFolder(
      project,
      archive,
      "Project Documents",
      "Other_Project_Documents.imdi",
      secondLevel,
      project.otherDocsFolder,
      childrenSubpaths,
      includeFiles
    );

    this.outputDocumentFolder(
      project,
      archive,
      "Project Description Documents",
      "Project_Description_Documents.imdi",
      secondLevel,
      project.descriptionFolder,
      childrenSubpaths,
      includeFiles
    );

    //---- Sessions ----

    project.sessions.forEach((session: Session) => {
      const imdi = ImdiGenerator.generateSession(session, project);

      const imdiFileName = `${session.filePrefix}.imdi`;
      archive.append(imdi, {
        name: imdiFileName,
        prefix: secondLevel
        // saymore classic just put all the imdi's on the root. prefix: includeFiles ? pathToSessionDirectoryInArchive : ""
      });

      if (includeFiles) {
        this.archiveFolderOfFiles(
          archive,
          Path.join(secondLevel, Path.basename(session.directory)),
          session.files
        );
      }
      childrenSubpaths.push(secondLevel + "/" + imdiFileName);
    });

    // ---  Now that we know what all the child imdi's are, we can output the root  ---
    archive.append(
      ImdiGenerator.generateCorpus(project, childrenSubpaths, false),
      {
        name: `${project.displayName}.imdi`
      }
    );

    archive.finalize();
  }

  private static archiveFolderOfFiles(
    archive: Archiver.Archiver,
    pathToDirectoryInArchive,
    files: File[]
  ) {
    files.forEach((f: File) => {
      if (ImdiGenerator.shouldIncludeFile(f.describedFilePath)) {
        //NB: archive.file(f.describedFilePath... gives an error I couldn't figure out,
        // so we just read it in manually.
        archive.append(fs.readFileSync(f.describedFilePath), {
          name: Path.basename(f.describedFilePath),
          // here we want the file to go into a subdirectory
          prefix: pathToDirectoryInArchive
        });
      }
    });
  }

  private static outputDocumentFolder(
    project: Project,
    archive: Archiver.Archiver,
    name: string,
    imdiFileName: string,
    secondLevel: string,
    folder: Folder,
    subpaths: string[],
    includeFiles: boolean
  ): void {
    if (folder.files.length > 0) {
      // IMDI doesn't have a place for project-level documents, so we have to create IMDI
      // Sessions even though they are not related to actual sessions
      const generator = new ImdiGenerator(folder, project);
      const projectDocumentsImdi = generator.makePseudoSessionImdiForOtherFolder(
        name,
        folder
      );

      archive.append(projectDocumentsImdi, {
        name: imdiFileName,
        prefix: secondLevel
      });
      subpaths.push(secondLevel + "/" + imdiFileName);

      if (includeFiles) {
        this.archiveFolderOfFiles(
          archive,
          Path.join(secondLevel, Path.basename(imdiFileName, ".imdi")),
          folder.files
        );
      }
    }
  }
}
