import { Folder } from "../model/Folder/Folder";
import { Session } from "../model/Project/Session/Session";
import { fieldDefinitionsOfCurrentConfig } from "../model/field/ConfiguredFieldDefinitions";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";
import * as Path from "path";
import * as fs from "fs-extra";
import { getMimeType } from "../model/file/FileTypeInfo";
import { Project } from "../model/Project/Project";
import { ro } from "date-fns/locale";
//import { getModifiedDate } from "../model/file/FileTypeInfo";

// Convert project data to RO-Crate JSON-LD
export function getRoCrate(folder: Folder): object {
  const roCrate: { "@context": string[]; "@graph": any[] } = {
    "@context": ["https://w3id.org/ro/crate/1.1/context"],
    "@graph": []
  };

  const rootDataset = {
    "@type": "Dataset",
    "@id": "./",
    name: folder.metadataFile?.getTextProperty("title")
  };
  roCrate["@graph"].push(rootDataset);

  const folderEntry = {
    "@id": "./", // TODO
    "@type": "Dataset", // TODO
    name: folder.metadataFile?.getTextProperty("title")
  };

  const leaves: any[] = [];

  // for every field in fields.json5, if it's in the folder, add it to the rocrate
  folder.knownFields.forEach((field) => {
    const values: string[] = getFieldValues(folder, field);
    if (values.length === 0 || values[0] === "unspecified") return;
    const propertyKey = field.rocrate?.key || field.key;
    folderEntry[propertyKey] = [];

    // does the fields.json5 specify how we should handle this field in the rocrate?
    if (field.rocrate) {
      const leafTemplate = getLeafTemplate(field);
      values.forEach((c: string) => {
        // For each value, create a graph entry that is the template, filled in with the value
        const leaf = processRoCrateTemplate(leafTemplate, c); // make the free-standing element representing this value. E.g. { "@id": "#en", "name": "English" }
        leaves.push(leaf);
        // Now create the links to those from the parent object
        if (field.rocrate.array) folderEntry[propertyKey].push(leaf["@id"]);
        // add a link to it in field the array. E.g. "workingLanguages": [ { "@id": "#en" }, { "@id": "#fr" } ]
        else folderEntry[propertyKey] = leaf["@id"];
      });
    }
    // there's no rocrate field definition, so just add it as a simple text property using the same name as lameta does
    else {
      folderEntry[propertyKey] = values[0];
    }
  });

  roCrate["@graph"].push(folderEntry);
  if (folder instanceof Session) {
    folderEntry["contributor"] = makeParticipantPointers(folder as Session);
    roCrate["@graph"].push(...getSessionPersonElements(folder as Session));
    roCrate["@graph"].push(...getRoles(folder as Session));
  }
  roCrate["@graph"].push(...leaves);
  addChildFileInfo(folder, folderEntry);
  return roCrate;
}

function makeParticipantPointers(session: Session): any[] {
  const uniqueNames = new Set<string>();

  return session
    .getAllContributionsToAllFiles()
    .map((contribution) => contribution.personReference.trim())
    .filter((name) => (uniqueNames.has(name) ? false : uniqueNames.add(name)))
    .map((name) => ({ "@id": name }));
}

function getSessionPersonElements(session: Session) {
  // return an array of objects, each of which is a person in the session. As part of each person object, include an array of the roles they made to the session. Don't list the same person twice, even if they have multiple roles.
  // Don't list a contribution role for a person twice, even if they have multiple contributions of that role.
  const uniqueContributors: { [key: string]: Set<string> } = {};

  session.getAllContributionsToAllFiles().forEach((contribution) => {
    const personName = contribution.personReference.trim();
    const role = contribution.role.trim();

    if (!uniqueContributors[personName]) {
      uniqueContributors[personName] = new Set();
    }
    uniqueContributors[personName].add(role);
  });
  const template = getLeafTemplate(
    fieldDefinitionsOfCurrentConfig.session.find(
      (f) => f.key === "participants"
    )!
  );

  return Object.keys(uniqueContributors).map((name) => {
    const personElement = processRoCrateTemplate(template, name);
    // add the roles this person has in the session
    personElement["role"] = Array.from(uniqueContributors[name]).map((role) => {
      return { "@id": `role_${role}` };
    });
    return personElement;
  });
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
function getLeafTemplate(field: any): any {
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
  if (field.rocrate?.handler === "languages") {
    return (folder as Session).getLanguageCodes(field.key);
  } else {
    const value = folder.metadataFile?.getTextProperty(field.key, "").trim();
    return value ? [value] : [];
  }
}

function processRoCrateTemplate(template: object, value: string): any {
  const output = {};
  Object.keys(template).forEach((key) => {
    const val = template[key];
    output[key] = val.replace("[v]", value);
    if (val.includes("[languageName]")) {
      const name =
        staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(value);
      output[key] = output[key].replace("[languageName]", name);
    }
  });
  return output;
}
function addChildFileInfo(folder: Folder, folderEntry: object): void {
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
    folderEntry["hasPart"].push(fileEntry);
  });
}
