import { Folder } from "../../model/Folder/Folder";
import { Session } from "../../model/Project/Session/Session";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";
import * as Path from "path";
import * as fs from "fs-extra";
import { getMimeType } from "../../model/file/FileTypeInfo";
import { Project } from "../../model/Project/Project";
import { Person, PersonMetadataFile } from "../../model/Project/Person/Person";
import _ from "lodash";
import {
  getVocabularyMapping,
  createTermDefinition,
  getTermSets,
  getCustomUri,
  sanitizeForIri,
  createFileId,
  createPersonId,
  createSessionId
} from "./RoCrateUtils";
import {
  getLdacMaterialTypeForPath,
  createLdacMaterialTypeDefinitions
} from "./RoCrateMaterialTypes";
import {
  createLdacAccessTypeDefinitions,
  createDistinctLicenses
} from "./RoCrateLicenseUtils";
import { createSessionEntry } from "./RoCrateSessions";
import { makeLdacCompliantPersonEntry } from "./RoCratePeople";
import { RoCrateLanguages } from "./RoCrateLanguages";
import { RoCrateLicense } from "./RoCrateLicenseManager";

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
        { "@vocab": "http://schema.org/" },
        "http://purl.archive.org/language-data-commons/context.json",
        "https://w3id.org/ldac/context",
        // The following are needed to make the npm ro-crate package happy
        {
          Dataset: "http://schema.org/Dataset",
          name: "http://schema.org/name",
          description: "http://schema.org/description",
          datePublished: "http://schema.org/datePublished",
          license: "http://schema.org/license",
          // ldac-profile calls for PCDM namespace for collection membership
          pcdm: "http://pcdm.org/models#"
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
    const entry = {
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
    
    // Apply LDAC compliance for direct person export
    // Try to find a session date from the project for age calculation
    let sessionDate: Date | undefined;
    if (project && (project as any).sessions && (project as any).sessions.items) {
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
    const contactPersonText =
      folder.metadataFile?.getTextProperty("contactPerson", "").trim() ||
      "Unknown";

    // Use structured Person entity instead of plain text for better linked data practices
    const isUnknownContact = contactPersonText === "Unknown";
    const contactPersonReference = isUnknownContact
      ? { "@id": "#unknown-contributor" }
      : contactPersonText;

    const entry: any = {
      "@id": "./",
      "@type": RoCrateLicense.getRepositoryCollectionTypes(),
      conformsTo: {
        "@id": "https://w3id.org/ldac/profile#Collection"
      },
      name:
        folder.metadataFile?.getTextProperty("title") ||
        "No title provided for this project.",
      description: folder.metadataFile?.getTextProperty(
        "collectionDescription",
        "No description provided for this project."
      ),
      publisher: { "@id": "https://github.com/onset/lameta" },
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

    // Add unknown contributor entity if using fallback
    if (isUnknownContact) {
      otherEntries.push({
        "@id": "#unknown-contributor",
        "@type": "Person",
        name: "Unknown"
      });
    }

    const sessionEntries = await Promise.all(
      project.sessions.items.map(async (session) => {
        return await createSessionEntry(
          project,
          session as Session,
          false,
          rocrateLanguages,
          rocrateLicense
        );
      })
    );

    // Link to session events in the root dataset using pcdm:hasMember
    project.sessions.items.forEach((session) => {
      entry["pcdm:hasMember"].push({
        "@id": createSessionId(session)
      });
    });

    // Add people to root dataset hasPart
    const allPeople = new Set<string>();
    project.sessions.items.forEach((session) => {
      (session as Session)
        .getAllContributionsToAllFiles()
        .forEach((contribution) => {
          const person = project.findPerson(
            contribution.personReference.trim()
          );
          if (person) {
            allPeople.add(createPersonId(person));
          }
        });
    });
    allPeople.forEach((personId) => {
      entry.hasPart.push({ "@id": personId });
    });

    // Add description folder files to root dataset hasPart
    if (
      project.descriptionFolder &&
      project.descriptionFolder.files.length > 0
    ) {
      addProjectDocumentFolderEntries(
        project.descriptionFolder,
        "Description",
        entry,
        otherEntries,
        rocrateLicense,
        project
      );
    }

    // Add other docs folder files to root dataset hasPart
    if (project.otherDocsFolder && project.otherDocsFolder.files.length > 0) {
      addProjectDocumentFolderEntries(
        project.otherDocsFolder,
        "OtherDocs",
        entry,
        otherEntries,
        rocrateLicense,
        project
      );
    }

    // Add LDAC access type definitions to other entries
    const ldacAccessDefinitions = createLdacAccessTypeDefinitions();
    const ldacMaterialTypeDefinitions = createLdacMaterialTypeDefinitions();

    // Create unique licenses for all sessions
    const uniqueLicenses = createDistinctLicenses(
      project.sessions.items as Session[],
      project
    );

    // Add a collection-level license definition
    const collectionLicense = {
      "@id": "#collection-license",
      "@type": "ldac:DataReuseLicense",
      name: "Collection License",
      description:
        "License for the collection as a whole. Individual items may have their own specific licenses.",
      "ldac:access": { "@id": "ldac:OpenAccess" }
    };

    // Add publisher organization entity
    const publisherEntity = {
      "@id": "https://github.com/onset/lameta",
      "@type": "Organization",
      name: "LaMeta Project",
      url: "https://github.com/onset/lameta",
      description: "A metadata tool for language documentation projects"
    };

    return [
      entry,
      ...sessionEntries.flat(),
      ...boilerplateGraph,
      ...ldacAccessDefinitions,
      ...ldacMaterialTypeDefinitions,
      ...uniqueLicenses,
      collectionLicense,
      publisherEntity,
      ...rocrateLanguages.getUsedLanguageEntities(),
      ...getUniqueEntries(otherEntries)
    ];
  }

  // otherwise, it's a session - but we need to check if we're being called
  // from within a project export or as a standalone session export
  const session = folder as Session;

  return await createSessionEntry(
    project,
    session,
    isStandaloneSession,
    rocrateLanguages,
    rocrateLicense
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
export async function addFieldEntries(
  project: Project,
  folder: Folder,
  folderEntry: object,
  otherEntries: object[],
  rocrateLanguages: RoCrateLanguages
) {
  // First handle the known fields
  for (const field of folder.knownFields) {
    // don't export if we know it has been migrated
    if (field.deprecated && field.deprecated.indexOf("migrated") > -1) {
      continue;
    }

    const values: string[] = getFieldValues(folder, field);
    // Skip empty fields, except for language fields which need to process empty values
    // to trigger "und" fallback behavior for LDAC compliance
    const isLanguageField = field.rocrate?.handler === "languages";
    if (
      (values.length === 0 || values[0] === "unspecified") &&
      !isLanguageField
    )
      continue;

    // For Person entities, skip PII fields entirely
    if (folder instanceof Person && field.personallyIdentifiableInformation) {
      continue;
    }

    const propertyKey = field.rocrate?.key || field.key;

    // does the fields.json5 specify how we should handle this field in the rocrate?
    if (field.rocrate) {
      // Special handling for language fields
      // Note: the spec is ambiguous about whether languages should be just BCP47 codes or
      // full entities. This confusion is especially found around "inLanguage" because it
      // has a direct schema.org type, "http://schema.org/inLanguage".
      // Perhaps both are supported. Until we find out otherwise, we have decided to always create entities,
      // which then gives us room for things like how people want to see the language named,
      // as opposed to some official name.
      if (field.rocrate?.handler === "languages") {
        const languageReferences: any[] = [];

        values.forEach((languageValue: string) => {
          // Parse language value (could be "etr" or "etr: Edolo")
          const [code] = languageValue.split(":").map((s) => s.trim());
          if (code) {
            const reference = rocrateLanguages.getLanguageReference(code);

            // Track usage
            rocrateLanguages.trackUsage(code, folderEntry["@id"] || "./");

            languageReferences.push(reference);
          }
        });

        // Normal language field handling (ldac:subjectLanguage, etc.)
        if (languageReferences.length > 0) {
          // Check if field should be array or single object
          if (field.rocrate?.array === false) {
            // Use only the first language reference (single object)
            folderEntry[propertyKey] = languageReferences[0];
          } else {
            // Use array (default behavior)
            folderEntry[propertyKey] = languageReferences;
          }
        } else {
          // No language values found, fallback to "und" (undetermined language)
          const languageEntity = rocrateLanguages.getLanguageEntity("und");
          const reference = rocrateLanguages.getLanguageReference("und");
          rocrateLanguages.trackUsage("und", folderEntry["@id"] || "./");

          if (field.rocrate?.array === false) {
            folderEntry[propertyKey] = reference;
          } else {
            folderEntry[propertyKey] = [reference];
          }
        }

        continue; // Skip the normal template processing for language fields
      }

      // Special handling for fields with vocabularyFile
      if (field.vocabularyFile) {
        const termValues = values[0]
          .split(",")
          .map((term) => term.trim())
          .filter((term) => term);
        const termReferences: any[] = [];
        const termDefinitions: any[] = [];
        let hasLdacTerms = false;
        let hasCustomTerms = false;

        for (const termId of termValues) {
          try {
            // Get project title for custom ID generation
            const projectTitle =
              project.metadataFile?.getTextProperty("title") ||
              "unknown-project";

            const mapping = getVocabularyMapping(
              termId,
              field.vocabularyFile,
              projectTitle
            );
            termReferences.push({ "@id": mapping.id });
            termDefinitions.push(createTermDefinition(mapping));

            if (mapping.id.startsWith("ldac:")) {
              hasLdacTerms = true;
            } else {
              hasCustomTerms = true;
            }
          } catch (error) {
            // If vocabulary loading fails, treat as custom term
            console.warn(`Failed to load vocabulary for ${termId}:`, error);

            // Fallback to creating a custom term directly (this should rarely happen now)
            const projectTitle =
              project.metadataFile?.getTextProperty("title") ||
              "unknown-project";
            const customId = getCustomUri(`genre/${termId}`, projectTitle);

            termReferences.push({ "@id": customId });
            termDefinitions.push({
              "@id": customId,
              "@type": "DefinedTerm",
              name: termId,
              description: `Custom term: ${termId}`,
              inDefinedTermSet: { "@id": "#CustomGenreTerms" }
            });
            hasCustomTerms = true;
          }
        }

        // Add term references to the main entry
        if (termReferences.length > 0) {
          folderEntry[propertyKey] = termReferences;
        }

        // Add term definitions and term sets to the graph
        otherEntries.push(...termDefinitions);
        otherEntries.push(...getTermSets(hasLdacTerms, hasCustomTerms));
      } else {
        const leafTemplate = getRoCrateTemplate(field);

        if (leafTemplate) {
          // Check if this is a language-related template
          const isLanguageTemplate =
            field.type === "languageChoices" &&
            leafTemplate["@id"] &&
            leafTemplate["@id"].includes("#language_");

          if (isLanguageTemplate) {
            // Use RoCrateLanguages system for language templates to ensure proper tracking
            const languageReferences: any[] = [];
            values.forEach((languageValue: string) => {
              // Parse language value (could be "etr" or "etr: Edolo")
              const [code] = languageValue.split(":").map((s) => s.trim());
              if (code) {
                // Create language entity and get reference using RoCrateLanguages system
                const languageEntity = rocrateLanguages.getLanguageEntity(code);
                const reference = rocrateLanguages.getLanguageReference(code);

                // Track usage
                rocrateLanguages.trackUsage(code, folderEntry["@id"] || "./");

                // Add reference to the field
                languageReferences.push(reference);
              }
            });

            if (languageReferences.length > 0) {
              // Apply array vs single object logic based on field configuration
              if (field.rocrate?.array === false) {
                // For fields like workingLanguages with array:false, use single object
                folderEntry[propertyKey] = languageReferences[0];
              } else {
                // For fields like languages with array:true, use array
                folderEntry[propertyKey] = languageReferences;
              }
            } else {
              // No language values found, fallback to "und" (undetermined language)
              const languageEntity = rocrateLanguages.getLanguageEntity("und");
              const reference = rocrateLanguages.getLanguageReference("und");
              rocrateLanguages.trackUsage("und", folderEntry["@id"] || "./");

              if (field.rocrate?.array === false) {
                folderEntry[propertyKey] = reference;
              } else {
                folderEntry[propertyKey] = [reference];
              }
            }
          } else if (
            field.key === "location" &&
            leafTemplate["@type"] === "Place"
          ) {
            // Special handling for location field - combine with region/country/continent
            values.forEach((c: string) => {
              // Create the basic Place entity from the template
              const leaf = getElementUsingTemplate(leafTemplate, c);

              // Build description from companion location fields
              const locationParts: string[] = [];

              // Check for locationRegion
              try {
                const regionField =
                  folder.metadataFile!.properties.getValueOrThrow(
                    "locationRegion"
                  );
                if (
                  regionField &&
                  regionField.text &&
                  regionField.text.trim() &&
                  regionField.text !== "unspecified"
                ) {
                  locationParts.push(regionField.text.trim());
                }
              } catch {
                // Field doesn't exist, skip
              }

              // Check for locationCountry
              try {
                const countryField =
                  folder.metadataFile!.properties.getValueOrThrow(
                    "locationCountry"
                  );
                if (
                  countryField &&
                  countryField.text &&
                  countryField.text.trim() &&
                  countryField.text !== "unspecified"
                ) {
                  locationParts.push(countryField.text.trim());
                }
              } catch {
                // Field doesn't exist, skip
              }

              // Check for locationContinent
              try {
                const continentField =
                  folder.metadataFile!.properties.getValueOrThrow(
                    "locationContinent"
                  );
                if (
                  continentField &&
                  continentField.text &&
                  continentField.text.trim() &&
                  continentField.text !== "unspecified"
                ) {
                  locationParts.push(continentField.text.trim());
                }
              } catch {
                // Field doesn't exist, skip
              }

              // Add description if we have location parts
              if (locationParts.length > 0) {
                leaf["description"] = `Located in ${locationParts.join(", ")}`;
              }

              otherEntries.push(leaf);
              const reference = leaf["@id"];

              if (field.rocrate?.array) {
                if (!folderEntry[propertyKey]) folderEntry[propertyKey] = [];
                folderEntry[propertyKey].push({ "@id": reference });
              } else folderEntry[propertyKey] = { "@id": reference };
            });
          } else {
            // Regular template processing for non-language fields
            values.forEach((c: string) => {
              // For each value, create a graph entry that is the template, filled in with the value
              const leaf = getElementUsingTemplate(leafTemplate, c); // make the free-standing element representing this value. E.g. { "@id": "#en", "name": "English" }
              otherEntries.push(leaf);
              const reference = leaf["@id"]; // refer to it however the leaf entry has its @id
              // Now create the links to those from the parent object
              if (field.rocrate?.array) {
                if (!folderEntry[propertyKey]) folderEntry[propertyKey] = [];
                // add a link to it in field the array. E.g. "workingLanguages": [ { "@id": "#en" }, { "@id": "#fr" } ]
                folderEntry[propertyKey].push({ "@id": reference });
              } else folderEntry[propertyKey] = { "@id": reference };
            });
          }
        } else {
          folderEntry[propertyKey] = values[0]; // we have a key, but nothing else. Can use, e.g. to rename "keyword" to "keywords"
        }
      }
    }

    // if there's no rocrate field definition, so just add it as a simple text property using the same name as lameta does
    else {
      // Skip certain fields that are redundant or handled elsewhere
      if (field.key === "access") {
        // Access is now handled through the license system, skip the redundant top-level property
        continue;
      }
      if (field.key === "collectionDescription") {
        // collectionDescription is mapped to the standard 'description' property, skip the original
        continue;
      }
      if (field.key === "title" && folderEntry["name"]) {
        // Skip redundant title property when it's identical to name
        const titleValue = values[0];
        const nameValue = folderEntry["name"];
        if (titleValue === nameValue) {
          continue;
        }
      }
      // Skip non-standard properties
      if (
        field.key === "status" ||
        field.key === "topic" ||
        field.key === "id" ||
        field.key === "locationRegion" ||
        field.key === "locationCountry" ||
        field.key === "locationContinent"
      ) {
        continue;
      }

      // Map 'date' to 'dateCreated' for compliance with the profile
      if (field.key === "date") {
        folderEntry["dateCreated"] = values[0];
      } else {
        folderEntry[propertyKey] = values[0];
      }
    }
  }

  // Now handle any custom fields from the properties

  folder.metadataFile!.properties.forEach((key, field) => {
    if (!field.definition || !field.definition.isCustom) return;

    // For Person entities, skip custom fields entirely since we don't know if they contain PII
    if (folder instanceof Person) {
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

function getFieldValues(folder: Folder, field: any): string[] {
  if (field.omitExport) return [];
  //console.log("getFieldValues(", field.key);

  if (field.rocrate?.handler === "languages") {
    // Handle languages for any folder type (Project, Session, Person)
    const languageString =
      folder.metadataFile?.properties.getTextStringOrEmpty(field.key) || "";
    return languageString
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  } else {
    const v = folder.metadataFile?.properties.getHasValue(field.key)
      ? folder.metadataFile?.getTextProperty(field.key, "").trim()
      : "";

    // Check if this is a language-related field with a template (no handler)
    // This handles cases where templates are used without the language handler
    if (v && field.rocrate?.template && field.type === "languageChoices") {
      // Parse as languages: split by semicolon and trim
      return v
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    return v ? [v] : [];
  }
}

export function getElementUsingTemplate(
  template: object,
  value: string
): object {
  const output = {};
  Object.keys(template).forEach((key) => {
    // when we're handling person languages, those are whole objects with various properties
    // and we handle them in getPersonLanguageElement(). But other places we just have
    // the code, and end up in this function, where we do use the same template for languages
    // but insted of [v], that template has [code] which we replace with the value
    let replacedValue = template[key];

    // For language-related templates, extract just the language code from "code: Name" format
    const extractLanguageCode = (langValue: string): string => {
      // Handle "etr: Edolo" format - extract just "etr"
      const [code] = langValue.split(":").map((s) => s.trim());
      return code || langValue;
    };

    // Replace [v] with the value - but for @id fields with #language_ prefix, use just the code
    if (replacedValue.includes("[v]")) {
      let replacementValue = value;

      // Special handling for language @id fields
      if (key === "@id" && replacedValue.includes("#language_")) {
        replacementValue = extractLanguageCode(value);
      }

      replacedValue = replacedValue.replace("[v]", replacementValue);
    }

    // Replace [code] with sanitized language code for language templates
    if (replacedValue.includes("[code]")) {
      const sanitizedCode = sanitizeLanguageCode(extractLanguageCode(value));
      replacedValue = replacedValue.replace("[code]", sanitizedCode);
    }

    output[key] = replacedValue;
  });

  return output;
}

function sanitizeLanguageCode(code: string): string {
  // If already starts with #language_, don't add another prefix
  if (code.startsWith("#language_")) {
    return code;
  }
  // Remove spaces and colons, replace with underscores for valid IDs
  return "#language_" + code.replace(/[^a-zA-Z0-9_-]/g, "_");
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

export function addChildFileEntries(
  folder: Folder,
  folderEntry: object,
  otherEntries: object[],
  rocrateLicense: RoCrateLicense,
  project?: Project
): void {
  if (folder.files.length === 0) return;
  folderEntry["hasPart"] = [];
  folder.files.forEach((file) => {
    const path = file.getActualFilePath();
    const fileName = Path.basename(path);
    const fileExt = Path.extname(fileName).toLowerCase();

    // Skip RO-Crate metadata files to avoid circular references
    if (fileName.startsWith("ro-crate")) {
      return;
    }

    // Determine the appropriate @type based on file extension and context
    let fileType = "File";

    if (fileExt.match(/\.(mp3|wav|m4a|aac|flac)$/)) {
      fileType = "AudioObject";
    } else if (fileExt.match(/\.(mp4|avi|mov|mkv|webm)$/)) {
      fileType = "VideoObject";
    } else if (fileExt.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/)) {
      fileType = "ImageObject";
    } else if (
      fileExt.match(/\.(xml|eaf|txt|doc|docx|rtf|md|pptx|pdf|person|session)$/)
    ) {
      fileType = "DigitalDocument";
    }

    // Use centralized file ID generation to ensure consistency
    const fileId = createFileId(folder, fileName);

    const fileEntry: any = {
      "@id": fileId,
      "@type": fileType,
      contentSize: fs.statSync(path).size,
      dateCreated: fs.statSync(path).birthtime.toISOString(),
      dateModified: file.getModifiedDate()?.toISOString(),
      encodingFormat: getMimeType(
        Path.extname(fileName).toLowerCase().replace(/\./g, "")
      ),
      "ldac:materialType": { "@id": getLdacMaterialTypeForPath(path) },
      name: fileName
    };

    // Add license information - per LDAC spec, files must have license properties
    addFileLicenseProperty(
      fileEntry,
      path,
      rocrateLicense,
      folder,
      folderEntry,
      project
    );

    otherEntries.push(fileEntry);
    folderEntry["hasPart"].push({
      "@id": fileId
    });
  });
}

export function addProjectDocumentFolderEntries(
  folder: Folder,
  folderType: string,
  projectEntry: any,
  otherEntries: object[],
  rocrateLicense: RoCrateLicense,
  project?: Project
): void {
  if (folder.files.length === 0) return;

  folder.files.forEach((file) => {
    const path = file.getActualFilePath();
    const fileName = Path.basename(path);
    const fileExt = Path.extname(fileName).toLowerCase();

    // Skip RO-Crate metadata files to avoid circular references
    if (fileName.startsWith("ro-crate")) {
      return;
    }

    // Determine the appropriate @type based on file extension
    let fileType = "DigitalDocument"; // Default for project documents

    if (fileExt.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/)) {
      fileType = "ImageObject";
    } else if (fileExt.match(/\.(mp3|wav|m4a|aac|flac)$/)) {
      fileType = "AudioObject";
    } else if (fileExt.match(/\.(mp4|avi|mov|mkv|webm)$/)) {
      fileType = "VideoObject";
    }

    // Create file ID using folder type
    const fileId = `${folderType}/${sanitizeForIri(fileName)}`;

    const fileEntry: any = {
      "@id": fileId,
      "@type": fileType,
      contentSize: fs.statSync(path).size,
      dateCreated: fs.statSync(path).birthtime.toISOString(),
      dateModified: file.getModifiedDate()?.toISOString(),
      encodingFormat: getMimeType(
        Path.extname(fileName).toLowerCase().replace(/\./g, "")
      ),
      "ldac:materialType": { "@id": getLdacMaterialTypeForPath(path) },
      name: fileName
    };

    // Add license information - per LDAC spec, files must have license properties
    addFileLicenseProperty(
      fileEntry,
      path,
      rocrateLicense,
      undefined,
      projectEntry,
      project
    );

    otherEntries.push(fileEntry);
    projectEntry.hasPart.push({
      "@id": fileId
    });
  });
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
