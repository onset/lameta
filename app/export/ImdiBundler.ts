import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
import { Contribution, File } from "../model/file/File";
import * as Path from "path";
import * as fs from "fs-extra";
import ImdiGenerator from "./ImdiGenerator";
import { log } from "util";
import { sentryBreadCrumb } from "../other/errorHandling";
import { sanitizeForArchive } from "../other/sanitizeForArchive";
import * as temp from "temp";
import { CustomFieldRegistry } from "../model/Project/CustomFieldRegistry";
import * as glob from "glob";
import { NotifyError, NotifyWarning } from "../components/Notify";
import { CopyManager } from "../other/CopyManager";
import moment from "moment";
temp.track(true);

// This class handles making/copying all the files for an IMDI archive.
export default class ImdiBundler {
  public static saveImdiBundleToFolder(
    project: Project,
    rootDirectory: string,
    // If this is false, we're just making the IMDI files.
    // If true, then we're also copying in most of the project files (but not some Saymore-specific ones).
    copyInProjectFiles: boolean,
    folderFilter: (f: Folder) => boolean,
    omitNamespaces?: boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      sentryBreadCrumb("Starting saveImdiBundleToFolder");
      try {
        if (fs.existsSync(rootDirectory)) {
          fs.removeSync(rootDirectory);
        }
        // make all parts of the directory as needed
        fs.ensureDirSync(rootDirectory);
      } catch (error) {
        console.log(error);
        NotifyError(
          `There was a problem getting the directory ${rootDirectory} ready. Maybe close any open Finder/Explorer windows or other programs that might be showing file from that directory,  and try again. \r\n\r\n${error}`
        );
        reject();
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
        NotifyError(
          `There was a problem getting the directory ${Path.join(
            rootDirectory,
            secondLevel
          )} ready. Maybe close any open Finder/Explorer windows and try again.`
        );
        reject();
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

      // I'm thinking, this only makes sense if we're going to provide the files
      if (copyInProjectFiles) {
        this.addConsentBundle(
          project,
          rootDirectory,
          secondLevel,
          childrenSubpaths,
          copyInProjectFiles,
          folderFilter,
          omitNamespaces
        );
      }

      //---- Sessions ----

      project.sessions.filter(folderFilter).forEach((session: Session) => {
        const imdi = ImdiGenerator.generateSession(session, project);
        const imdiFileName = `${session.filePrefix}.imdi`;
        fs.writeFileSync(
          Path.join(
            rootDirectory,
            secondLevel,
            sanitizeForArchive(imdiFileName, true)
          ),
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

      //childrenSubpaths.push(..something for consent if we have it---);

      // ---  Now that we know what all the child imdi's are, we can output the root  ---
      fs.writeFileSync(
        Path.join(rootDirectory, `${project.displayName}.imdi`),
        ImdiGenerator.generateCorpus(project, childrenSubpaths, false)
      );

      // const waitForCopying = () => {
      //   if (filesAreStillCopying()) {
      //     setTimeout(() => waitForCopying(), 1000);
      //   } else {
      //     sentryBreadCrumb("Done with saveImdiBundleToFolder");
      //     resolve();
      //   }
      // };
      // sentryBreadCrumb("saveImdiBundleToFolder waiting for copying to finish");
      // waitForCopying();

      resolve();
    });
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
          CopyManager.safeAsyncCopyFileWithErrorNotification(
            f.describedFilePath,
            Path.join(
              targetDirectory,
              sanitizeForArchive(Path.basename(f.describedFilePath), true)
            ),
            (progressMessage) => {}
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

  // IMDI doesn't have a place for project-level documents, so we have to create this
  // dummy Session to contain them.
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
      const projectDocumentsImdi =
        generator.makePseudoSessionImdiForOtherFolder(name, folder);

      ImdiBundler.WritePseudoSession(
        rootDirectory,
        secondLevel,
        imdiFileName,
        projectDocumentsImdi,
        subpaths,
        copyInProjectFiles,
        folder
      );
    }
  }

  // This is called 3 times, to create folders and imdi files: one for project description documents,
  // other project documents, and a collection of all the consent files we find
  private static WritePseudoSession(
    rootDirectory: string,
    secondLevel: string,
    imdiFileName: string,
    imdiXml: string,
    subpaths: string[],
    copyInProjectFiles: boolean,
    folder: Folder
  ) {
    fs.writeFileSync(
      Path.join(
        rootDirectory,
        secondLevel,
        sanitizeForArchive(imdiFileName, true)
      ),
      imdiXml
    );
    subpaths.push(secondLevel + "/" + imdiFileName);

    const destinationFolderPath = Path.join(
      rootDirectory,
      secondLevel,
      Path.basename(imdiFileName, ".imdi" /* tells basename to strip this off*/)
    );

    if (copyInProjectFiles) {
      this.copyFolderOfFiles(folder.files, destinationFolderPath);
    }
  }

  // IMDI doesn't have a place for consent files, so we have to create this
  // dummy Session to contain them.
  public static addConsentBundle(
    project: Project,
    rootDirectory: string,
    secondLevel: string,
    subpaths: string[],
    // If this is false, we're just making the IMDI files.
    // If true, then we're also copying in most of the project files (but not some Saymore-specific ones).
    copyInProjectFiles: boolean,
    folderFilter: (f: Folder) => boolean,
    omitNamespaces?: boolean
  ) {
    const dir = temp.mkdirSync("imdiConsentBundle");

    // complex: for each session, find each involved person, copy in their
    //   consent. (note, we do go through all these people below, in
    //   addDummyFileForConsentActors)

    // simpler: for each person, for each document, if it is marked as consent,
    //   copy it in for now, we're simply finding all files with the right
    //   pattern and copying them in, where ever they are.
    const filePaths = glob.sync(Path.join(project.directory, "**/*_Consent.*"));

    filePaths.forEach((path) => {
      const dest = Path.join(dir, Path.basename(path));
      // this should be rare, but someone might place a consent file with the name in more than one place in the project
      // enhance: should add unique numbers, as needed, just in case two with the same name are somehow unique
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path, dest);
      }
    });

    const dummySession = Session.fromDirectory(dir, new CustomFieldRegistry());

    dummySession.properties.setText(
      "date",
      moment(new Date()).format("YYYY-MM-DD") // date is the date exported, i.e., today
    );
    dummySession.properties.setText(
      "id",
      project.displayName + " consent documents"
    );
    dummySession.properties.setText(
      "title",
      `Documentation of consent for the contributors to the ${project.properties.getTextStringOrEmpty(
        "title"
      )}`
    );
    dummySession.properties.setText(
      "description",
      `This bundle contains media demonstrating informed consent for sessions in this bundle.`
    );
    dummySession.properties.setText("genre", "Secondary document");
    dummySession.properties.setText("subgenre", "Consent forms");

    ImdiBundler.addDummyFileForConsentActors(project, dummySession);

    const imdiXml = ImdiGenerator.generateSession(
      dummySession,
      project,
      omitNamespaces
    );
    //const imdiFileName = `${dummySession.filePrefix}.imdi`;

    ImdiBundler.WritePseudoSession(
      rootDirectory,
      secondLevel,
      "ConsentDocuments.imdi",
      imdiXml,
      subpaths,
      copyInProjectFiles,
      dummySession
    );
    // we're done with this dummy directory now
    fs.emptyDir(dir);
    fs.remove(dir);
  }

  // We need to have all the consenting people described in the <Actors> portion of the IMDI.
  // So we need this dummy session to contain all the contributions to all sessions in the whole project
  // for which the person has a consent artifcat.
  // That will mean walking through every session of the project, using session.getAllContributionsToAllFiles().
  private static addDummyFileForConsentActors(
    project: Project,
    dummySession: Session
  ) {
    // Session is a *folder*, but only *files* have contributions. So we add this dummy file. The ".skip" extension
    // will cause it to not be listed in the IMDI
    const dummyFileForActors = new File(
      "dummyForAllSessionConsent.skip",
      "dummyForAllSessionConsent.skip",
      "dummy",
      false,
      "dummy",
      false
    );
    project.sessions.forEach((session) => {
      session.getAllContributionsToAllFiles().forEach((contribution) => {
        const p = project.findPerson(contribution.personReference);
        // only add if it has at least one consent file
        if (p && p.files.find((f) => f.isLabeledAsConsent())) {
          // only add each person once (or once for each unique role?)
          if (
            !dummyFileForActors.contributions.find(
              (c) => c.personReference === contribution.personReference
            )
          ) {
            dummyFileForActors.contributions.push(contribution);
          }
        }
      });
    });
    dummySession.files.push(dummyFileForActors);
  }
}
