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
  createSessionId,
  expandLdacId,
  isLdacIdentifier
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
          // LAM-33 https://linear.app/lameta/issue/LAM-33/ro-crate-1-context-configuration
          // keeps the RO-Crate context single-sourced, but the bundled ro-crate validator
          // only ships schema.org definitions up to v1.1, so we provide minimal fallbacks
          // for the root dataset checks here while still exposing the ldac: prefix inline.
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
      // LAM-41: Guarantee the root dataset exposes inLanguage by
      // assigning Lexvo's undetermined language identifier whenever no
      // working language was captured. This replaces the old #language_und
      // fragment and keeps LDAC validators satisfied.
      // https://linear.app/lameta/issue/LAM-41/ro-crate-10-ensure-inlanguage-is-present-and-avoid-language-und
      rocrateLanguages.getLanguageEntity("und");
      const undeterminedLanguageReference =
        rocrateLanguages.getLanguageReference("und");
      rocrateLanguages.trackUsage("und", entry["@id"] || "./");
      entry.inLanguage = undeterminedLanguageReference;
    }

    // Apply LDAC compliance for direct person export
    // Try to find a session date from the project for age calculation
    let sessionDate: Date | undefined;
    if (
      project &&
      (project as any).sessions &&
      (project as any).sessions.items
    ) {
      const firstSession = (project as any).sessions.items[0];
      if (firstSession && firstSession.metadataFile) {
        const dateString = firstSession.metadataFile.getTextProperty("date");
        if (dateString) {
          sessionDate = new Date(dateString);
        }
      }
    }

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
      // https://linear.app/lameta/issue/LAM-38: archiveConfigurationName is not a valid RO-Crate term, so reuse the
      // resolved Organization as holdingArchive instead of leaking the raw custom field.
      entry.holdingArchive = publisher.reference;
    }

    const depositor = resolveDepositor(project);
    if (depositor) {
      // LAM-39: ldac:depositor must reference a Person entity, not a bare string in the root dataset.
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

    // Add unknown contributor entity if using fallback
    // LAM-84: Use consolidated helper for unknown contributor entity
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

    // Add description folder files to a dedicated ldac:CollectionProtocol node.
    // LAM-70 https://linear.app/lameta/issue/LAM-70/collectionprotocol moved
    // these project-level descriptions out of the root hasPart list so LDAC
    // validators can see them via ldac:hasCollectionProtocol instead.
    if (
      project.descriptionFolder &&
      project.descriptionFolder.files.length > 0
    ) {
      const descriptionDocsResult = addProjectDocumentFolderEntries(
        project.descriptionFolder,
        "DescriptionDocuments",
        entry,
        otherEntries,
        rocrateLicense,
        project,
        { attachToRootHasPart: false, parentId: DESCRIPTION_PROTOCOL_NODE_ID }
      );

      if (descriptionDocsResult.fileIds.length > 0) {
        const protocolEntry = createDescriptionCollectionProtocolEntry(
          project,
          descriptionDocsResult.fileIds,
          contactPersonReference,
          entry.datePublished,
          descriptionDocsResult.earliestFileDate
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

    // Add other docs folder files to root dataset hasPart
    if (project.otherDocsFolder && project.otherDocsFolder.files.length > 0) {
      addProjectDocumentFolderEntries(
        project.otherDocsFolder,
        "OtherDocuments",
        entry,
        otherEntries,
        rocrateLicense,
        project
      );
    }

    // Add LDAC access type definitions to other entries
    const ldacAccessDefinitions = createLdacAccessTypeDefinitions();

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

    const uniqueOtherEntries = getUniqueEntries(otherEntries);

    const baseGraph = [
      entry,
      ...flattenedSessionEntries,
      ...boilerplateGraph,
      ...ldacAccessDefinitions,
      ...uniqueLicenses,
      collectionLicense,
      ...rocrateLanguages.getUsedLanguageEntities(),
      ...uniqueOtherEntries
    ];

    // LAM-68 https://linear.app/lameta/issue/LAM-68/people-dataset
    // Add a People dataset container so Person nodes hang off a proper directory entity.
    const peopleDatasetEntry = createPeopleDatasetEntry(
      project,
      flattenedSessionEntries,
      uniqueOtherEntries,
      entry.license
    );
    if (peopleDatasetEntry) {
      entry.hasPart.push({ "@id": peopleDatasetEntry["@id"] });
      baseGraph.push(peopleDatasetEntry);
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
// LAM-74: Refactored to use modular handlers from RoCrateFieldHandlers.ts
// This reduces the function from ~250 lines to ~50 lines by delegating to specialized handlers.
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
      // https://linear.app/lameta/issue/LAM-38: archiveConfigurationName gets remapped to holdingArchive above.
      return;
    }

    if (key === "depositor") {
      // LAM-39: prevent the custom-field fallback from reintroducing the deprecated string property.
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
 * Options for building a file entry in the RO-Crate graph.
 * LAM-73: Extracted to consolidate duplicate logic from addChildFileEntries and addProjectDocumentFolderEntries.
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
 * Builds a file entry for the RO-Crate graph with all common properties.
 * LAM-73: Consolidated from addChildFileEntries and addProjectDocumentFolderEntries
 * to eliminate ~150 lines of duplicate logic for deriving @type arrays,
 * collecting stats, setting encodingFormat/contentSize, and wiring license links.
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

  // Determine the appropriate @type based on file extension and context
  // LAM-54 fix: https://linear.app/lameta/issue/LAM-54 requires every file data entity to include "File".
  // LAM-65: https://linear.app/lameta/issue/LAM-65 adds schema.org types:
  // - ImageObject, VideoObject, AudioObject for media files
  // LAM-69: https://linear.app/lameta/issue/LAM-69/correct-types
  // Per RO-Crate spec, files only need @type of ["File"] since RO-Crate maps MediaObject to File.
  // CreativeWork is a superclass and not necessary for non-media files.
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
  // LAM-69: No else clause - non-media files remain as just ["File"]

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
  const shouldAssignHasPart = !isPersonFolder;

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

    // LAM-73: Use shared helper to build the file entry
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
      (folderEntry as any)["hasPart"].push({
        "@id": fileId
      });

      // LAM-66: Add inverse isPartOf link
      // https://linear.app/lameta/issue/LAM-66/add-inverse-links
      // Per LDAC spec, bidirectional relationships are required:
      // hasPart/isPartOf for structural containment
      fileEntry.isPartOf = { "@id": (folderEntry as any)["@id"] };
    }

    if (isPersonFolder) {
      const target = folderEntry as any;
      const entryTypes = Array.isArray(fileEntry["@type"])
        ? fileEntry["@type"]
        : [fileEntry["@type"]];
      const hasImageType = entryTypes.includes("ImageObject");
      // LAM-48 https://linear.app/lameta/issue/LAM-48 forbids hasPart on Person
      // contextual entities, so we expose related files via schema.org links
      // instead of structural containment.
      if (hasImageType) {
        target.image = appendReference(target.image, fileId);
      } else {
        target.subjectOf = appendReference(target.subjectOf, fileId);
      }
      // LAM-66: Add inverse about link for both image and subjectOf
      // https://linear.app/lameta/issue/LAM-66/add-inverse-links
      // Per LDAC spec, both image and subjectOf use about as the inverse
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

    // LAM-73: Use shared helper to build the file entry
    // LAM-62: https://linear.app/lameta/issue/LAM-62
    // Description and other project documents should NOT have materialType.
    // The materialType "Annotation" was confusing because LDAC uses "annotation" to mean "analysis",
    // but these documents are project-level descriptions, not analyses of the linguistic data.
    const { fileEntry, stats } = buildFileEntry({
      file,
      fileId,
      rocrateLicense,
      folder: undefined, // No folder for project documents - license inheritance differs
      parentEntry: projectEntry,
      project
    });

    otherEntries.push(fileEntry);
    if (attachToRootHasPart) {
      projectEntry.hasPart.push({
        "@id": fileId
      });
    }

    // LAM-66: Add inverse isPartOf link pointing to the structural parent
    // https://linear.app/lameta/issue/LAM-66/add-inverse-links
    // Per LDAC spec, bidirectional relationships are required:
    // hasPart/isPartOf for structural containment
    fileEntry.isPartOf = { "@id": parentId };

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

function createPeopleDatasetEntry(
  project: Project,
  flattenedSessionEntries: any[],
  otherEntries: object[],
  license?: any
): RoCrateEntity | undefined {
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

  const knownPeople = new Set(
    collectPersonRecords((project as any).persons).map((person) =>
      createPersonId(person)
    )
  );
  if (knownPeople.size === 0) {
    return undefined;
  }

  const candidateEntries = [...flattenedSessionEntries, ...otherEntries];
  const personIds = new Set(
    candidateEntries
      .filter((entry: any) => isPersonEntity(entry))
      .map((entry: any) => entry["@id"])
      .filter((id: any) => typeof id === "string" && knownPeople.has(id))
  );

  if (personIds.size === 0) {
    return undefined;
  }

  const sortedIds = Array.from(personIds).sort((a, b) => a.localeCompare(b));

  const dataset: RoCrateEntity = {
    "@id": "#People",
    "@type": "Dataset",
    name: "People",
    description: "Directory of people associated with this collection.",
    hasPart: sortedIds.map((id) => ({ "@id": id })),
    isPartOf: { "@id": "./" }
  };

  if (license && typeof license === "object") {
    dataset.license = license;
  }

  return dataset;
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
    hasPart: fileIds.map((id) => ({ "@id": id })),
    isPartOf: { "@id": "./" }
  };
}
