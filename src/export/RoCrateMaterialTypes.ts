import { GetFileFormatInfoForPath } from "../model/file/FileTypeInfo";

/**
 * Determines the LDAC material type based on file type.
 * According to LDAC profile, every file should have an ldac:materialType property.
 * @param fileType The file type (e.g., "Audio", "Video", "Image")
 * @returns The LDAC material type URI
 */
export function getLdacMaterialType(fileType: string): string {
  if (!fileType) {
    return "ldac:Annotation";
  }

  switch (fileType) {
    case "Audio":
    case "Video":
    case "Image":
      return "ldac:PrimaryMaterial";
    default:
      return "ldac:Annotation";
  }
}

/**
 * Determines the LDAC material type based on file path.
 * According to LDAC profile, every file should have an ldac:materialType property.
 * @param filePath The path to the file
 * @returns The LDAC material type URI
 */
export function getLdacMaterialTypeForPath(filePath: string): string {
  const fileFormatInfo = GetFileFormatInfoForPath(filePath);
  const fileType = fileFormatInfo?.type || "unknown";
  return getLdacMaterialType(fileType);
}

/**
 * Creates LDAC material type definitions for the RO-Crate graph
 * @returns Array of LDAC material type definition objects
 */
export function createLdacMaterialTypeDefinitions(): object[] {
  return [
    {
      "@id": "ldac:MaterialTypes",
      "@type": "DefinedTermSet",
      name: "Material Types"
    },
    {
      "@id": "ldac:PrimaryMaterial",
      "@type": "DefinedTerm",
      name: "Primary Material",
      description:
        "The object of study, such as a literary work, film, or recording of natural discourse.",
      inDefinedTermSet: { "@id": "ldac:MaterialTypes" }
    },
    {
      "@id": "ldac:Annotation",
      "@type": "DefinedTerm",
      name: "Annotation",
      description:
        "The resource includes material that adds information to some other linguistic record.",
      inDefinedTermSet: { "@id": "ldac:MaterialTypes" }
    },
    {
      "@id": "ldac:DerivedMaterial",
      "@type": "DefinedTerm",
      name: "Derived Material",
      description:
        "This is derived from another source, such as a Primary Material, via some process, e.g. a downsampled video or a sample or an abstract of a resource that is not an annotation (an analysis or description).",
      inDefinedTermSet: { "@id": "ldac:MaterialTypes" }
    }
  ];
}
