import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
import { File } from "../model/file/File";
import * as Path from "path";
import * as fs from "fs-extra";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { log } from "util";
import { sentryBreadCrumb } from "../other/errorHandling";
import { sanitizeForArchive } from "../other/sanitizeForArchive";
import * as temp from "temp";
import { CustomFieldRegistry } from "../model/Project/CustomFieldRegistry";
import { NotifyError } from "../components/Notify";
import { CopyManager } from "../other/CopyManager";
import moment from "moment";
import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
temp.track(true);

// This class handles making/copying all the files for an IMDI archive.
export default class ImdiBundler {
  public static async saveImdiBundleToFolder(
    project: Project,
    rootDirectory: string,
    imdiMode: IMDIMode,
    // If this is false, we're just making the IMDI files.
    // If true, then we're also copying in most of the project files (but not some Saymore-specific ones).
    copyInProjectFiles: boolean,
    folderFilter: (f: Folder) => boolean,
    omitNamespaces?: boolean
  ): Promise<void> {
    const extensionWithDot = imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi";
    return new Promise(async (resolve, reject) => {
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
      /* for opex, we want
     myproject_3-6-2019/  <--- rootDirectory
        
        myproject/     <--- "secondLevel"
          myproject.opex
          session1/
            session1.opex
            ...files
          session2/
            session2.opex
             ...files
    */

      const childrenSubpaths: string[] = new Array<string>();
      const secondLevel = Path.basename(project.directory); // ?
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

      try {
        //---- Project Documents -----

        this.outputDocumentFolder(
          project,
          "OtherDocuments",
          "OtherDocuments" + extensionWithDot,
          rootDirectory,
          secondLevel,
          project.otherDocsFolder,
          childrenSubpaths,
          imdiMode,
          copyInProjectFiles
        );

        this.outputDocumentFolder(
          project,
          "DescriptionDocuments",
          "DescriptionDocuments" + extensionWithDot,
          rootDirectory,
          secondLevel,
          project.descriptionFolder,
          childrenSubpaths,
          imdiMode,
          copyInProjectFiles
        );

        // I'm thinking, this only makes sense if we're going to provide the files
        if (copyInProjectFiles) {
          await this.addConsentBundle(
            project,
            rootDirectory,
            secondLevel,
            childrenSubpaths,
            imdiMode,
            copyInProjectFiles,
            folderFilter,
            omitNamespaces
          );
        }

        //---- Sessions ----

        const sessions = project.sessions.items.filter(folderFilter);
        for await (const session of sessions as Array<Session>) {
          const sessionImdi = ImdiGenerator.generateSession(
            imdiMode,
            session,
            project
          );
          try {
            await this.validateImdiOrThrow(sessionImdi, session.displayName);
          } catch (e) {
            console.log(e);
            throw e;
          }
          const imdiFileName = `${session.filePrefix}${extensionWithDot}`;
          if (imdiMode === IMDIMode.OPEX) {
            fs.ensureDirSync(
              Path.join(
                rootDirectory,
                secondLevel,
                Path.basename(session.directory)
              )
            );
          }
          fs.writeFileSync(
            Path.join(
              rootDirectory,
              secondLevel,
              imdiMode === IMDIMode.OPEX
                ? Path.basename(session.directory)
                : "", // with opex, the metadata file goes into the folder it describes. Else, on the level above.
              sanitizeForArchive(imdiFileName, true)
            ),
            sessionImdi
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
        }

        //childrenSubpaths.push(..something for consent if we have it---);

        // ---  Now that we know what all the child imdi's are, we can output the root  ---
        const projectImdi = ImdiGenerator.generateCorpus(
          imdiMode,
          project,
          childrenSubpaths,
          false
        );
        await this.validateImdiOrThrow(projectImdi, project.displayName);
        const targetDirForProjectFile = Path.join(
          rootDirectory,
          imdiMode === IMDIMode.OPEX
            ? Path.basename(Path.basename(project.directory))
            : "" // with opex, the metadata file goes into the folder it describes. Else, on the level above.
        );

        fs.writeFileSync(
          Path.join(
            targetDirForProjectFile,
            `${project.displayName}${extensionWithDot}`
          ),
          projectImdi
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
      } catch (error) {
        reject(`${error.message}`);
        return;
      }
    });
  }
  private static copyFolderOfFiles(files: File[], targetDirectory: string) {
    fs.ensureDirSync(Path.join(targetDirectory));
    let errors = "";
    let count = 0;
    let failed = 0;
    files.forEach((f: File) => {
      if (ImdiGenerator.shouldIncludeFile(f.getActualFilePath())) {
        count++;
        try {
          CopyManager.safeAsyncCopyFileWithErrorNotification(
            f.getActualFilePath(),
            Path.join(
              targetDirectory,
              // TODO: should use the local file name minus the ".link" part, so
              // that renames that change the link name are used.
              sanitizeForArchive(
                f.getNameToUseWhenExportingUsingTheActualFile(),
                true
              )
            ),
            (progressMessage) => {}
          );
        } catch (error) {
          errors =
            errors +
            `Problem copying ${f.getNameToUseWhenExportingUsingTheActualFile()}+\r\n`;
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
    mode: IMDIMode,
    copyInProjectFiles: boolean
  ): void {
    if (folder.files.length > 0) {
      const generator = new ImdiGenerator(mode, folder, project);
      const projectDocumentsImdi = generator.makePseudoSessionImdiForOtherFolder(
        name,
        folder
      );

      ImdiBundler.WritePseudoSession(
        mode,
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
    imdiMode: IMDIMode,
    rootDirectory: string,
    secondLevel: string,
    imdiFileName: string,
    imdiXml: string,
    subpaths: string[],

    copyInProjectFiles: boolean,
    folder: Folder
  ) {
    const destinationFolderPath = Path.join(
      rootDirectory,
      secondLevel,
      Path.basename(
        imdiFileName,
        imdiMode === IMDIMode.OPEX
          ? ".opex"
          : ".imdi" /* tells basename to strip this off*/
      )
    );
    const imdiOnlyFolderPath = Path.join(rootDirectory, secondLevel);
    if (imdiMode === IMDIMode.OPEX) {
      // only in OPEX mode do we create the folder itself
      fs.ensureDirSync(destinationFolderPath);
    } else {
      // in IMDI mode, we create the folder for the imdi file only
      fs.ensureDirSync(imdiOnlyFolderPath);
    }

    //else fs.ensureDirSync(Path.basename(destinationFolderPath));
    const directoryForMetadataXmlFile =
      imdiMode === IMDIMode.OPEX
        ? destinationFolderPath // in there with the files it describes
        : imdiOnlyFolderPath; // one level above the files it describes

    fs.writeFileSync(
      Path.join(
        directoryForMetadataXmlFile,
        sanitizeForArchive(imdiFileName, true)
      ),
      imdiXml
    );
    subpaths.push(secondLevel + "/" + imdiFileName);

    if (copyInProjectFiles) {
      this.copyFolderOfFiles(folder.files, destinationFolderPath);
    }
  }

  // IMDI doesn't have a place for consent files, so we have to create this
  // dummy Session to contain them.
  public static async addConsentBundle(
    project: Project,
    rootDirectory: string,
    secondLevel: string,
    subpaths: string[],
    imdiMode: IMDIMode,
    // If this is false, we're just making the IMDI files.
    // If true, then we're also copying in most of the project files (but not some Saymore-specific ones).
    copyInProjectFiles: boolean,
    sessionFilter: (f: Folder) => boolean,
    omitNamespaces?: boolean
  ) {
    const dir = temp.mkdirSync("imdiConsentBundle");

    // complex: for each session, find each involved person, copy in their
    //   consent. (note, we do go through all these people below, in
    //   addDummyFileForConsentActors)

    // simpler: for each person, for each document, if it is marked as consent,
    //   copy it in for now, we're simply finding all files with the right
    //   pattern and copying them in, whereever they are.

    // TODO: this doesn't take the folderFilter into consideration. Can we do it in addDummyFileForConsentActors() where
    // we are already doing that filtering?
    // const filePaths = glob.sync(Path.join(project.directory, "**/*_Consent.*"));

    // filePaths.forEach((path) => {
    //   const dest = Path.join(dir, Path.basename(path));
    //   // this should be rare, but someone might place a consent file with the name in more than one place in the project
    //   // enhance: should add unique numbers, as needed, just in case two with the same name are somehow unique
    //   if (!fs.existsSync(dest)) {
    //     fs.copyFileSync(path, dest);
    //   }
    // });

    const dummySession = Session.fromDirectory(dir, new CustomFieldRegistry());

    dummySession.properties.setText(
      "date",
      moment(new Date()).format("YYYY-MM-DD") // date is the date exported, i.e., today
    );
    dummySession.properties.setText("id", "ConsentDocuments");
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
    dummySession.properties.setText("genre", "Consent"); // per Notion #241

    // We could eventually gain knowledge of what other archives
    // would want, but for now we just know tha ELAR wants this on consent bundles.
    if (project.properties.getTextStringOrEmpty("accessProtocol") === "ELAR") {
      dummySession.properties.setText("access", "S");
      dummySession.properties.setText("accessDescription", "Consent documents"); // per Notion #241
    }

    ImdiBundler.addDummyFileForConsentActors(
      project,
      sessionFilter,
      dummySession,
      dir
    );

    const imdiXml = ImdiGenerator.generateSession(
      imdiMode,
      dummySession,
      project,
      omitNamespaces
    );

    await this.validateImdiOrThrow(imdiXml, dummySession.displayName);
    //const imdiFileName = `${dummySession.filePrefix}.imdi`;

    ImdiBundler.WritePseudoSession(
      imdiMode,
      rootDirectory,
      secondLevel,
      "ConsentDocuments" + (imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi"),
      imdiXml,
      subpaths,

      copyInProjectFiles,
      dummySession
    );
    // we're done with this dummy directory now
    fs.emptyDir(dir);
    fs.remove(dir);
  }

  private static async validateImdiOrThrow(
    imdiXml: string,
    displayNameForThisFile?: string
  ) {
    if (process.env.VITEST_POOL_ID && process.env.VITEST_WORKER_ID) {
      return; // we don't yet have a way to validate in test environment
    }
    const result = await mainProcessApi.validateImdiAsync(imdiXml);
    if (!result.valid) {
      throw new Error(
        `The IMDI for ${displayNameForThisFile} did not pass validation.\r\n${result.errors
          .map((e) => e.message)
          .join("\r\n")}`
      );
    }
  }

  // We need to have all the consenting people described in the <Actors> portion of the IMDI.
  // So we need this dummy session to contain all the contributions to all sessions in the whole project
  // for which the person has a consent artifcat.
  // That will mean walking through every session of the project, using session.getAllContributionsToAllFiles().
  private static addDummyFileForConsentActors(
    project: Project,
    sessionFilter: (f: Folder) => boolean,
    dummySession: Session,
    outputFolder: string
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
    project.sessions.items.filter(sessionFilter).forEach((session: Session) => {
      session.getAllContributionsToAllFiles().forEach((contribution) => {
        const p = project.findPerson(contribution.personReference);
        if (p) {
          const consentFiles = p.files.filter((f) => f.isLabeledAsConsent());
          // only add if it has at least one consent file
          if (consentFiles && consentFiles.length > 0) {
            // only add each person once (or once for each unique role?)
            if (
              !dummyFileForActors.contributions.find(
                (c) => c.personReference === contribution.personReference
              )
            ) {
              // add the contribution, so that the <Actors> section gets what it needs
              dummyFileForActors.contributions.push(contribution);

              // copy over the actual consent files
              consentFiles.forEach((file) => {
                // note, it should be rare, but someone might place a consent file with the name in more than one place in the project
                // enhance: should add unique numbers, as needed, just in case two with the same name are somehow unique
                dummySession.copyInOneProjectFileIfNotThereAlready(
                  file,
                  outputFolder
                );
              });
            }
          }
        }
      });
    });
    dummySession.files.push(dummyFileForActors);
  }
}
