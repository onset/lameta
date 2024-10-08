import { ro } from "date-fns/locale";
import { Folder } from "../model/Folder/Folder";
import { Session } from "../model/Project/Session/Session";
import { fieldDefinitionsOfCurrentConfig } from "../model/field/ConfiguredFieldDefinitions";

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

  // review this might have to be normalized across the project?
  const atoms: any[] = [];

  const data = folder.metadataFile!;
  const roCrateForLanguages = fieldDefinitionsOfCurrentConfig.common.find(
    (f) => f.key === "language"
  )!.rocrate;

  folder.knownFields.forEach((field) => {
    const value = data.getTextProperty(field.key, undefined);
    if (!value) return; // we have the property but it is empty
    if (value === "unspecified") return; // review

    // e.g. "FUnding Project Title"
    // if (field.rocrate?.type) {
    //   roCrateEntry["@type"] = field.rocrate?.type;
    // }

    if (field.rocrate) {
      const x = processRoCrateTemplate(
        field.rocrate.value,
        data.getTextProperty(field.key, "MISSING")
      );
      atoms.push(x);

      if (
        field.key.indexOf("languages") > -1 &&
        folder.folderType === "session"
      ) {
        const langCodes = (folder as Session).getLanguageCodes(field.key);

        langCodes.forEach((c: string) => {
          atoms.push(processRoCrateTemplate(roCrateForLanguages.value, c));
        });
      } else {
        if (field.rocrate.array) folderEntry[field.rocrate.key] = [x["@id"]];
        else folderEntry[field.rocrate.key] = x["@id"];
      }
    } else {
      folderEntry[field.key] = value;
    }
  });
  roCrate["@graph"].push(...atoms);
  roCrate["@graph"].push(folderEntry);
  return roCrate;
}

function processRoCrateTemplate(template: object, value: string): any {
  const output = {};
  Object.keys(template).forEach((key) => {
    const val = template[key];
    output[key] = val.replace("[v]", value);
  });
  return output;
}
