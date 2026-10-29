import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { exportableSessions, findPersonToExport } from "../model/Project/exportableFolders";
import { Folder } from "../model/Folder/Folder";
import { File } from "../model/file/File";
import * as Path from "path";
import * as fs from "fs-extra";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { sanitizeForExport } from "../other/sanitizeForArchive";
import { taggedAxis } from "../model/field/TextHolderMigration";
import { corpusExportName, fileExportNames, sessionFolderExportNames } from "./exportNames";
import * as temp from "temp";
import { EncounteredVocabularyRegistry } from "../model/Project/EncounteredVocabularyRegistry";
import { NotifyError } from "../components/Notify";
import { CopyManager } from "../other/CopyManager";
import moment from "moment";
import { validateImdiOrThrow } from "./ImdiValidation";
import {
  ExportSessionData,
  ExportCorpusData,
  ExportJobInfo,
  FileCopyRequest,
} from "./ExportBundleTypes";
import { ExportStrings } from "./ExportStringDefinitions";
temp.track(true);

// A person's consent file, and its copy in the session that collects the consent files
interface ConsentFileCopy {
  original: File;
  copy: File;
}

/**
 * Build a multilingual text string from an English value using export string translations.
 * Returns text in the format [[en]]English[[es]]Spanish[[fr]]French if translations exist,
 * or just the plain English text if no translations are available.
 */
function buildMultilingualExportString(englishValue: string, project: Project): string {
  const metadataSlots = Project.getMetadataLanguageSlots();
  if (metadataSlots.length <= 1) {
    // Only one language slot, return plain text
    return englishValue;
  }

  const parts: string[] = [];
  for (const slot of metadataSlots) {
    let translation: string | undefined;
    if (slot.tag === "en" || slot.tag === "eng") {
      translation = englishValue;
    } else {
      translation = project.vocabularyTranslations?.getExportStringTranslation(
        englishValue,
        slot.tag,
      );
    }
    if (translation) {
      parts.push(taggedAxis(slot.tag, translation));
    }
  }

  // If we only got English or no translations, just return plain English
  if (parts.length <= 1) {
    return englishValue;
  }

  return parts.join("");
}

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
    omitNamespaces?: boolean,
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
        `There was a problem getting the directory ${rootDirectory} ready. Maybe close any open Finder/Explorer windows or other programs that might be showing file from that directory, and try again. \r\n\r\n${error}`,
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
      omitNamespaces,
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
            // safeAsyncCopyFileWithErrorNotification has already shown the user any failure.
            CopyManager.safeAsyncCopyFileWithErrorNotification(
              copyReq.source,
              copyReq.destination,
              () => {},
            ).catch((error) =>
              console.error(`Problem copying ${Path.basename(copyReq.source)}: ${String(error)}`),
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
    omitNamespaces?: boolean,
  ): AsyncGenerator<ExportSessionData, ExportCorpusData, void> {
    const extensionWithDot = imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi";
    const secondLevel = sanitizeForExport(Path.basename(project.directory));
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
      copyInProjectFiles,
      ExportStrings.OtherDocuments.title,
      ExportStrings.OtherDocuments.description,
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
      copyInProjectFiles,
      ExportStrings.DescriptionDocuments.title,
      ExportStrings.DescriptionDocuments.description,
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
      omitNamespaces,
    );
    if (consentData) {
      childrenSubpaths.push(secondLevel + "/" + "ConsentDocuments" + extensionWithDot);
      yield consentData;
    }

    // --- Sessions ---
    const sessionFolderNames = sessionFolderExportNames(project);
    const sessions = exportableSessions(project).filter(folderFilter);
    for (const session of sessions) {
      const sessionDirName = sessionFolderNames.get(session)!;
      const sessionData = await this.generateSessionData(
        session,
        project,
        rootDirectory,
        secondLevel,
        sessionDirName,
        imdiMode,
        copyInProjectFiles,
      );
      childrenSubpaths.push(secondLevel + "/" + sessionDirName + extensionWithDot);
      yield sessionData;
    }

    // --- Corpus IMDI (final return value) ---
    const corpusImdi = ImdiGenerator.generateCorpus(
      imdiMode,
      project,
      childrenSubpaths,
      false,
      false, // no lameta comments in a deposit
    );
    await validateImdiOrThrow(corpusImdi, project.displayName);

    const targetDirForProjectFile = Path.join(
      rootDirectory,
      imdiMode === IMDIMode.OPEX ? secondLevel : "",
    );

    return {
      imdiXml: corpusImdi,
      imdiPath: Path.join(targetDirForProjectFile, corpusExportName(project) + extensionWithDot),
      displayName: project.displayName,
    };
  }

  /**
   * Get job info for progress calculation
   */
  public static getExportJobInfo(
    project: Project,
    rootDirectory: string,
    folderFilter: (f: Folder) => boolean,
  ): ExportJobInfo {
    const sessions = exportableSessions(project).filter(folderFilter);
    // +3 for OtherDocs, DescriptionDocs, ConsentBundle (even if some might be empty)
    const totalSessions = sessions.length + 3;

    return {
      totalSessions,
      rootDirectory,
      secondLevelDirectory: sanitizeForExport(Path.basename(project.directory)),
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
    // the session's folder in the export, which also names its IMDI or OPEX file
    sessionDirName: string,
    imdiMode: IMDIMode,
    copyInProjectFiles: boolean,
  ): Promise<ExportSessionData> {
    const extensionWithDot = imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi";
    const imdiFileName = `${sessionDirName}${extensionWithDot}`;

    const sessionImdi = ImdiGenerator.generateSession(
      imdiMode,
      session,
      project,
      undefined,
      false, // no lameta comments in a deposit
    );
    await validateImdiOrThrow(sessionImdi, session.displayName);

    const directoriesToCreate: string[] = [];
    let imdiPath: string;

    if (imdiMode === IMDIMode.OPEX) {
      const sessionOutputDir = Path.join(rootDirectory, secondLevel, sessionDirName);
      directoriesToCreate.push(sessionOutputDir);
      imdiPath = Path.join(sessionOutputDir, imdiFileName);
    } else {
      imdiPath = Path.join(rootDirectory, secondLevel, imdiFileName);
    }

    const filesToCopy: FileCopyRequest[] = [];
    if (copyInProjectFiles) {
      const targetDirectory = Path.join(rootDirectory, secondLevel, sessionDirName);
      directoriesToCreate.push(targetDirectory);

      const fileNames = fileExportNames(
        session.files,
        imdiMode === IMDIMode.OPEX ? imdiFileName : undefined,
      );
      session.files.forEach((f: File) => {
        if (!f.isDeletedLinkFile() && ImdiGenerator.shouldIncludeFile(f.getActualFilePath())) {
          filesToCopy.push({
            source: f.getActualFilePath(),
            destination: Path.join(targetDirectory, fileNames.get(f)!),
          });
        }
      });
    }

    return {
      sessionId: session.id,
      displayName: session.displayName,
      imdiXml: sessionImdi,
      imdiPath,
      directoriesToCreate: [...new Set(directoriesToCreate)], // dedupe
      filesToCopy,
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
    copyInProjectFiles: boolean,
    title: string,
    description: string,
  ): ExportSessionData | null {
    if (folder.files.length === 0) {
      return null;
    }

    const generator = new ImdiGenerator(imdiMode, folder, project);
    generator.writeLametaComments = false; // none in a deposit
    const imdiXml = generator.makePseudoSessionImdiForOtherFolder(
      name,
      folder,
      "Collection description", // genre
      false, // omitNamespaces
      title,
      description,
    );

    const folderName = Path.basename(imdiFileName, imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi");
    const destinationFolderPath = Path.join(rootDirectory, secondLevel, folderName);

    const directoriesToCreate: string[] = [];
    let imdiPath: string;

    if (imdiMode === IMDIMode.OPEX) {
      directoriesToCreate.push(destinationFolderPath);
      imdiPath = Path.join(destinationFolderPath, sanitizeForExport(imdiFileName));
    } else {
      const imdiOnlyFolderPath = Path.join(rootDirectory, secondLevel);
      directoriesToCreate.push(imdiOnlyFolderPath);
      imdiPath = Path.join(imdiOnlyFolderPath, sanitizeForExport(imdiFileName));
    }

    const filesToCopy: FileCopyRequest[] = [];
    if (copyInProjectFiles) {
      directoriesToCreate.push(destinationFolderPath);
      const fileNames = fileExportNames(
        folder.files,
        imdiMode === IMDIMode.OPEX ? sanitizeForExport(imdiFileName) : undefined,
      );
      folder.files.forEach((f: File) => {
        if (!f.isDeletedLinkFile() && ImdiGenerator.shouldIncludeFile(f.getActualFilePath())) {
          filesToCopy.push({
            source: f.getActualFilePath(),
            destination: Path.join(destinationFolderPath, fileNames.get(f)!),
          });
        }
      });
    }

    return {
      sessionId: name,
      displayName: name,
      imdiXml,
      imdiPath,
      directoriesToCreate: [...new Set(directoriesToCreate)],
      filesToCopy,
    };
  }

  /**
   * Creates and populates a dummy session for the consent bundle.
   * This is the shared logic used by both export and preview.
   * Returns the session, temp directory, and each consent file with its copy in the session.
   */
  public static createConsentBundleSession(
    project: Project,
    sessionFilter: (f: Folder) => boolean = () => true,
  ): {
    session: Session;
    tempDir: string;
    consentFileCopies: ConsentFileCopy[];
    hasConsentFiles: boolean;
  } {
    const dir = temp.mkdirSync("imdiConsentBundle");

    const dummySession = Session.fromDirectory(dir, new EncounteredVocabularyRegistry());

    dummySession.properties.setText("date", moment(new Date()).format("YYYY-MM-DD"));
    dummySession.properties.setText("id", "ConsentDocuments");
    // Use multilingual export strings for title and description
    dummySession.properties.setText(
      "title",
      buildMultilingualExportString(ExportStrings.ConsentDocuments.title, project),
    );
    dummySession.properties.setText(
      "description",
      buildMultilingualExportString(ExportStrings.ConsentDocuments.description, project),
    );
    dummySession.properties.setText("genre", "Consent");

    if (project.properties.getTextStringOrEmpty("archiveConfigurationName") === "ELAR") {
      dummySession.properties.setText("access", "S");
      dummySession.properties.setText(
        "accessDescription",
        buildMultilingualExportString(ExportStrings.ConsentDocuments.accessDescription, project),
      );
    }

    const consentFileCopies = ImdiBundler.addDummyFileForConsentActors(
      project,
      sessionFilter,
      dummySession,
      dir,
    );

    const hasConsentFiles = dummySession.files.some(
      (f) => !f.pathInFolderToLinkFileOrLocalCopy.endsWith(".skip"),
    );

    return {
      session: dummySession,
      tempDir: dir,
      consentFileCopies,
      hasConsentFiles,
    };
  }

  /**
   * Cleans up a temp directory created by createConsentBundleSession.
   */
  public static cleanupConsentBundleTempDir(dir: string): void {
    // A temp folder that outlives the export does no harm, so a failure here only gets logged.
    fs.remove(dir).catch((err) =>
      console.warn(`Could not remove temp folder ${dir}: ${String(err)}`),
    );
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
    omitNamespaces?: boolean,
  ): Promise<ExportSessionData | null> {
    const extensionWithDot = imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi";

    // Use the shared helper to create the consent session
    const {
      session: dummySession,
      tempDir: dir,
      consentFileCopies,
      hasConsentFiles,
    } = ImdiBundler.createConsentBundleSession(project, sessionFilter);

    // Collect file copy requests
    const filesToCopy: FileCopyRequest[] = [];
    const destinationFolderPath = Path.join(rootDirectory, secondLevel, "ConsentDocuments");

    // Build filesToCopy from the ORIGINAL consent files (not the temp copies)
    if (copyInProjectFiles) {
      // The consent IMDI links to the copies in the dummy session, so name each original
      // file as the IMDI names its copy
      const copyExportNames = fileExportNames(
        dummySession.files,
        imdiMode === IMDIMode.OPEX ? "ConsentDocuments" + extensionWithDot : undefined,
      );
      consentFileCopies.forEach(({ original, copy }) => {
        if (ImdiGenerator.shouldIncludeFile(original.getActualFilePath())) {
          filesToCopy.push({
            source: original.getActualFilePath(),
            destination: Path.join(destinationFolderPath, copyExportNames.get(copy)!),
          });
        }
      });
    }

    if (!hasConsentFiles && filesToCopy.length === 0) {
      // Clean up and return null if no consent files
      ImdiBundler.cleanupConsentBundleTempDir(dir);
      return null;
    }

    let imdiXml: string;
    try {
      imdiXml = ImdiGenerator.generateSession(
        imdiMode,
        dummySession,
        project,
        omitNamespaces,
        false, // no lameta comments in a deposit
      );
      await validateImdiOrThrow(imdiXml, dummySession.displayName);
    } finally {
      ImdiBundler.cleanupConsentBundleTempDir(dir);
    }

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

    return {
      sessionId: "ConsentDocuments",
      displayName: "ConsentDocuments",
      imdiXml,
      imdiPath,
      directoriesToCreate: [...new Set(directoriesToCreate)],
      filesToCopy,
    };
  }

  // IMDI doesn't have a place for consent files, so we have to create this
  // dummy Session to contain them.
  // Note: This is a legacy method kept for backward compatibility with tests.
  // It delegates to generateConsentBundleData() and then writes the files.
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
    omitNamespaces?: boolean,
  ) {
    const consentData = await this.generateConsentBundleData(
      project,
      rootDirectory,
      secondLevel,
      imdiMode,
      copyInProjectFiles,
      sessionFilter,
      omitNamespaces,
    );

    if (!consentData) {
      // No consent files to export
      return;
    }

    // Update subpaths for the caller
    const extensionWithDot = imdiMode === IMDIMode.OPEX ? ".opex" : ".imdi";
    subpaths.push((secondLevel ? secondLevel + "/" : "") + "ConsentDocuments" + extensionWithDot);

    // Create directories
    for (const dir of consentData.directoriesToCreate) {
      fs.ensureDirSync(dir);
    }

    // Write IMDI XML
    fs.writeFileSync(consentData.imdiPath, consentData.imdiXml);

    // Copy files if requested
    if (copyInProjectFiles && consentData.filesToCopy.length > 0) {
      for (const copyReq of consentData.filesToCopy) {
        try {
          // safeAsyncCopyFileWithErrorNotification has already shown the user any failure.
          CopyManager.safeAsyncCopyFileWithErrorNotification(
            copyReq.source,
            copyReq.destination,
            () => {},
          ).catch((error) =>
            console.error(`Problem copying ${Path.basename(copyReq.source)}: ${String(error)}`),
          );
        } catch (error) {
          console.error(`Problem copying ${Path.basename(copyReq.source)}: ${error}`);
        }
      }
    }
  }

  // We need to have all the consenting people described in the <Actors> portion of the IMDI.
  // So we need this dummy session to contain all the contributions to all sessions in the whole project
  // for which the person has a consent artifcat.
  // That will mean walking through every session of the project, using session.getAllContributionsToAllFiles().
  // Returns each consent file with its copy in the dummy session (for use in file copying).
  private static addDummyFileForConsentActors(
    project: Project,
    sessionFilter: (f: Folder) => boolean,
    dummySession: Session,
    outputFolder: string,
  ): ConsentFileCopy[] {
    // Session is a *folder*, but only *files* have contributions. So we add this dummy file. The ".skip" extension
    // will cause it to not be listed in the IMDI
    const dummyFileForActors = new File(
      "dummyForAllSessionConsent.skip",
      "dummyForAllSessionConsent.skip",
      "dummy",
      false,
      "dummy",
      false,
    );
    const consentFileCopies: ConsentFileCopy[] = [];
    exportableSessions(project)
      .filter(sessionFilter)
      .forEach((session: Session) => {
        session.getAllContributionsToAllFiles().forEach((contribution) => {
          const p = findPersonToExport(project, contribution.personReference);
          if (p) {
            const consentFiles = p.files.filter((f) => f.isLabeledAsConsent());
            // only add if it has at least one consent file
            if (consentFiles && consentFiles.length > 0) {
              // only add each person once (or once for each unique role?)
              if (
                !dummyFileForActors.contributions.find(
                  (c) => c.personReference === contribution.personReference,
                )
              ) {
                // add the contribution, so that the <Actors> section gets what it needs
                dummyFileForActors.contributions.push(contribution);

                // copy over the actual consent files
                // two people can have consent files of the same name, so a copy may get a
                // numbered name; two references can lead to the same person, whose files
                // are then copied once. A linked file whose .link file was deleted has
                // nothing to copy.
                consentFiles.forEach((file) => {
                  if (
                    !file.isDeletedLinkFile() &&
                    !consentFileCopies.some((c) => c.original === file)
                  ) {
                    consentFileCopies.push({
                      original: file,
                      copy: dummySession.copyInOneProjectFile(file, outputFolder),
                    });
                  }
                });
              }
            }
          }
        });
      });
    dummySession.files.push(dummyFileForActors);
    return consentFileCopies;
  }
}
