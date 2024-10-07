import { Folder } from "src/model/Folder/Folder";
import { Project } from "../model/Project/Project";

// Function to convert project data to RO-Crate JSON-LD
export function getRoCrate(folder: Folder): object {
  const roCrate = {
    "@context": ["https://w3id.org/ro/crate/1.1/context"],
    "@graph": []
  };

  // Adding the root dataset
  const rootDataset = {
    "@type": "Dataset",
    "@id": "./",
    name: folder.metadataFile?.getTextProperty("title")
  };
  roCrate["@graph"].push(rootDataset);

  const roCrateEntry = {
    "@id": "./", // TODO
    "@type": "Dataset", // TODO
    name: folder.metadataFile?.getTextProperty("title")
  };

  // Mapping fields from project data to RO-Crate properties
  folder.knownFields.forEach((field) => {
    const key = folder.metadataFile?.getTextProperty(field.key);
    if (!key) return;
    roCrateEntry[field.key] = folder.metadataFile?.getTextProperty(
      field.key,
      "MISSING"
    ); // e.g. "FUnding Project Title"
    // if (field.rocrate?.type) {
    //   roCrateEntry["@type"] = field.rocrate?.type;
    // }
  });
  roCrate["@graph"].push(roCrateEntry);
  return roCrate;
}
