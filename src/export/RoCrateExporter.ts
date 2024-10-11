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

// Info:
// https://www.researchobject.org/ro-crate/
// https://github.com/Language-Research-Technology/ldac-profile
// https://github.com/Language-Research-Technology/ldac-profile/blob/master/profile/profile.md
// https://www.researchobject.org/ro-crate/profiles.html#paradisec-profile

export function getRoCrate(project: Project, folder: Folder): object {
  if (folder instanceof Person) {
    const entry = {};
    const otherEntries: object[] = [];
    addFieldEntries(folder, entry, otherEntries);
    addChildFileEntries(folder, entry, otherEntries);
    return [entry, ...getUniqueEntries(otherEntries)];
  }
  const roCrate: { "@context": any[]; "@graph": object[] } = {
    "@context": [
      "https://w3id.org/ro/crate/1.2-DRAFT/context",
      { "@vocab": "http://schema.org/" },
      "http://purl.archive.org/language-data-commons/context.json",
      "https://w3id.org/ldac/context"
    ],
    "@graph": []
  };

  // const rootDataset = {
  //   "@type": "Dataset",
  //   "@id": "./",
  //   name: folder.metadataFile?.getTextProperty("title")
  // };
  // roCrate["@graph"].push(rootDataset);

  const mainEntry = {
    "@id": `${project.filePrefix}/${folder.filePrefix}`,
    "@type": ["Data", "Object", "RepositoryObject"],
    conformsTo: { "@id": "https://w3id.org/ldac/profile#Object" },
    name: folder.metadataFile?.getTextProperty("title")
  };

  const otherEntries: any[] = [];

  addFieldEntries(folder, mainEntry, otherEntries);

  roCrate["@graph"].push(mainEntry);
  if (folder instanceof Session) {
    mainEntry["contributor"] = makeParticipantPointers(folder as Session);
    roCrate["@graph"].push(
      ...makeEntriesFromParticipant(project, folder as Session)
    );
    roCrate["@graph"].push(...getRoles(folder as Session));
  }

  addChildFileEntries(folder, mainEntry, otherEntries);
  addEndingBoilerplateEntries(otherEntries);

  roCrate["@graph"].push(...otherEntries);
  roCrate["@graph"] = getUniqueEntries(roCrate["@graph"]);
  return roCrate;
}
function addEndingBoilerplateEntries(entries: any[]) {
  entries.push({
    "@id": "ro-crate-metadata.json",
    "@type": "CreativeWork",
    conformsTo: { "@id": "https://w3id.org/ro/crate/1.2-DRAFT" }
    //"about": { "@id": "http://example.org/repository/NT1/Kalsarap" }
  });
}

// for every field in fields.json5, if it's in the folder, add it to the rocrate
function addFieldEntries(
  folder: Folder,
  folderEntry: object,
  otherEntries: object[]
) {
  folder.knownFields.forEach((field) => {
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
      const leafTemplate = getRoCrateTemplate(field);
      values.forEach((c: string) => {
        console.log("value:", c);
        // For each value, create a graph entry that is the template, filled in with the value
        const leaf = getElementUsingTemplate(leafTemplate, c); // make the free-standing element representing this value. E.g. { "@id": "#en", "name": "English" }
        otherEntries.push(leaf);
        const reference = leaf["@id"]; // refer to it however the leaf entry has its @id
        // Now create the links to those from the parent object
        if (field.rocrate.array) {
          if (!folderEntry[propertyKey]) folderEntry[propertyKey] = [];
          // add a link to it in field the array. E.g. "workingLanguages": [ { "@id": "#en" }, { "@id": "#fr" } ]
          folderEntry[propertyKey].push(reference);
        } else folderEntry[propertyKey] = reference;
      });
    }

    // if there's no rocrate field definition, so just add it as a simple text property using the same name as lameta does
    else {
      folderEntry[propertyKey] = values[0];
    }
  });
}

function makeParticipantPointers(session: Session): any[] {
  const uniqueNames = new Set<string>();

  return session
    .getAllContributionsToAllFiles()
    .map((contribution) => contribution.personReference.trim())
    .filter((name) => (uniqueNames.has(name) ? false : uniqueNames.add(name)))
    .map((name) => ({ "@id": name }));
}

function makeEntriesFromParticipant(project: Project, session: Session) {
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

  Object.keys(uniqueContributors).forEach((name) => {
    const person = project.findPerson(name)!;

    // add in the ro-crate stuff like @id and @type
    const personElement = getElementUsingTemplate(
      template,
      person.getIdToUseForReferences()
    );

    // add all the other fields from the person object and create "otherEntries" as needed if the person needs to point to them
    addFieldEntries(person, personElement, entriesForAllContributors);
    addChildFileEntries(person, personElement, entriesForAllContributors);

    // add the roles this person has in the session
    personElement["role"] = Array.from(uniqueContributors[name]).map((role) => {
      return { "@id": `role_${role}` };
    });
    entriesForAllContributors.push(personElement);
  });
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
  if (field.rocrate?.handler === "languages")
    return fieldDefinitionsOfCurrentConfig.common.find(
      (f) => f.key === "language"
    )!.rocrate.template;

  if (field.rocrate?.handler === "person") {
    return fieldDefinitionsOfCurrentConfig.common.find(
      (f) => f.key === "person"
    )!.rocrate.template;
  }

  // no handler specified, assume this is just a normal value but one that we want to list as "[ {@id:'#blah'} ]"
  return field.rocrate.template;
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
  const template = fieldDefinitionsOfCurrentConfig.common.find(
    (f) => f.key === "language"
  )!.rocrate.template;
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

    const fileEntry = {
      "@id": fileName,
      "@type": "File",
      contentSize: fs.statSync(path).size,
      dateCreated: fs.statSync(path).birthtime.toISOString(),
      dateModified: file.getModifiedDate()?.toISOString(),
      encodingFormat: getMimeType(
        Path.extname(fileName).toLowerCase().replace(/\./g, "")
      ),
      name: fileName
    };
    otherEntries.push(fileEntry);
    folderEntry["hasPart"].push({
      "@id": fileName
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

  console.log("Removed duplicate entries");
  console.log(JSON.stringify(otherEntries, null, 2));
  return unique;
}
