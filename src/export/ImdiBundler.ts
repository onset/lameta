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
import { EncounteredVocabularyRegistry } from "../model/Project/EncounteredVocabularyRegistry";
import { NotifyError } from "../components/Notify";
import { CopyManager } from "../other/CopyManager";
import moment from "moment";
import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
import {
  ExportSessionData,
  ExportCorpusData,
  ExportJobInfo,
  FileCopyRequest
} from "./ExportBundleTypes";
temp.track(true);

// This class handles making/copying all the files for an IMDI archive.
export default class ImdiBundler {
  /**
   * Save an IMDI bundle to a folder using synchronous file I/O.
   * This is the legacy method that blocks the UI during export.
   * For responsive UI with progress, use generateExportData() instead.
   *
   * Internally uses the generator but writes files synchronously.
   */
  public static async saveImdiBundleToFolder(
    project: Project,
    rootDirectory: string,
    imdiMode: IMDIMode,
    copyInProjectFiles: boolean,
    folderFilter: (f: Folder) => boolean,
    omitNamespaces?: boolean
  ): Promise<void> {
    console.log("[ImdiBundler] saveImdiBundleToFolder started");
    console.log("[ImdiBundler] rootDirectory:", rootDirectory);
    console.log("[ImdiBundler] imdiMode:", imdiMode);

    // Prepare root directory
    try {
      if (fs.existsSync(rootDirectory)) {
        fs.removeSync(rootDirectory);
      }
      fs.ensureDirSync(rootDirectory);
    } catch (error) {
      console.log(error);
      NotifyError(
        `There was a problem getting the directory ${rootDirectory} ready. Maybe close any open Finder/Explorer windows or other programs that might be showing file from that directory, and try again. \r\n\r\n${error}`
      );
      throw error;
    }

    // Use the generator to get export data, then write synchronously
    const generator = this.generateExportData(
      project,
      rootDirectory,
      imdiMode,
      copyInProjectFiles,
      folderFilter,
      omitNamespaces
    );

    let sessionIndex = 0;
    let result = await generator.next();

    // Process each yielded session/folder data
    while (!result.done) {
      const data = result.value;
      sessionIndex++;
      console.log("[ImdiBundler] Processing:", data.displayName, `(${sessionIndex})`);

      // Create directories
      for (const dir of data.directoriesToCreate) {
        fs.ensureDirSync(dir);
      }

      // Write IMDI XML
      fs.writeFileSync(data.imdiPath, data.imdiXml);

      // Copy files if requested
      if (copyInProjectFiles && data.filesToCopy.length > 0) {
        for (const copyReq of data.filesToCopy) {
          try {
            CopyManager.safeAsyncCopyFileWithErrorNotification(
              copyReq.source,
              copyReq.destination,
              () => {}
            );
          } catch (error) {
            console.error(`Problem copying ${Path.basename(copyReq.source)}: ${error}`);
          }
        }
      }

      result = await generator.next();
    }

    // Write corpus IMDI (the generator's return value)
    const corpusData = result.value;
    console.log("[ImdiBundler] Writing corpus IMDI...");
    fs.ensureDirSync(Path.dirname(corpusData.imdiPath));
    fs.writeFileSync(corpusData.imdiPath, corpusData.imdiXml);

    console.log("[ImdiBundler] Export complete");
  }

  /**
   * Async generator that yields export data for each session/folder,
   * allowing the caller to handle file I/O (typically in main process)
   * and report progress between sessions.
   *
   * This is the "hybrid" approach: renderer generates IMDI XML,
   * main process handles all file I/O.
   *
   * @yields ExportSessionData for each session/folder to export
   * @returns ExportCorpusData for the final corpus IMDI
   */
  public static async *generateExportData(
    project: Project,
    rootDirectory: string,
    imdiMode: IMDIMode,
    copyInProjectFiles: boolean,
    folderFilter: (f: Folder) => boolean,
    omitNamespaces?: boolean
  ): AsyncGenerator<ExportSessionData, ExportCorpusData, void> {
    const extensionWithDot = imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi";
    const secondLevel = Path.basename(project.directory);
    const childrenSubpaths: string[] = [];

    // --- Project Documents ---
    const otherDocsData = this.generateDocumentFolderData(
      project,
      "OtherDocuments",
      "OtherDocuments" + extensionWithDot,
      rootDirectory,
      secondLevel,
      project.otherDocsFolder,
      imdiMode,
      copyInProjectFiles
    );
    if (otherDocsData) {
      childrenSubpaths.push(secondLevel + "/" + "OtherDocuments" + extensionWithDot);
      yield otherDocsData;
    }

    const descDocsData = this.generateDocumentFolderData(
      project,
      "DescriptionDocuments",
      "DescriptionDocuments" + extensionWithDot,
      rootDirectory,
      secondLevel,
      project.descriptionFolder,
      imdiMode,
      copyInProjectFiles
    );
    if (descDocsData) {
      childrenSubpaths.push(secondLevel + "/" + "DescriptionDocuments" + extensionWithDot);
      yield descDocsData;
    }

    // --- Consent Bundle ---
    const consentData = await this.generateConsentBundleData(
      project,
      rootDirectory,
      secondLevel,
      imdiMode,
      copyInProjectFiles,
      folderFilter,
      omitNamespaces
    );
    if (consentData) {
      childrenSubpaths.push(secondLevel + "/" + "ConsentDocuments" + extensionWithDot);
      yield consentData;
    }

    // --- Sessions ---
    const sessions = project.sessions.items.filter(folderFilter) as Session[];
    for (const session of sessions) {
      const sessionData = await this.generateSessionData(
        session,
        project,
        rootDirectory,
        secondLevel,
        imdiMode,
        copyInProjectFiles
      );
      childrenSubpaths.push(secondLevel + "/" + session.filePrefix + extensionWithDot);
      yield sessionData;
    }

    // --- Corpus IMDI (final return value) ---
    const corpusImdi = ImdiGenerator.generateCorpus(
      imdiMode,
      project,
      childrenSubpaths,
      false
    );
    await this.validateImdiOrThrow(corpusImdi, project.displayName);

    const targetDirForProjectFile = Path.join(
      rootDirectory,
      imdiMode === IMDIMode.OPEX ? secondLevel : ""
    );

    return {
      imdiXml: corpusImdi,
      imdiPath: Path.join(targetDirForProjectFile, `${project.displayName}${extensionWithDot}`),
      displayName: project.displayName
    };
  }

  /**
   * Get job info for progress calculation
   */
  public static getExportJobInfo(
    project: Project,
    rootDirectory: string,
    folderFilter: (f: Folder) => boolean
  ): ExportJobInfo {
    const sessions = project.sessions.items.filter(folderFilter);
    // +3 for OtherDocs, DescriptionDocs, ConsentBundle (even if some might be empty)
    const totalSessions = sessions.length + 3;

    return {
      totalSessions,
      rootDirectory,
      secondLevelDirectory: Path.basename(project.directory)
    };
  }

  /**
   * Generate export data for a single session
   */
  private static async generateSessionData(
    session: Session,
    project: Project,
    rootDirectory: string,
    secondLevel: string,
    imdiMode: IMDIMode,
    copyInProjectFiles: boolean
  ): Promise<ExportSessionData> {
    const extensionWithDot = imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi";
    const imdiFileName = `${session.filePrefix}${extensionWithDot}`;

    const sessionImdi = ImdiGenerator.generateSession(imdiMode, session, project);
    await this.validateImdiOrThrow(sessionImdi, session.displayName);

    const sessionDirName = Path.basename(session.directory);
    const directoriesToCreate: string[] = [];
    let imdiPath: string;

    if (imdiMode === IMDIMode.OPEX) {
      const sessionOutputDir = Path.join(rootDirectory, secondLevel, sessionDirName);
      directoriesToCreate.push(sessionOutputDir);
      imdiPath = Path.join(sessionOutputDir, sanitizeForArchive(imdiFileName, "ASCII"));
    } else {
      imdiPath = Path.join(rootDirectory, secondLevel, sanitizeForArchive(imdiFileName, "ASCII"));
    }

    const filesToCopy: FileCopyRequest[] = [];
    if (copyInProjectFiles) {
      const targetDirectory = Path.join(rootDirectory, secondLevel, sessionDirName);
      directoriesToCreate.push(targetDirectory);

      session.files.forEach((f: File) => {
        if (ImdiGenerator.shouldIncludeFile(f.getActualFilePath())) {
          filesToCopy.push({
            source: f.getActualFilePath(),
            destination: Path.join(
              targetDirectory,
              sanitizeForArchive(f.getNameToUseWhenExportingUsingTheActualFile(), "ASCII")
            )
          });
        }
      });
    }

    return {
      displayName: session.displayName,
      imdiXml: sessionImdi,
      imdiPath,
      directoriesToCreate: [...new Set(directoriesToCreate)], // dedupe
      filesToCopy
    };
  }

  /**
   * Generate export data for document folders (OtherDocuments, DescriptionDocuments)
   */
  private static generateDocumentFolderData(
    project: Project,
    name: string,
    imdiFileName: string,
    rootDirectory: string,
    secondLevel: string,
    folder: Folder,
    imdiMode: IMDIMode,
    copyInProjectFiles: boolean
  ): ExportSessionData | null {
    if (folder.files.length === 0) {
      return null;
    }

    const generator = new ImdiGenerator(imdiMode, folder, project);
    const imdiXml = generator.makePseudoSessionImdiForOtherFolder(name, folder);

    const folderName = Path.basename(
      imdiFileName,
      imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi"
    );
    const destinationFolderPath = Path.join(rootDirectory, secondLevel, folderName);

    const directoriesToCreate: string[] = [];
    let imdiPath: string;

    if (imdiMode === IMDIMode.OPEX) {
      directoriesToCreate.push(destinationFolderPath);
      imdiPath = Path.join(destinationFolderPath, sanitizeForArchive(imdiFileName, "ASCII"));
    } else {
      const imdiOnlyFolderPath = Path.join(rootDirectory, secondLevel);
      directoriesToCreate.push(imdiOnlyFolderPath);
      imdiPath = Path.join(imdiOnlyFolderPath, sanitizeForArchive(imdiFileName, "ASCII"));
    }

    const filesToCopy: FileCopyRequest[] = [];
    if (copyInProjectFiles) {
      directoriesToCreate.push(destinationFolderPath);
      folder.files.forEach((f: File) => {
        if (ImdiGenerator.shouldIncludeFile(f.getActualFilePath())) {
          filesToCopy.push({
            source: f.getActualFilePath(),
            destination: Path.join(
              destinationFolderPath,
              sanitizeForArchive(f.getNameToUseWhenExportingUsingTheActualFile(), "ASCII")
            )
          });
        }
      });
    }

    return {
      displayName: name,
      imdiXml,
      imdiPath,
      directoriesToCreate: [...new Set(directoriesToCreate)],
      filesToCopy
    };
  }

  /**
   * Generate export data for consent bundle
   */
  private static async generateConsentBundleData(
    project: Project,
    rootDirectory: string,
    secondLevel: string,
    imdiMode: IMDIMode,
    copyInProjectFiles: boolean,
    sessionFilter: (f: Folder) => boolean,
    omitNamespaces?: boolean
  ): Promise<ExportSessionData | null> {
    const extensionWithDot = imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi";
    const dir = temp.mkdirSync("imdiConsentBundle");

    const dummySession = Session.fromDirectory(dir, new EncounteredVocabularyRegistry());

    dummySession.properties.setText("date", moment(new Date()).format("YYYY-MM-DD"));
    dummySession.properties.setText("id", "ConsentDocuments");
    dummySession.properties.setText(
      "title",
      `Documentation of consent for the contributors to the ${project.properties.getTextStringOrEmpty("title")}`
    );
    dummySession.properties.setText(
      "description",
      `This bundle contains media demonstrating informed consent for sessions in this bundle.`
    );
    dummySession.properties.setText("genre", "Consent");

    if (project.properties.getTextStringOrEmpty("archiveConfigurationName") === "ELAR") {
      dummySession.properties.setText("access", "S");
      dummySession.properties.setText("accessDescription", "Consent documents");
    }

    // Collect consent files and contributions
    const filesToCopy: FileCopyRequest[] = [];
    const destinationFolderPath = Path.join(rootDirectory, secondLevel, "ConsentDocuments");

    // addDummyFileForConsentActors returns the original consent files (for use in file copying)
    const originalConsentFiles = ImdiBundler.addDummyFileForConsentActors(project, sessionFilter, dummySession, dir);

    // Build filesToCopy from the ORIGINAL consent files (not the temp copies)
    if (copyInProjectFiles) {
      // Track which files we've already added (by their destination name) to avoid duplicates
      const addedFiles = new Set<string>();
      originalConsentFiles.forEach((f: File) => {
        if (ImdiGenerator.shouldIncludeFile(f.getActualFilePath())) {
          const destName = sanitizeForArchive(f.getNameToUseWhenExportingUsingTheActualFile(), "ASCII");
          if (!addedFiles.has(destName)) {
            addedFiles.add(destName);
            filesToCopy.push({
              source: f.getActualFilePath(),
              destination: Path.join(destinationFolderPath, destName)
            });
          }
        }
      });
    }

    // Check if we have any actual consent content
    const hasConsentContent = dummySession.files.some(
      (f) => !f.pathInFolderToLinkFileOrLocalCopy.endsWith(".skip")
    );

    if (!hasConsentContent && filesToCopy.length === 0) {
      // Clean up and return null if no consent files
      fs.emptyDir(dir);
      fs.remove(dir);
      return null;
    }

    const imdiXml = ImdiGenerator.generateSession(imdiMode, dummySession, project, omitNamespaces);
    await this.validateImdiOrThrow(imdiXml, dummySession.displayName);

    const directoriesToCreate: string[] = [];
    let imdiPath: string;

    if (imdiMode === IMDIMode.OPEX) {
      directoriesToCreate.push(destinationFolderPath);
      imdiPath = Path.join(destinationFolderPath, "ConsentDocuments" + extensionWithDot);
    } else {
      const imdiOnlyFolderPath = Path.join(rootDirectory, secondLevel);
      directoriesToCreate.push(imdiOnlyFolderPath);
      imdiPath = Path.join(imdiOnlyFolderPath, "ConsentDocuments" + extensionWithDot);
    }

    // Clean up temp directory
    fs.emptyDir(dir);
    fs.remove(dir);

    return {
      displayName: "ConsentDocuments",
      imdiXml,
      imdiPath,
      directoriesToCreate: [...new Set(directoriesToCreate)],
      filesToCopy
    };
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
                "ASCII"
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
      const projectDocumentsImdi =
        generator.makePseudoSessionImdiForOtherFolder(name, folder);

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
        sanitizeForArchive(imdiFileName, "ASCII")
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

    const dummySession = Session.fromDirectory(
      dir,
      new EncounteredVocabularyRegistry()
    );

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
    if (
      project.properties.getTextStringOrEmpty("archiveConfigurationName") ===
      "ELAR"
    ) {
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
    console.log("[ImdiBundler] validateImdiOrThrow called for:", displayNameForThisFile);
    if (process.env.VITEST_POOL_ID && process.env.VITEST_WORKER_ID) {
      console.log("[ImdiBundler] Skipping validation in test environment");
      return; // we don't yet have a way to validate in test environment
    }
    console.log("[ImdiBundler] Calling mainProcessApi.validateImdiAsync...");
    const startTime = Date.now();
    const result = await mainProcessApi.validateImdiAsync(imdiXml);
    console.log("[ImdiBundler] validateImdiAsync returned after", Date.now() - startTime, "ms, valid:", result.valid);
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
  // Returns the original consent files that were added (for use in file copying).
  private static addDummyFileForConsentActors(
    project: Project,
    sessionFilter: (f: Folder) => boolean,
    dummySession: Session,
    outputFolder: string
  ): File[] {
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
    const originalConsentFiles: File[] = [];
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
                // Track the original file for later copying
                originalConsentFiles.push(file);
              });
            }
          }
        }
      });
    });
    dummySession.files.push(dummyFileForActors);
    return originalConsentFiles;
  }
}
