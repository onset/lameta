import { Folder } from "../../model/Folder/Folder";
import { Session } from "../../model/Project/Session/Session";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";
import * as Path from "path";
import * as fs from "fs-extra";
import {
  getMimeType,
  GetFileFormatInfoForExtension
} from "../../model/file/FileTypeInfo";
import { Project } from "../../model/Project/Project";
import { Person, PersonMetadataFile } from "../../model/Project/Person/Person";
import {
  resolvePublisher,
  resolveDepositor,
  getContactPersonReference,
  setContactPersonProperties,
  createUnknownContributorEntity
} from "./RoCrateEntityResolver";

// Re-export getContactPersonReference for backward compatibility
export { getContactPersonReference } from "./RoCrateEntityResolver";

/**
 * Helper function to get a text property with proper handling of empty/whitespace values.
 * Returns the default value if the field is empty or contains only whitespace.
 */
function getTextPropertyWithDefault(
  metadataFile: any,
  key: string,
  defaultValue: string
): string {
  const value = metadataFile?.getTextProperty(key, defaultValue);
  // If the value is empty or only whitespace, use the default
  if (!value || !value.trim()) {
    return defaultValue;
  }
  return value;
}

import _ from "lodash";
import {
  getVocabularyMapping,
  createTermDefinition,
  getTermSets,
  getCustomUri,
  sanitizeForIri,
  createFileId,
  createPersonId,
  createPersonFilesDatasetId,
  createSessionId,
  expandLdacId,
  isLdacIdentifier,
  linkContainment,
  createHasPartReferences,
  createIsPartOfReference,
  addToHasPart
} from "./RoCrateUtils";

import {
  createLdacAccessTypeDefinitions,
  createDistinctLicenses,
  RoCrateLicense
} from "./RoCrateLicenseManager";
import { createSessionEntry } from "./RoCrateSessions";
import { makeLdacCompliantPersonEntry } from "./RoCratePeople";
import { RoCrateLanguages } from "./RoCrateLanguages";
import {
  FieldHandlerContext,
  handleLanguageField,
  handleVocabularyField,
  handlePlaceField,
  handleDefaultTemplateField,
  handleRocrateKeyField,
  handlePlainValueField,
  shouldSkipField,
  getFieldValues,
  getElementUsingTemplate
} from "./RoCrateFieldHandlers";

// Re-export getElementUsingTemplate for other modules that import it from here
export { getElementUsingTemplate } from "./RoCrateFieldHandlers";

type RoCrateEntity = {
  "@id": string;
  "@type": string | string[];
  inLanguage?: { "@id": string } | { "@id": string }[];
  [key: string]: unknown;
};

const ARCHIVE_CONFIGURATION_FIELD_KEY = "archiveConfigurationName";
const DESCRIPTION_PROTOCOL_NODE_ID = "#descriptionDocuments";

// Info:
// ./comprehensive-ldac.json <--- the full LDAC profile that we neeed to conform to
// https://www.researchobject.org/ro-crate/
// https://github.com/Language-Research-Technology/ldac-profile/blob/master/profile/profile.md

export async function getRoCrate(
  project: Project,
  folder: Folder
): Promise<object> {
  // For top-level entities (Project or Session when called directly),
  // we need to create the full RO-Crate structure with context and graph

  if (
    folder instanceof Project ||
    (!(folder instanceof Person) && !(folder instanceof Project))
  ) {
    const roCrate: { "@context": any[]; "@graph": object[] } = {
      "@context": [
        "https://w3id.org/ro/crate/1.2/context",
        {
          // Keep the RO-Crate context single-sourced while providing minimal schema.org
          // fallbacks for validators that only ship RO-Crate 1.1 definitions and still need
          // direct access to ldac-prefixed terms.
          ldac: "https://w3id.org/ldac/terms#",
          Dataset: "http://schema.org/Dataset",
          name: "http://schema.org/name",
          description: "http://schema.org/description",
          datePublished: "http://schema.org/datePublished",
          license: "http://schema.org/license"
        }
      ],
      "@graph": []
    };

    const isStandaloneSession =
      !(folder instanceof Project) && !(folder instanceof Person);
    const entries = await getRoCrateInternal(
      project,
      folder,
      isStandaloneSession
    );
    roCrate["@graph"] = Array.isArray(entries) ? entries : [entries];
    roCrate["@graph"] = getUniqueEntries(roCrate["@graph"]);

    // Deduplicate hasPart arrays to prevent duplicate file references
    roCrate["@graph"] = deduplicateHasPartArrays(roCrate["@graph"]);

    return roCrate;
  }

  // For other entities (like Person when called recursively), just return the entries
  return getRoCrateInternal(project, folder, false);
}

async function getRoCrateInternal(
  project: Project,
  folder: Folder,
  isStandaloneSession: boolean = false
): Promise<object | object[]> {
  // Initialize managers
  const rocrateLanguages = new RoCrateLanguages();
  const rocrateLicense = new RoCrateLicense();

  if (folder instanceof Person || (folder as any).folderType === "person") {
    const entry: RoCrateEntity = {
      "@id": createPersonId(folder),
      "@type": "Person"
    };
    const otherEntries: object[] = [];
    await addFieldEntries(
      project,
      folder,
      entry,
      otherEntries,
      rocrateLanguages
    );
    if (
      !entry.inLanguage ||
      (Array.isArray(entry.inLanguage) && entry.inLanguage.length === 0)
    ) {
      // Always expose inLanguage; fall back to Lexvo's UND identifier whenever
      // no working language was captured so LDAC validators stay satisfied.
      rocrateLanguages.getLanguageEntity("und");
      const undeterminedLanguageReference =
        rocrateLanguages.getLanguageReference("und");
      rocrateLanguages.trackUsage("und", entry["@id"] || "./");
      entry.inLanguage = undeterminedLanguageReference;
    }

    // Apply LDAC compliance for direct person export
    // Try to find a session date from the project for age calculation
    const sessionDate = findFirstSessionWithDate(project);

    makeLdacCompliantPersonEntry(folder as Person, sessionDate, entry);

    addChildFileEntries(folder, entry, otherEntries, rocrateLicense, project);
    return [entry, ...getUniqueEntries(otherEntries)];
  }

  // Check if this is a project by looking for sessions property (easier on mocks than checking type)
  if (folder instanceof Project || ("sessions" in folder && folder.sessions)) {
    // The default lameta model (lameta/fields.json5) doesn't have these fields.
    // For now, we can give contact person or use "Unknown" as fallback
    const { reference: contactPersonReference, isUnknown: isUnknownContact } =
      getContactPersonReference(folder as Project);

    const entry: any = {
      "@id": "./",
      "@type": RoCrateLicense.getRepositoryCollectionTypes(),
      conformsTo: {
        "@id": "https://w3id.org/ldac/profile#Collection"
      },
      name:
        folder.metadataFile?.getTextProperty("title") ||
        "No title provided for this project.",
      description: getTextPropertyWithDefault(
        folder.metadataFile,
        "collectionDescription",
        "No description provided for this project."
      ),
      datePublished: new Date().toISOString(),
      // Add required LDAC fields using contactPerson (structured entity reference for better linked data)
      author: contactPersonReference,
      accountablePerson: contactPersonReference,
      "dct:rightsHolder": contactPersonReference,
      // Add a default collection-level license - individual sessions may have their own licenses
      license: { "@id": "#collection-license" },
      hasPart: [],
      "pcdm:hasMember": []
    };

    const boilerplateGraph = [
      {
        "@id": "ro-crate-metadata.json",
        "@type": "CreativeWork",
        conformsTo: { "@id": "https://w3id.org/ro/crate/1.2" },
        about: { "@id": "./" }
      }
    ];

    const otherEntries: object[] = [];
    await addFieldEntries(
      project,
      folder,
      entry,
      otherEntries,
      rocrateLanguages
    );
    addChildFileEntries(folder, entry, otherEntries, rocrateLicense, project);

    const publisher = resolvePublisher(project);
    if (publisher) {
      entry.publisher = publisher.reference;
      // archiveConfigurationName is Lameta-specific, so surface the resolved Organization
      // via holdingArchive instead of leaking the raw custom field name.
      entry.holdingArchive = publisher.reference;
    }

    const depositor = resolveDepositor(project);
    if (depositor) {
      // ldac:depositor must reference a Person entity, not a bare string in the root dataset.
      entry["ldac:depositor"] = depositor.reference;
      otherEntries.push(depositor.entity);
    }

    // Handle project-level geographic coverage (country/continent) as Place entities
    // linked via contentLocation instead of plain string properties
    const contentLocationPlaces: any[] = [];

    // Check for country field
    const countryValue = folder.metadataFile
      ?.getTextProperty("country", "")
      .trim();
    if (countryValue && countryValue !== "unspecified") {
      const countryPlaceId = `#place-country-${sanitizeForIri(countryValue)}`;
      const countryPlace: any = {
        "@id": countryPlaceId,
        "@type": "Place",
        name: countryValue
      };

      // Check if we also have continent to add to description
      const continentValue = folder.metadataFile
        ?.getTextProperty("continent", "")
        .trim();
      if (continentValue && continentValue !== "unspecified") {
        countryPlace.description = `Located in ${continentValue}`;
      }

      otherEntries.push(countryPlace);
      contentLocationPlaces.push({ "@id": countryPlaceId });
    } else {
      // If no country but we have continent, create a Place for continent
      const continentValue = folder.metadataFile
        ?.getTextProperty("continent", "")
        .trim();
      if (continentValue && continentValue !== "unspecified") {
        const continentPlaceId = `#place-continent-${sanitizeForIri(
          continentValue
        )}`;
        const continentPlace: any = {
          "@id": continentPlaceId,
          "@type": "Place",
          name: continentValue
        };

        otherEntries.push(continentPlace);
        contentLocationPlaces.push({ "@id": continentPlaceId });
      }
    }

    // Add contentLocation to entry if we have any places
    if (contentLocationPlaces.length > 0) {
      entry.contentLocation = contentLocationPlaces;
    }

    // Add unknown contributor entity if using fallback so references remain resolvable
    if (isUnknownContact) {
      otherEntries.push(createUnknownContributorEntity());
    }

    if (publisher) {
      otherEntries.push(publisher.entity);
    }

    const sessionEntries = await Promise.all(
      project.sessions.items.map(async (session) => {
        return await createSessionEntry(
          project,
          session as Session,
          false,
          rocrateLanguages,
          rocrateLicense,
          publisher
        );
      })
    );
    const flattenedSessionEntries = sessionEntries.flat();

    // Link to session events in the root dataset using pcdm:hasMember
    project.sessions.items.forEach((session) => {
      entry["pcdm:hasMember"].push({
        "@id": createSessionId(session)
      });
    });

    // LAM-99: Create Sessions/ Dataset hierarchy for RO-Crate 1.2 compliance
    // Data entities (files) must be reachable from root via hasPart chain
    // See: https://linear.app/lameta/issue/LAM-99/add-sessions-dataset
    const sessionsDatasetEntries = createSessionsDatasetHierarchy(
      project,
      flattenedSessionEntries,
      entry.license
    );
    if (sessionsDatasetEntries.length > 0) {
      // Add Sessions/ to root hasPart
      entry.hasPart.push({ "@id": "Sessions/" });
    }

    // LAM-102: Create DescriptionDocuments/ Dataset to wrap description files.
    // This ensures files are reachable from root via hasPart chain (RO-Crate 1.2 compliance).
    // The CollectionProtocol still exists for LDAC compliance - it references the same files
    // but files' isPartOf points to the Dataset.
    // See: https://linear.app/lameta/issue/LAM-102/add-descriptiondocuments-dataset
    let descDocsDatasetEntry: RoCrateEntity | undefined;
    if (
      project.descriptionFolder &&
      project.descriptionFolder.files.length > 0
    ) {
      // First, create the DescriptionDocuments/ Dataset (this also creates file entries)
      descDocsDatasetEntry = createDescriptionDocumentsDataset(
        project.descriptionFolder,
        otherEntries,
        rocrateLicense,
        entry,
        project
      );

      if (descDocsDatasetEntry) {
        // Add Dataset to root's hasPart for RO-Crate 1.2 compliance
        entry.hasPart.push({ "@id": descDocsDatasetEntry["@id"] });

        // Get file IDs from the Dataset's hasPart
        const fileIds = descDocsDatasetEntry.hasPart
          ? (descDocsDatasetEntry.hasPart as { "@id": string }[]).map(
              (p) => p["@id"]
            )
          : [];

        // Find earliest file date from the created file entries
        let earliestFileDate: Date | undefined;
        otherEntries.forEach((entry: any) => {
          if (fileIds.includes(entry["@id"]) && entry.dateCreated) {
            const fileDate = new Date(entry.dateCreated);
            if (!earliestFileDate || fileDate < earliestFileDate) {
              earliestFileDate = fileDate;
            }
          }
        });

        // Create the CollectionProtocol for LDAC compliance
        // Note: Files' isPartOf already points to DescriptionDocuments/ Dataset (set in createDescriptionDocumentsDataset)
        // but the Protocol still references them via hasPart for LDAC discoverability
        if (fileIds.length > 0) {
          const protocolEntry = createDescriptionCollectionProtocolEntry(
            project,
            fileIds,
            contactPersonReference,
            entry.datePublished,
            earliestFileDate
          );

          otherEntries.push(protocolEntry);
          const protocolReference = { "@id": protocolEntry["@id"] };

          const currentProtocols = entry["ldac:hasCollectionProtocol"];

          if (!currentProtocols) {
            entry["ldac:hasCollectionProtocol"] = [protocolReference];
          } else if (Array.isArray(currentProtocols)) {
            const alreadyPresent = currentProtocols.some(
              (item: any) => item?.["@id"] === protocolReference["@id"]
            );
            if (!alreadyPresent) {
              currentProtocols.push(protocolReference);
            }
          } else if (currentProtocols["@id"] !== protocolReference["@id"]) {
            entry["ldac:hasCollectionProtocol"] = [
              currentProtocols,
              protocolReference
            ];
          }
        }
      }
    }

    // LAM-101: Create OtherDocuments/ Dataset to group miscellaneous project documents
    // Similar to Sessions/ (LAM-99), files are nested under a Dataset for RO-Crate 1.2 compliance.
    // See: https://linear.app/lameta/issue/LAM-101/add-otherdocuments-dataset
    let otherDocsDatasetEntry: RoCrateEntity | undefined;
    if (project.otherDocsFolder && project.otherDocsFolder.files.length > 0) {
      otherDocsDatasetEntry = createOtherDocumentsDataset(
        project.otherDocsFolder,
        otherEntries,
        rocrateLicense,
        entry,
        project
      );
      if (otherDocsDatasetEntry) {
        entry.hasPart.push({ "@id": otherDocsDatasetEntry["@id"] });
      }
    }

    // Create unique licenses for all sessions
    const uniqueLicenses = createDistinctLicenses(
      project.sessions.items as Session[],
      project
    );

    // Add a collection-level license definition
    const collectionLicense = {
      "@id": "#collection-license",
      "@type": expandLdacId("ldac:DataReuseLicense"),
      name: "Collection License",
      description:
        "License for the collection as a whole. Individual items may have their own specific licenses.",
      "ldac:access": { "@id": expandLdacId("ldac:OpenAccess") }
    };

    // LAM-92: Collect used access types from all licenses to avoid orphaned entities
    // Only include LDAC access type definitions that are actually referenced
    // https://linear.app/lameta/issue/LAM-92/ro-crate-contextual-entities-not-referenced-orphaned-entities-hewya
    const usedAccessTypes = new Set<string>();
    uniqueLicenses.forEach((license: any) => {
      if (license["ldac:access"]?.["@id"]) {
        usedAccessTypes.add(license["ldac:access"]["@id"]);
      }
    });
    // Also include the collection license's access type
    if (collectionLicense["ldac:access"]?.["@id"]) {
      usedAccessTypes.add(collectionLicense["ldac:access"]["@id"]);
    }

    // Add LDAC access type definitions for only the types that are actually used
    const ldacAccessDefinitions =
      createLdacAccessTypeDefinitions(usedAccessTypes);

    const uniqueOtherEntries = getUniqueEntries(otherEntries);

    const baseGraph = [
      entry,
      ...flattenedSessionEntries,
      ...sessionsDatasetEntries, // LAM-99: Sessions/ Dataset hierarchy
      ...boilerplateGraph,
      ...ldacAccessDefinitions,
      ...uniqueLicenses,
      collectionLicense,
      ...rocrateLanguages.getUsedLanguageEntities(),
      ...uniqueOtherEntries
    ];

    // LAM-102: Add DescriptionDocuments/ Dataset if it exists
    if (descDocsDatasetEntry) {
      baseGraph.push(descDocsDatasetEntry);
    }

    // LAM-101: Add OtherDocuments/ Dataset if it exists
    if (otherDocsDatasetEntry) {
      baseGraph.push(otherDocsDatasetEntry);
    }

    // Add a People dataset container so Person nodes hang off a proper directory entity.
    // LAM-98: Now returns an array including People/ plus individual person-files Datasets.
    const peopleDatasetEntries = createPeopleDatasetEntry(
      project,
      flattenedSessionEntries,
      uniqueOtherEntries,
      entry.license
    );
    if (peopleDatasetEntries && peopleDatasetEntries.length > 0) {
      // The first entry is always the People/ Dataset
      entry.hasPart.push({ "@id": peopleDatasetEntries[0]["@id"] });
      baseGraph.push(...peopleDatasetEntries);
    }

    return baseGraph;
  }

  // otherwise, it's a session - but we need to check if we're being called
  // from within a project export or as a standalone session export
  const session = folder as Session;

  return await createSessionEntry(
    project,
    session,
    isStandaloneSession,
    rocrateLanguages,
    rocrateLicense,
    resolvePublisher(project)
  );
}

export function addFieldIfNotEmpty(
  folder: Folder,
  fieldKey: string,
  outputProperty: string,
  entry: any
) {
  const value = folder.metadataFile?.getTextProperty(fieldKey, "").trim();
  if (value) entry[outputProperty] = value;
}

// for every field in fields.json5, if it's in the folder, add it to the rocrate
// Delegates to specialized handlers so this function stays focused on orchestration
// instead of housing a long list of one-off field conditionals.
export async function addFieldEntries(
  project: Project,
  folder: Folder,
  folderEntry: object,
  otherEntries: object[],
  rocrateLanguages: RoCrateLanguages
) {
  // First handle the known fields
  for (const field of folder.knownFields) {
    const values: string[] = getFieldValues(folder, field);

    // Check if this field should be skipped
    if (shouldSkipField(field, folder, values)) {
      continue;
    }

    const propertyKey = field.rocrate?.key || field.key;

    // Build context for handlers
    const context: FieldHandlerContext = {
      project,
      folder,
      field,
      values,
      folderEntry,
      otherEntries,
      rocrateLanguages,
      propertyKey
    };

    // Try each handler in priority order - first one to return true wins
    if (handleLanguageField(context)) continue;
    if (handleVocabularyField(context)) continue;
    if (handlePlaceField(context)) continue;
    if (handleDefaultTemplateField(context)) continue;
    if (handleRocrateKeyField(context)) continue;
    handlePlainValueField(context);
  }

  // Handle custom fields from the properties
  handleCustomFields(folder, folderEntry);
}

/**
 * Handles custom fields from folder properties.
 * These are user-defined fields not in the standard field definitions.
 */
function handleCustomFields(folder: Folder, folderEntry: object): void {
  folder.metadataFile!.properties.forEach((key, field) => {
    if (!field.definition || !field.definition.isCustom) return;

    // For Person entities, skip custom fields entirely since we don't know if they contain PII
    if (folder instanceof Person) {
      return;
    }

    if (key === ARCHIVE_CONFIGURATION_FIELD_KEY) {
      // archiveConfigurationName already maps to holdingArchive above; skip the raw field.
      return;
    }

    if (key === "depositor") {
      // ldac:depositor is emitted as a structured entity reference, so ignore the raw string value.
      return;
    }

    // Skip if this was already handled as a known field
    if (folder.knownFields.some((k) => k.key === key)) {
      return;
    }

    // don't export if we know it has been migrated
    const definition = folder.metadataFile!.properties.getFieldDefinition(key);
    if (
      definition &&
      definition.deprecated &&
      definition.deprecated.indexOf("migrated") > -1
    ) {
      return;
    }

    const value = field.text?.trim();
    if (value && value !== "unspecified") {
      folderEntry[key] = value;
    }
  });
}

export function getRoCrateTemplate(field: any): any {
  if (field.rocrate?.handler === "languages") {
    const languageField = fieldDefinitionsOfCurrentConfig.common.find(
      (f) => f.key === "language"
    );
    return languageField?.rocrate?.template;
  }

  if (field.rocrate?.handler === "person") {
    const personField = fieldDefinitionsOfCurrentConfig.common.find(
      (f) => f.key === "person"
    );
    return personField?.rocrate?.template;
  }

  // no handler specified, assume this is just a normal value but one that we want to list as "[ {@id:'#blah'} ]"
  return field.rocrate?.template;
}

/**
 * Adds license information to a file entry according to LDAC spec requirements.
 * Per LDAC spec, files must have license properties, so we inherit from parent when needed.
 */
function addFileLicenseProperty(
  fileEntry: any,
  filePath: string,
  rocrateLicense: RoCrateLicense,
  folder?: Folder,
  parentEntry?: any,
  project?: Project
): void {
  // For session files, ensure they inherit the session license first
  // This must happen before checking existing licenses to normalize any raw values
  if (folder instanceof Session) {
    const file = folder.files.find((f) => f.getActualFilePath() === filePath);
    if (file) {
      rocrateLicense.ensureFileLicense(file, folder as Session, project);
      const inheritedLicense = rocrateLicense.getFileLicense(filePath);
      if (inheritedLicense) {
        fileEntry.license = { "@id": inheritedLicense };
        return;
      }
    }
  }

  // Check if file already has its own license (after normalization)
  const fileLicense = rocrateLicense.getFileLicense(filePath);
  if (fileLicense) {
    fileEntry.license = { "@id": fileLicense };
    return;
  }

  // For other files (project files, person files), inherit from parent
  if (
    parentEntry?.license &&
    typeof parentEntry.license === "object" &&
    parentEntry.license["@id"]
  ) {
    fileEntry.license = { "@id": parentEntry.license["@id"] };
  }
}

/**
 * Options for building a file entry in the RO-Crate graph. Shared by session and project helpers
 * so the logic for deriving @type, license links, and file metadata lives in one place.
 */
interface BuildFileEntryOptions {
  /** The file object from the folder */
  file: any;
  /** The @id to use for this file entity */
  fileId: string;
  /** The RoCrateLicense manager for license handling */
  rocrateLicense: RoCrateLicense;
  /** Optional folder containing this file (for session license inheritance) */
  folder?: Folder;
  /** Optional parent entry for license inheritance */
  parentEntry?: any;
  /** Optional project for license normalization */
  project?: Project;
}

/**
 * Result from building a file entry.
 */
interface BuildFileEntryResult {
  /** The built file entry object for the RO-Crate graph */
  fileEntry: any;
  /** File stats (birthtime, mtime) for optional further processing */
  stats: fs.Stats;
}

/**
 * Builds a file entry for the RO-Crate graph with all common properties while avoiding
 * duplicate logic between session exports and project document exports.
 *
 * @param options - Configuration for building the file entry
 * @returns The built file entry and file stats
 */
function buildFileEntry(options: BuildFileEntryOptions): BuildFileEntryResult {
  const { file, fileId, rocrateLicense, folder, parentEntry, project } =
    options;
  const path = file.getActualFilePath();
  const fileName = Path.basename(path);
  const fileExt = Path.extname(fileName).toLowerCase();

  // Determine the appropriate @type based on file extension and context. Every file entity must
  // include "File", and media assets also advertise the matching schema.org MediaObject type so
  // downstream tooling can distinguish audio/video/image content.
  const fileTypes: string[] = ["File"];

  // Use FileTypeInfo to get the file format information
  const fileFormatInfo = GetFileFormatInfoForExtension(
    fileExt.replace(".", "")
  );

  if (fileFormatInfo?.type === "Video") {
    fileTypes.push("VideoObject");
  } else if (fileFormatInfo?.type === "Audio") {
    fileTypes.push("AudioObject");
  } else if (fileFormatInfo?.type === "Image") {
    fileTypes.push("ImageObject");
  } else if (fileExt.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/)) {
    // Fallback for image extensions not in FileTypeInfo
    fileTypes.push("ImageObject");
  } else if (fileExt.match(/\.(mp3|wav|m4a|aac|flac)$/)) {
    // Fallback for audio extensions not in FileTypeInfo
    fileTypes.push("AudioObject");
  }
  // Non-media files intentionally remain typed solely as ["File"].

  const normalizedFileType = fileTypes.length === 1 ? fileTypes[0] : fileTypes;

  const stats = fs.statSync(path);
  const fileEntry: any = {
    "@id": fileId,
    "@type": normalizedFileType,
    contentSize: stats.size,
    dateCreated: stats.birthtime.toISOString(),
    dateModified: file.getModifiedDate()?.toISOString(),
    encodingFormat: getMimeType(fileExt.replace(/\./g, "")),
    name: fileName
  };

  // Add license information - per LDAC spec, files must have license properties
  addFileLicenseProperty(
    fileEntry,
    path,
    rocrateLicense,
    folder,
    parentEntry,
    project
  );

  return { fileEntry, stats };
}

export function addChildFileEntries(
  folder: Folder,
  folderEntry: object,
  otherEntries: object[],
  rocrateLicense: RoCrateLicense,
  project?: Project
): void {
  if (folder.files.length === 0) return;
  const isPersonFolder = (folder as any).folderType === "person";

  // LAM-103: Session CollectionEvent entities (e.g., #session-ETR008) should NOT have hasPart.
  // Files belong to the session directory Dataset (Sessions/sessionId/), not the CollectionEvent.
  // The CollectionEvent and Dataset are linked via bidirectional subjectOf/about relationships.
  // Only standalone sessions (exported alone, where @id is "./") need hasPart.
  // https://linear.app/lameta/issue/LAM-103/fix-relation
  const folderId = (folderEntry as any)["@id"];
  const isNonStandaloneSession =
    typeof folderId === "string" && folderId.startsWith("#session-");

  const shouldAssignHasPart = !isPersonFolder && !isNonStandaloneSession;

  if (shouldAssignHasPart) {
    folderEntry["hasPart"] = [];
  }

  const appendReference = (current: any, fileId: string) => {
    const reference = { "@id": fileId };
    if (!current) {
      return reference;
    }
    if (Array.isArray(current)) {
      const alreadyPresent = current.some(
        (entry) => typeof entry === "object" && entry["@id"] === fileId
      );
      if (!alreadyPresent) {
        current.push(reference);
      }
      return current;
    }
    if (typeof current === "object" && current["@id"] === fileId) {
      return current;
    }
    return [current, reference];
  };

  folder.files.forEach((file) => {
    const path = file.getActualFilePath();
    const fileName = Path.basename(path);

    // Skip RO-Crate metadata files to avoid circular references
    if (fileName.startsWith("ro-crate")) {
      return;
    }

    // Use centralized file ID generation to ensure consistency
    const fileId = createFileId(folder, fileName);

    // Use the shared helper so file metadata, licenses, and @type logic stay consistent
    const { fileEntry } = buildFileEntry({
      file,
      fileId,
      rocrateLicense,
      folder,
      parentEntry: folderEntry,
      project
    });

    otherEntries.push(fileEntry);
    if (shouldAssignHasPart) {
      // Use utility function for consistent containment relationship handling
      linkContainment(folderEntry, fileEntry);
    }

    if (isPersonFolder) {
      const target = folderEntry as any;
      const entryTypes = Array.isArray(fileEntry["@type"])
        ? fileEntry["@type"]
        : [fileEntry["@type"]];
      const hasImageType = entryTypes.includes("ImageObject");
      // Person entities cannot use hasPart, so expose related files via schema.org links instead
      if (hasImageType) {
        target.image = appendReference(target.image, fileId);
      } else {
        target.subjectOf = appendReference(target.subjectOf, fileId);
      }
      // Provide the about inverse for both image and subjectOf so references remain bidirectional
      fileEntry.about = { "@id": target["@id"] };
    }
  });
}

export function addProjectDocumentFolderEntries(
  folder: Folder,
  folderType: string,
  projectEntry: any,
  otherEntries: object[],
  rocrateLicense: RoCrateLicense,
  project?: Project,
  options?: { attachToRootHasPart?: boolean; parentId?: string }
): { fileIds: string[]; earliestFileDate?: Date } {
  const result: { fileIds: string[]; earliestFileDate?: Date } = {
    fileIds: [],
    earliestFileDate: undefined
  };

  if (folder.files.length === 0) return result;

  const attachToRootHasPart = options?.attachToRootHasPart !== false;
  const parentId = options?.parentId || "./";

  folder.files.forEach((file) => {
    const path = file.getActualFilePath();
    const fileName = Path.basename(path);

    // Skip RO-Crate metadata files to avoid circular references
    if (fileName.startsWith("ro-crate")) {
      return;
    }

    // Create file ID using folder type
    const fileId = `${folderType}/${sanitizeForIri(fileName)}`;

    // Use the shared helper to build the file entry. Description and other project documents should
    // not declare ldac:materialType because these files describe the collection rather than serving
    // as LDAC annotations.
    const { fileEntry, stats } = buildFileEntry({
      file,
      fileId,
      rocrateLicense,
      folder: undefined, // No folder for project documents - license inheritance differs
      parentEntry: projectEntry,
      project
    });

    otherEntries.push(fileEntry);
    // Use utility function for consistent containment relationship handling
    linkContainment(projectEntry, fileEntry, {
      skipHasPart: !attachToRootHasPart,
      parentIdOverride: parentId
    });

    const preferredDate = file.getModifiedDate?.() || stats.birthtime;
    if (preferredDate instanceof Date) {
      if (!result.earliestFileDate || preferredDate < result.earliestFileDate) {
        result.earliestFileDate = preferredDate;
      }
    }

    result.fileIds.push(fileId);
  });

  return result;
}

/**
 * Removes duplicate entries from hasPart arrays in RO-Crate entities.
 * Duplicates are identified by their @id values.
 */
function deduplicateHasPartArrays(graph: any[]): any[] {
  return graph.map((entity) => {
    if (entity.hasPart && Array.isArray(entity.hasPart)) {
      const seen = new Set<string>();
      entity.hasPart = entity.hasPart.filter((item: any) => {
        const id = item["@id"];
        if (seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      });
    }
    return entity;
  });
}

/**
 * LAM-99: Creates a Sessions/ Dataset hierarchy for RO-Crate 1.2 compliance.
 * Data entities (files) must be reachable from the root via hasPart chain.
 *
 * Creates:
 * - Sessions/ Dataset (parent of all session directories)
 * - Sessions/{sessionId}/ Dataset for each session (contains session files)
 *
 * Updates file entries' isPartOf to point to their session directory Dataset.
 */
function createSessionsDatasetHierarchy(
  project: Project,
  flattenedSessionEntries: any[],
  license?: any
): RoCrateEntity[] {
  if (project.sessions.items.length === 0) {
    return [];
  }

  const results: RoCrateEntity[] = [];
  const sessionsDatasetHasPart: { "@id": string }[] = [];

  // Group file entries by session directory
  // Files have IDs like "Sessions/ETR008/ETR008.session"
  // Session events have IDs like "#session-ETR008"
  const filesBySessionDir = new Map<string, any[]>();

  flattenedSessionEntries.forEach((entry: any) => {
    const id = entry["@id"];
    if (!id || typeof id !== "string") return;

    // Skip session event entities (fragments like #session-ETR008)
    if (id.startsWith("#")) return;

    // Only process files in Sessions/ directory
    if (!id.startsWith("Sessions/")) return;

    // Extract session directory from file path: "Sessions/ETR008/file.ext" -> "Sessions/ETR008/"
    const parts = id.split("/");
    if (parts.length < 3) return; // Need at least Sessions/sessionId/filename

    const sessionDirId = `Sessions/${parts[1]}/`;
    const existing = filesBySessionDir.get(sessionDirId) || [];
    existing.push(entry);
    filesBySessionDir.set(sessionDirId, existing);
  });

  // Create a Dataset for each session directory
  filesBySessionDir.forEach((files, sessionDirId) => {
    // Extract session name from directory ID
    const sessionName = sessionDirId.split("/")[1];

    // LAM-100: Link session directory Dataset to its CollectionEvent via `about`
    // The Dataset contains the files and is "about" the CollectionEvent (the session metadata).
    // The inverse (CollectionEvent.subjectOf -> Dataset) is added in RoCrateSessions.ts.
    // See: https://linear.app/lameta/issue/LAM-100/new-session-structure
    const sessionEventId = `#session-${sessionName}`;

    const fileIds = files.map((file: any) => file["@id"]);
    const sessionDirDataset: RoCrateEntity = {
      "@id": sessionDirId,
      "@type": "Dataset",
      name: `Session ${sessionName}`,
      description: `Files for session ${sessionName}.`,
      hasPart: createHasPartReferences(fileIds),
      isPartOf: createIsPartOfReference("Sessions/"),
      about: { "@id": sessionEventId } // LAM-100: Dataset is about the CollectionEvent
    };

    if (license && typeof license === "object") {
      sessionDirDataset.license = license;
    }

    results.push(sessionDirDataset);
    sessionsDatasetHasPart.push({ "@id": sessionDirId });

    // Update file entries' isPartOf to point to session directory Dataset
    files.forEach((file: any) => {
      file.isPartOf = createIsPartOfReference(sessionDirId);
    });
  });

  // Sort hasPart for consistency
  sessionsDatasetHasPart.sort((a, b) => a["@id"].localeCompare(b["@id"]));

  // Create the main Sessions/ Dataset
  const sessionsDataset: RoCrateEntity = {
    "@id": "Sessions/",
    "@type": "Dataset",
    name: "Sessions",
    description: "Directory of sessions in this collection.",
    hasPart: sessionsDatasetHasPart,
    isPartOf: { "@id": "./" }
  };

  if (license && typeof license === "object") {
    sessionsDataset.license = license;
  }

  // Return with Sessions/ first, then individual session directories
  return [sessionsDataset, ...results];
}

/**
 * LAM-102: Creates a DescriptionDocuments/ Dataset for RO-Crate 1.2 compliance.
 * Similar to OtherDocuments/ (LAM-101) and Sessions/ (LAM-99), this groups
 * description documents under a dedicated Dataset so files are reachable from
 * root via hasPart chain.
 *
 * The existing #descriptionDocuments CollectionProtocol remains for LDAC compliance,
 * but the files' isPartOf now points to the Dataset rather than the Protocol.
 *
 * See: https://linear.app/lameta/issue/LAM-102/add-descriptiondocuments-dataset
 */
function createDescriptionDocumentsDataset(
  descriptionFolder: Folder,
  otherEntries: object[],
  rocrateLicense: RoCrateLicense,
  projectEntry: any,
  project?: Project
): RoCrateEntity | undefined {
  if (!descriptionFolder || descriptionFolder.files.length === 0) {
    return undefined;
  }

  const datasetId = "DescriptionDocuments/";
  const fileIds: string[] = [];

  // Process each file in the DescriptionDocuments folder
  descriptionFolder.files.forEach((file) => {
    const path = file.getActualFilePath();
    const fileName = Path.basename(path);

    // Skip RO-Crate metadata files to avoid circular references
    if (fileName.startsWith("ro-crate")) {
      return;
    }

    const fileId = `DescriptionDocuments/${sanitizeForIri(fileName)}`;

    // Build the file entry using shared helper
    const { fileEntry } = buildFileEntry({
      file,
      fileId,
      rocrateLicense,
      folder: undefined, // No folder for project documents
      parentEntry: projectEntry,
      project
    });

    // LAM-102: File's isPartOf points to the DescriptionDocuments/ Dataset
    fileEntry.isPartOf = createIsPartOfReference(datasetId);

    otherEntries.push(fileEntry);
    fileIds.push(fileId);
  });

  // Create the DescriptionDocuments/ Dataset
  const descDocsDataset: RoCrateEntity = {
    "@id": datasetId,
    "@type": "Dataset",
    name: "Description Documents",
    description:
      "Documents describing the collection methodology and protocols.",
    hasPart: createHasPartReferences(fileIds),
    isPartOf: createIsPartOfReference("./")
  };

  // Inherit collection license
  if (
    projectEntry?.license &&
    typeof projectEntry.license === "object" &&
    projectEntry.license["@id"]
  ) {
    descDocsDataset.license = { "@id": projectEntry.license["@id"] };
  }

  return descDocsDataset;
}

/**
 * LAM-101: Creates an OtherDocuments/ Dataset for RO-Crate 1.2 compliance.
 * Similar to Sessions/, this groups miscellaneous project documents under a
 * dedicated Dataset so files are reachable from root via hasPart chain.
 *
 * See: https://linear.app/lameta/issue/LAM-101/add-otherdocuments-dataset
 */
function createOtherDocumentsDataset(
  otherDocsFolder: Folder,
  otherEntries: object[],
  rocrateLicense: RoCrateLicense,
  projectEntry: any,
  project?: Project
): RoCrateEntity | undefined {
  if (!otherDocsFolder || otherDocsFolder.files.length === 0) {
    return undefined;
  }

  const datasetId = "OtherDocuments/";
  const fileIds: string[] = [];

  // Process each file in the OtherDocuments folder
  otherDocsFolder.files.forEach((file) => {
    const path = file.getActualFilePath();
    const fileName = Path.basename(path);

    // Skip RO-Crate metadata files to avoid circular references
    if (fileName.startsWith("ro-crate")) {
      return;
    }

    const fileId = `OtherDocuments/${sanitizeForIri(fileName)}`;

    // Build the file entry using shared helper
    const { fileEntry } = buildFileEntry({
      file,
      fileId,
      rocrateLicense,
      folder: undefined, // No folder for project documents
      parentEntry: projectEntry,
      project
    });

    // LAM-101: File's isPartOf points to the OtherDocuments/ Dataset, not root
    fileEntry.isPartOf = createIsPartOfReference(datasetId);

    otherEntries.push(fileEntry);
    fileIds.push(fileId);
  });

  // Create the OtherDocuments/ Dataset
  const otherDocsDataset: RoCrateEntity = {
    "@id": datasetId,
    "@type": "Dataset",
    name: "Other Documents",
    description: "Additional documents associated with this collection.",
    hasPart: createHasPartReferences(fileIds),
    isPartOf: createIsPartOfReference("./")
  };

  // Inherit collection license
  if (
    projectEntry?.license &&
    typeof projectEntry.license === "object" &&
    projectEntry.license["@id"]
  ) {
    otherDocsDataset.license = { "@id": projectEntry.license["@id"] };
  }

  return otherDocsDataset;
}

function createPeopleDatasetEntry(
  project: Project,
  flattenedSessionEntries: any[],
  otherEntries: object[],
  license?: any
): RoCrateEntity[] | undefined {
  const collectPersonRecords = (source: any): any[] => {
    if (!source) {
      return [];
    }

    if (Array.isArray(source)) {
      return source;
    }

    if (Array.isArray(source.items)) {
      return source.items;
    }

    return [];
  };

  // Get actual person records from project (people with folders)
  const personRecords = collectPersonRecords((project as any).persons);
  const knownPeopleWithFolders = new Set(
    personRecords.map((person) => createPersonId(person))
  );

  const candidateEntries = [...flattenedSessionEntries, ...otherEntries];

  // Find ALL Person entities in the graph, including:
  // 1. People with folders (from project.persons)
  // 2. Unresolved contributors (people mentioned in sessions without person folders)
  // 3. #unknown-contributor entity
  const allPersonEntries = candidateEntries.filter(
    (entry: any) => isPersonEntity(entry) && typeof entry["@id"] === "string"
  );

  if (allPersonEntries.length === 0) {
    return undefined;
  }

  // LAM-98: Create intermediate Dataset for each person with files.
  // This groups all files associated with a person under a unique dataset,
  // which is then connected to People/.
  // See: https://linear.app/lameta/issue/LAM-98/dataset-for-each-person

  // Group files by the person they're about (only for people with folders who have files)
  const filesByPerson = new Map<string, any[]>();
  candidateEntries.forEach((entry: any) => {
    const aboutRef = entry.about?.["@id"];
    if (aboutRef && knownPeopleWithFolders.has(aboutRef)) {
      const existing = filesByPerson.get(aboutRef) || [];
      existing.push(entry);
      filesByPerson.set(aboutRef, existing);
    }
  });

  // Create per-person Dataset entries (only for people with files)
  const personFilesDatasets: RoCrateEntity[] = [];
  const peopleDatasetHasPart: { "@id": string }[] = [];

  // Map person IDs to person records for name lookup (only for people with folders)
  const personIdToRecord = new Map<string, any>();
  personRecords.forEach((person) => {
    personIdToRecord.set(createPersonId(person), person);
  });

  allPersonEntries.forEach((personEntry: any) => {
    const personId = personEntry["@id"];
    const personRecord = personIdToRecord.get(personId);
    const personFiles = filesByPerson.get(personId) || [];

    // If the person has no files, they should NOT be added to People/.hasPart
    // hasPart/isPartOf relationships are only for Files and Datasets, not Person entities.
    // The Person entity exists in the graph and is referenced by sessions/contributions.
    if (personFiles.length === 0) {
      // Skip - do not add to peopleDatasetHasPart
      return;
    }

    // Person has files - create an intermediate Dataset
    // Get the person's display name for the Dataset name
    const personName =
      personRecord?.filePrefix || personEntry.name || "Unknown";

    // Create a dataset ID based on whether this is a known person with folder or not
    const datasetId = personRecord
      ? createPersonFilesDatasetId(personRecord)
      : createPersonFilesDatasetId({ filePrefix: personName });

    // Create the person-files Dataset with files and 'about' reference to person.
    // The person is not "part of" the dataset - rather, the dataset is "about" the person.
    // Files are linked via hasPart since they are actual parts of the dataset.
    const personFilesDataset: RoCrateEntity = {
      "@id": datasetId,
      "@type": "Dataset",
      name: `${personName} files`,
      description: `Files associated with ${personName}.`,
      about: { "@id": personId },
      hasPart: personFiles.map((file: any) => ({ "@id": file["@id"] })),
      isPartOf: { "@id": "People/" }
    };

    // Add the inverse subjectOf reference from person to the dataset
    // This creates a bidirectional about/subjectOf relationship
    const datasetRef = { "@id": datasetId };
    if (!personEntry.subjectOf) {
      personEntry.subjectOf = datasetRef;
    } else if (Array.isArray(personEntry.subjectOf)) {
      personEntry.subjectOf.push(datasetRef);
    } else {
      personEntry.subjectOf = [personEntry.subjectOf, datasetRef];
    }

    if (license && typeof license === "object") {
      personFilesDataset.license = license;
    }

    personFilesDatasets.push(personFilesDataset);
    peopleDatasetHasPart.push({ "@id": datasetId });

    // Update file entries to point isPartOf to the person-files Dataset instead of People/
    personFiles.forEach((file: any) => {
      file.isPartOf = { "@id": datasetId };
    });
  });

  // Sort hasPart for consistency
  peopleDatasetHasPart.sort((a, b) => a["@id"].localeCompare(b["@id"]));

  // Create the main People/ Dataset that references all person-files Datasets
  const peopleDataset: RoCrateEntity = {
    "@id": "People/",
    "@type": "Dataset",
    name: "People",
    description: "Directory of people associated with this collection.",
    hasPart: peopleDatasetHasPart,
    isPartOf: { "@id": "./" }
  };

  if (license && typeof license === "object") {
    peopleDataset.license = license;
  }

  return [peopleDataset, ...personFilesDatasets];
}

function isPersonEntity(entry: any): boolean {
  if (!entry || !entry["@type"]) {
    return false;
  }

  const types = Array.isArray(entry["@type"])
    ? entry["@type"]
    : [entry["@type"]];
  return types.includes("Person");
}

function getUniqueEntries(otherEntries: object[]) {
  const seen = new Map();
  const unique = otherEntries.filter((entry) => {
    const id = entry["@id"];
    if (seen.has(id)) {
      //      const existingEntry = seen.get(id);
      // OK, so the @id is the same. Are the contents the same?
      // if (!_.isEqual(existingEntry, entry)) {
      //   // I can't immediately think of a way to make this happen,
      //   // so just leaving this here to point it out if it ever does.
      //   throw new Error(`Conflicting entries found for id ${id}`);
      //   // If this became a problem, I think semantically we would have to
      //   // do something more complicated in coming up with the @ids. E.g.
      //   // as we add each new entry, we could check if an entry with that
      //   // @id already exists, If it does but has a different value, then
      //   // we could append/increment an index to the @id.
      // }
      return false;
    }
    seen.set(id, entry);
    return true;
  });

  return unique;
}

function createDescriptionCollectionProtocolEntry(
  project: Project,
  fileIds: string[],
  authorReference: any,
  fallbackDatePublished?: string,
  earliestFileDate?: Date
): RoCrateEntity {
  const projectTitle = project.metadataFile
    ?.getTextProperty("title", "")
    ?.trim();
  const protocolName = projectTitle
    ? `${projectTitle} collection protocol`
    : "Collection protocol documents";
  const descriptionSource = project.metadataFile
    ?.getTextProperty("collectionDescription", "")
    ?.trim();
  const protocolDescription =
    descriptionSource && descriptionSource.length > 0
      ? descriptionSource
      : "DescriptionDocuments exported from lameta summarizing how this collection was gathered.";
  const datePublished =
    earliestFileDate?.toISOString() ||
    fallbackDatePublished ||
    new Date().toISOString();

  return {
    "@id": DESCRIPTION_PROTOCOL_NODE_ID,
    "@type": expandLdacId("ldac:CollectionProtocol"),
    name: protocolName,
    description: protocolDescription,
    author: authorReference,
    datePublished,
    hasPart: createHasPartReferences(fileIds),
    isPartOf: createIsPartOfReference("./")
  };
}

/**
 * Finds the first session in the project that has a valid date.
 * This is used for age calculation when exporting Person entities.
 * @param project The project to search for sessions with dates
 * @returns The date of the first session with a date, or undefined if none found
 */
export function findFirstSessionWithDate(project: Project): Date | undefined {
  if (
    !project ||
    !(project as any).sessions ||
    !(project as any).sessions.items
  ) {
    return undefined;
  }

  for (const session of (project as any).sessions.items) {
    if (session && session.metadataFile) {
      const dateString = session.metadataFile.getTextProperty("date", "");
      if (dateString && dateString.trim() !== "") {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }

  return undefined;
}
