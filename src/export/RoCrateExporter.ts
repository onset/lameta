import { Folder } from "../model/Folder/Folder";
import { Session } from "../model/Project/Session/Session";
import { fieldDefinitionsOfCurrentConfig } from "../model/field/ConfiguredFieldDefinitions";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";
import * as Path from "path";
import * as fs from "fs-extra";
import { getMimeType } from "../model/file/FileTypeInfo";
import { Project } from "../model/Project/Project";
import { Person, PersonMetadataFile } from "../model/Project/Person/Person";
import { IPersonLanguage } from "../model/PersonLanguage";
import _ from "lodash";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import { IChoice } from "../model/field/Field";
import {
  getVocabularyMapping,
  createTermDefinition,
  getTermSets
} from "./VocabularyHandler";

// Info:
// https://www.researchobject.org/ro-crate/
// https://github.com/Language-Research-Technology/ldac-profile
// https://github.com/Language-Research-Technology/ldac-profile/blob/master/profile/profile.md
// https://www.researchobject.org/ro-crate/profiles.html#paradisec-profile

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
        "https://w3id.org/ro/crate/1.2-DRAFT/context",
        { "@vocab": "http://schema.org/" },
        "http://purl.archive.org/language-data-commons/context.json",
        "https://w3id.org/ldac/context",
        // The following are needed to make the npm ro-crate package happy
        {
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
  if (folder instanceof Person) {
    const entry = {};
    const otherEntries: object[] = [];
    await addFieldEntries(folder, entry, otherEntries);
    addChildFileEntries(folder, entry, otherEntries);
    return [entry, ...getUniqueEntries(otherEntries)];
  }

  if (folder instanceof Project) {
    const entry: any = {
      "@id": "./",
      "@type": ["Dataset", "Object", "RepositoryObject"],
      conformsTo: {
        "@id": "https://purl.archive.org/language-data-commons/profile#Object"
      },
      name:
        folder.metadataFile?.getTextProperty("title") ||
        "No title provided for this project.",
      description:
        folder.metadataFile?.getTextProperty("description") ||
        "No description provided for this project.",
      publisher: { "@id": "https://github.com/onset/lameta" },
      datePublished: new Date().toISOString(),
      license: {
        "@id": "#license"
      },
      hasPart: []
    };

    const boilerplateGraph = [
      {
        "@id": "ro-crate-metadata.json",
        "@type": "CreativeWork",
        conformsTo: { "@id": "https://w3id.org/ro/crate/1.2-DRAFT" },
        about: { "@id": "./" }
      }
    ];

    const otherEntries: object[] = [];
    await addFieldEntries(folder, entry, otherEntries);
    addChildFileEntries(folder, entry, otherEntries);

    const sessionEntries = await Promise.all(
      project.sessions.items.map(async (session) => {
        return await getRoCrateInternal(project, session, false);
      })
    );

    // Link to session events in the root dataset
    project.sessions.items.forEach((session) => {
      entry.hasPart.push({ "@id": `Sessions/${session.filePrefix}/` });
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
            allPeople.add(`People/${person.filePrefix}/`);
          }
        });
    });
    allPeople.forEach((personId) => {
      entry.hasPart.push({ "@id": personId });
    });

    // Add a basic license for project
    const license: any = {
      "@id": "#license",
      "@type": "CreativeWork",
      name: "unspecified"
    };

    return [
      entry,
      ...sessionEntries.flat(),
      ...boilerplateGraph,
      license,
      ...getUniqueEntries(otherEntries)
    ];
  }

  // otherwise, it's a session - but we need to check if we're being called
  // from within a project export or as a standalone session export
  const session = folder as Session;

  const mainSessionEntry: any = {
    "@id": isStandaloneSession ? "./" : `Sessions/${session.filePrefix}/`,
    "@type": isStandaloneSession
      ? ["Dataset", "Object", "RepositoryObject"]
      : ["Event", "Object", "RepositoryObject"],
    conformsTo: {
      "@id": "https://purl.archive.org/language-data-commons/profile#Object"
    },
    name:
      folder.metadataFile?.getTextProperty("title") ||
      "No title provided for this session.",
    description:
      folder.metadataFile?.getTextProperty("description") ||
      "No description provided for this session.",
    publisher: { "@id": "https://github.com/onset/lameta" }, // review: we're not actually publishing

    datePublished: new Date().toISOString(), // review: we're not actually publishing

    license: {
      "@id": "#license"
    },
    hasPart: []
  };

  // Add session-specific properties for Events
  if (!isStandaloneSession) {
    const startDate = folder.metadataFile?.getTextProperty("date");
    if (startDate) {
      mainSessionEntry.startDate = startDate;
    }

    const location = folder.metadataFile?.getTextProperty("location");
    if (location) {
      mainSessionEntry.location = { "@id": `#${location}` };
    }

    const keywords = folder.metadataFile?.getTextProperty("keyword");
    if (keywords) {
      mainSessionEntry.keywords = keywords;
    }
  }
  const boilerplateSessionGraph = [
    {
      "@id": "ro-crate-metadata.json",
      "@type": "CreativeWork",
      conformsTo: { "@id": "https://w3id.org/ro/crate/1.2-DRAFT" },
      about: { "@id": "./" }
    }
  ];

  const otherEntries: any[] = [];

  await addFieldEntries(folder, mainSessionEntry, otherEntries);

  const allEntries: any[] = [mainSessionEntry];
  if (folder instanceof Session) {
    mainSessionEntry["participant"] = makeParticipantPointers(
      folder as Session,
      project
    );
    allEntries.push(
      ...(await makeEntriesFromParticipant(project, folder as Session))
    );
    allEntries.push(...getRoles(folder as Session));
  }

  // Add files to session hasPart
  addChildFileEntries(folder, mainSessionEntry, otherEntries);

  // Create Place entity if location is specified
  const location = folder.metadataFile?.getTextProperty("location");
  if (location && !isStandaloneSession) {
    otherEntries.push({
      "@id": `#${location}`,
      "@type": "Place",
      name: location
    });
  }

  // REVIEW: not clear really what we're going to do with license
  const license: any = {
    "@id": "#license",
    "@type": "CreativeWork",
    name: session.metadataFile?.getTextProperty("access")
  };
  const access = session.metadataFile?.getTextProperty("access");
  if (access === "unspecified" || access === "" || access === undefined) {
    license.name = "unspecified";
  } else {
    addFieldIfNotEmpty(folder, "access", "access", license);
    addFieldIfNotEmpty(folder, "accessDescription", "explanation", license);
    const accessDescription = getDescriptionFromAccessChoice(
      access,
      project.authorityLists
    );
    license.description = accessDescription;
  }

  addChildFileEntries(folder, mainSessionEntry, otherEntries);

  allEntries.push(license, ...boilerplateSessionGraph, ...otherEntries);
  return allEntries;
}

function addFieldIfNotEmpty(
  folder: Folder,
  fieldKey: string,
  outputProperty: string,
  entry: any
) {
  const value = folder.metadataFile?.getTextProperty(fieldKey, "").trim();
  if (value) entry[outputProperty] = value;
}

// for every field in fields.json5, if it's in the folder, add it to the rocrate
async function addFieldEntries(
  folder: Folder,
  folderEntry: object,
  otherEntries: object[]
) {
  // First handle the known fields
  for (const field of folder.knownFields) {
    const values: string[] = getFieldValues(folder, field);
    if (values.length === 0 || values[0] === "unspecified") return;
    const propertyKey = field.rocrate?.key || field.key;

    // REVIEW: for some reason languages of a person aren't in the normal field system?
    if (folder instanceof Person) {
      (folder.metadataFile as PersonMetadataFile).languages.forEach(
        (personLanguageObject) => {
          otherEntries.push(getPersonLanguageElement(personLanguageObject));
        }
      );
    }

    // does the fields.json5 specify how we should handle this field in the rocrate?
    if (field.rocrate) {
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
            const mapping = await getVocabularyMapping(
              termId,
              field.vocabularyFile
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
            const customId =
              "#" +
              termId
                .split(/[^a-zA-Z0-9]/)
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join("");
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
          values.forEach((c: string) => {
            // For each value, create a graph entry that is the template, filled in with the value
            const leaf = getElementUsingTemplate(leafTemplate, c); // make the free-standing element representing this value. E.g. { "@id": "#en", "name": "English" }
            otherEntries.push(leaf);
            const reference = leaf["@id"]; // refer to it however the leaf entry has its @id
            // Now create the links to those from the parent object
            if (field.rocrate?.array) {
              if (!folderEntry[propertyKey]) folderEntry[propertyKey] = [];
              // add a link to it in field the array. E.g. "workingLanguages": [ { "@id": "#en" }, { "@id": "#fr" } ]
              folderEntry[propertyKey].push(reference);
            } else folderEntry[propertyKey] = reference;
          });
        } else {
          folderEntry[propertyKey] = values[0]; // we have a key, but nothing else. Can use, e.g. to rename "keyword" to "keywords"
        }
      }
    }

    // if there's no rocrate field definition, so just add it as a simple text property using the same name as lameta does
    else {
      folderEntry[propertyKey] = values[0];
    }
  }

  // Now handle any custom fields from the properties

  folder.metadataFile!.properties.forEach((key, field) => {
    if (!field.definition.isCustom) return;
    // Skip if this was already handled as a known field
    if (folder.knownFields.some((k) => k.key === key)) {
      return;
    }
    const value = field.text?.trim();
    if (value && value !== "unspecified") {
      folderEntry[key] = value;
    }
  });
}

function makeParticipantPointers(session: Session, project: Project): any[] {
  const uniqueNames = new Set<string>();

  return session
    .getAllContributionsToAllFiles()
    .map((contribution) => contribution.personReference.trim())
    .filter((name) => (uniqueNames.has(name) ? false : uniqueNames.add(name)))
    .map((name) => {
      const person = project.findPerson(name);
      return { "@id": person ? `People/${person.filePrefix}/` : name };
    });
}

async function makeEntriesFromParticipant(project: Project, session: Session) {
  const uniqueContributors: { [key: string]: Set<string> } = {};

  session.getAllContributionsToAllFiles().forEach((contribution) => {
    const personName = contribution.personReference.trim();
    const role = contribution.role.trim();

    if (!uniqueContributors[personName]) {
      uniqueContributors[personName] = new Set();
    }
    uniqueContributors[personName].add(role);
  });
  const template = getRoCrateTemplate(
    fieldDefinitionsOfCurrentConfig.common.find((f) => f.key === "person")!
  );

  const entriesForAllContributors: object[] = [];

  for (const name of Object.keys(uniqueContributors)) {
    const person = project.findPerson(name);

    // Review: if the person is not found, currently we output what we can, which is their ID and their roles.

    // add in the ro-crate stuff like @id and @type
    const personElement = getElementUsingTemplate(
      template,
      person ? `People/${person.filePrefix}/` : name
    );

    if (person) {
      // add all the other fields from the person object and create "otherEntries" as needed if the person needs to point to them
      await addFieldEntries(person, personElement, entriesForAllContributors);
      addChildFileEntries(person, personElement, entriesForAllContributors);
    }
    // add the roles this person has in the session
    personElement["role"] = Array.from(uniqueContributors[name]).map((role) => {
      return { "@id": `role_${role}` };
    });
    entriesForAllContributors.push(personElement);
  }
  return entriesForAllContributors;
}

// now we need an array of role elements, one for each unique role in the session
function getRoles(session: Session) {
  const uniqueRoles = new Set<string>();
  session.getAllContributionsToAllFiles().forEach((contribution) => {
    uniqueRoles.add(contribution.role.trim());
  });
  return Array.from(uniqueRoles).map((role) => {
    return {
      "@id": `role_${role}`,
      "@type": "Role",
      name: role
    };
  });
}
function getRoCrateTemplate(field: any): any {
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
    return (folder as Session).getLanguageCodes(field.key);
  } else {
    const v = folder.metadataFile?.properties.getHasValue(field.key)
      ? folder.metadataFile?.getTextProperty(field.key, "").trim()
      : "";
    return v ? [v] : [];
  }
}

function getElementUsingTemplate(template: object, value: string): object {
  const output = {};
  Object.keys(template).forEach((key) => {
    // when we're handling person languages, those are whole objects with various properties
    // and we handle them in getPersonLanguageElement(). But other places we just have
    // the code, and end up in this function, where we do use the same template for languages
    // but insted of [v], that template has [code] which we replace with the value
    output[key] = template[key].replace("[v]", value).replace("[code]", value);
  });

  return output;
}

function getPersonLanguageElement(value: IPersonLanguage): object {
  const languageField = fieldDefinitionsOfCurrentConfig.common.find(
    (f) => f.key === "language"
  );
  const template = languageField?.rocrate?.template;

  if (!template) {
    return {};
  }

  const output = {};
  Object.keys(template).forEach((key) => {
    let val = template[key];

    // Find placeholders in the format [property]
    val = val.replace(/\[([^\]]+)\]/g, (match, property) => {
      let replacement;
      if (property === "languageName") {
        const name =
          staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
            value.code
          );
        replacement = val.replace("[languageName]", name);
      } else replacement = value[property];
      return replacement !== undefined && replacement !== ""
        ? replacement
        : undefined;
    });

    output[key] = val;
  });

  return output;
}

function addChildFileEntries(
  folder: Folder,
  folderEntry: object,
  otherEntries: object[]
): void {
  if (folder.files.length === 0) return;
  folderEntry["hasPart"] = [];
  folder.files.forEach((file) => {
    const path = file.getActualFilePath();
    const fileName = Path.basename(path);
    const fileExt = Path.extname(fileName).toLowerCase();

    // Determine the appropriate @type based on file extension and context
    let fileType = "File";
    let fileRole = "file";

    if (fileExt.match(/\.(mp3|wav|m4a|aac|flac)$/)) {
      fileType = "AudioObject";
      fileRole = "media";
    } else if (fileExt.match(/\.(mp4|avi|mov|mkv|webm)$/)) {
      fileType = "VideoObject";
      fileRole = "media";
    } else if (fileExt.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/)) {
      fileType = "ImageObject";
      fileRole = fileName.includes("Photo") ? "photo" : "image";
    } else if (fileExt.match(/\.(xml|eaf|txt|doc|docx|pdf|person|session)$/)) {
      fileType = "DigitalDocument";
      fileRole = "documentation";
    }

    // Use proper file ID based on folder type
    let fileId = fileName;
    if (folder instanceof Session) {
      fileId = `Sessions/${folder.filePrefix}/${fileName}`;
    } else if (folder instanceof Person) {
      fileId = `People/${folder.filePrefix}/${fileName}`;
    }

    const fileEntry: any = {
      "@id": fileId,
      "@type": fileType,
      contentSize: fs.statSync(path).size,
      dateCreated: fs.statSync(path).birthtime.toISOString(),
      dateModified: file.getModifiedDate()?.toISOString(),
      encodingFormat: getMimeType(
        Path.extname(fileName).toLowerCase().replace(/\./g, "")
      ),
      name: fileName,
      role: fileRole
    };

    otherEntries.push(fileEntry);
    folderEntry["hasPart"].push({
      "@id": fileId
    });
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

function getDescriptionFromAccessChoice(
  choiceLabel: string,
  authorityLists: AuthorityLists
): string {
  const choice = authorityLists.accessChoicesOfCurrentProtocol.find(
    (c: IChoice) => c.label === choiceLabel
  );
  if (!choice) return "";
  return choice.description;
}
