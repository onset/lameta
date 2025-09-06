import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import filesize from "filesize";

// --- Type Definitions ---
type RoCrateEntity = {
  "@id": string;
  "@type": string | string[];
  name?: string;
  [key: string]: any;
};

type RoCrateData = {
  "@context": any;
  "@graph": RoCrateEntity[];
};

// --- Constants and Helpers ---

// Entities that don't add any value to the human just wanting to know "what's in this collection"
const FILTERED_ENTITY_IDS = [
  "#collection-license",
  "#CustomGenreTerms",
  "ldac:DataReuseLicense",
  "ldac:OpenAccess",
  "ldac:AuthorizedAccess"
];

// Each item can be a string property name or an object { property, label, type }
// Project: order to reflect prior preview expectations
type OrderEntry =
  | string
  | { property: string; label?: string; type?: "date" | "size" };

const PROJECT_FIELDS: OrderEntry[] = [
  "description",

  { property: "ldac:subjectLanguage", label: "Subject Language" },
  {
    property: "collectionWorkingLanguages",
    label: "Collection Working Languages"
  },

  "region",
  "country"
];

const SESSION_FIELDS: OrderEntry[] = [
  "description",
  { property: "ldac:subjectLanguage", label: "Subject Language" },
  //{ property: "subjectLanguages", label: "Subject Languages" },
  { property: "inLanguage", label: "Working Language" },
  { property: "ldac:linguisticGenre", label: "Genre" },
  { property: "genre", label: "Genre" }, // Alternative property name for compatibility
  "ldac:participant",
  { property: "contentLocation", label: "Location" }
  //"creator",
  //"license",
  //"identifier",
  //"sameAs",
  //"url"
];

const PERSON_FIELDS: OrderEntry[] = [
  // part of the header "name",
  "description",
  "gender",
  "ldac:age"
];
const ORGANIZATION_FIELDS: OrderEntry[] = ["description", "url"];

// Default fields for entities that don't have specific field lists
const DEFAULT_FIELDS: OrderEntry[] = [
  "name",
  "description",
  "encodingFormat",
  { property: "contentSize", type: "size" },
  { property: "dateCreated", label: "Date Created", type: "date" },
  { property: "dateModified", label: "Date Modified", type: "date" },
  "creator",
  "license"
];

// Fields for LDAC DataReuseLicense entities
const LICENSE_FIELDS: OrderEntry[] = [
  "description",
  { property: "ldac:access", label: "Access" }
];

// Fields for Digital Document entities
const DIGITAL_DOCUMENT_FIELDS: OrderEntry[] = [
  { property: "encodingFormat", label: "Encoding Format" },
  { property: "ldac:materialType", label: "Material type" },
  { property: "contentSize", label: "Content size", type: "size" }
];

const getFieldsForEntity = (entity: RoCrateEntity): OrderEntry[] => {
  const types = Array.isArray(entity["@type"])
    ? entity["@type"]
    : [entity["@type"]];
  // Check for Event type first since sessions can have both Dataset and Event types
  if (types.includes("Event")) return SESSION_FIELDS;
  if (types.includes("Person")) return PERSON_FIELDS;
  if (types.includes("Organization")) return ORGANIZATION_FIELDS;
  if (types.includes("ldac:DataReuseLicense")) return LICENSE_FIELDS;
  // Both DigitalDocument and file entities (ImageObject, VideoObject, AudioObject) should use the same fields
  if (
    types.includes("DigitalDocument") ||
    types.includes("ImageObject") ||
    types.includes("VideoObject") ||
    types.includes("AudioObject")
  )
    return DIGITAL_DOCUMENT_FIELDS;
  if (entity["@id"] === "./" || types.includes("Dataset"))
    return PROJECT_FIELDS;

  return DEFAULT_FIELDS;
};

// Creates a URL-safe anchor ID from an entity ID
const createAnchorId = (id: string): string => {
  return id ? `entity_${id.replace(/[^a-zA-Z0-9]/g, "_")}` : "";
};

// Transforms property labels for display
function formatPropertyLabel(propertyName: string): string {
  // Explicit mappings for clarity
  if (propertyName === "hasPart") return "parts";
  if (propertyName === "pcdm:hasMember") return "events";
  const withoutPrefix = propertyName.replace(/^[a-zA-Z]+:/, "");
  const spaceSeparated = withoutPrefix.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Capitalize first letter instead of making everything lowercase
  const formatted = spaceSeparated.toLowerCase();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Helper function to check if an entity is a Language that should link to Glottolog
function isLanguageEntity(entity: RoCrateEntity): boolean {
  const types = Array.isArray(entity["@type"])
    ? entity["@type"]
    : [entity["@type"]];
  return types.includes("Language") && entity["@id"]?.startsWith("#language_");
}

// Helper function to check if an entity should be filtered out by ID or type
function isFilteredEntity(entity: RoCrateEntity): boolean {
  // Filter by specific entity IDs
  if (FILTERED_ENTITY_IDS.includes(entity["@id"])) {
    return true;
  }

  // Filter entities with unknown/placeholder IDs
  if (entity["@id"] === "tag:lameta/unknown") {
    return true;
  }

  const types = Array.isArray(entity["@type"])
    ? entity["@type"]
    : [entity["@type"]];

  // Filter official LDAC DefinedTerms
  if (
    types.includes("DefinedTerm") &&
    entity["@id"]?.startsWith("ldac:") &&
    entity.inDefinedTermSet?.["@id"]?.startsWith("ldac:")
  ) {
    return true;
  }

  // Filter official LDAC DefinedTermSets
  if (types.includes("DefinedTermSet") && entity["@id"]?.startsWith("ldac:")) {
    return true;
  }

  return false;
}

// Helper function to check if an entity is an official LDAC term that should link externally
function shouldLinkToLdacTerm(entity: RoCrateEntity): boolean {
  const types = Array.isArray(entity["@type"])
    ? entity["@type"]
    : [entity["@type"]];
  return (
    types.includes("DefinedTerm") &&
    entity["@id"]?.startsWith("ldac:") &&
    entity.inDefinedTermSet?.["@id"]?.startsWith("ldac:")
  );
}

// Helper function to check if an entity is a lameta XML file
function isLametaXmlFile(entity: RoCrateEntity): boolean {
  const id = entity["@id"];
  return (
    id?.endsWith(".sprj") || id?.endsWith(".session") || id?.endsWith(".person")
  );
}

// Helper function to check if an entity represents a file that browsers can handle
function isClickableFile(entity: RoCrateEntity): boolean {
  const id = entity["@id"];
  if (!id) return false;

  // Skip special metadata files
  if (id === "ro-crate-metadata.json" || id.startsWith("ro-crate")) {
    return false;
  }

  // Skip entities that are just references or don't represent actual files
  if (id.startsWith("#") || id.startsWith("ldac:") || id.startsWith("tag:")) {
    return false;
  }

  // Check if the file extension is something a browser can handle
  const browserSupportedExtensions = [
    // Images
    "jpg",
    "jpeg",
    "png",
    "gif",
    "svg",
    "webp",
    "bmp",
    // Video
    "mp4",
    "webm",
    "ogg",
    // Audio
    "mp3",
    "wav",
    "ogg",
    "m4a",
    // Text files
    "txt",
    "html",
    "htm",
    "css",
    "js",
    "json",
    "xml",
    "csv",
    // PDFs (browsers can display these)
    "pdf"
  ];

  const extension = id.toLowerCase().split(".").pop();
  return extension ? browserSupportedExtensions.includes(extension) : false;
}

// Helper function to check if an entity is a Place that should be filtered out
function isPlaceEntity(entity: RoCrateEntity): boolean {
  const types = Array.isArray(entity["@type"])
    ? entity["@type"]
    : [entity["@type"]];
  return types.includes("Place");
}

// Helper function to get the web URL for an official LDAC term
function getLdacTermUrl(termId: string): string {
  // Convert ldac:TermName to the web URL format
  // https://w3id.org/ldac/terms#TermName
  const termName = termId.replace("ldac:", "");
  return `https://w3id.org/ldac/terms#${termName}`;
}

// Helper function to get the Glottolog URL for a language code
function getGlottologUrl(languageCode: string): string {
  // Extract the language code from the #language_XXX format
  const code = languageCode.replace("#language_", "").split(":")[0];
  return `https://glottolog.org/resource/languoid/iso/${code}`;
}

// Helper function to convert file:// URLs and URL-encoded paths to display paths for HTML
function getDisplayPath(id: string): string {
  if (id.startsWith("file://")) {
    // Convert file:// URL to relative path
    try {
      const url = new URL(id);
      let path = decodeURIComponent(url.pathname);
      // Remove leading slash on Windows paths
      if (path.match(/^\/[A-Z]:/)) {
        path = path.substring(1);
      }
      // Convert backslashes to forward slashes for web compatibility
      path = path.replace(/\\/g, "/");

      // Extract just the relative path from the project directory
      // The path should be relative to where the HTML file is located
      // Since we're generating the HTML in the project root, we just need the relative part
      const pathSegments = path.split("/");

      // Find the segment that starts our relative path (usually "People", "Sessions", etc.)
      let startIndex = -1;
      for (let i = 0; i < pathSegments.length; i++) {
        if (
          pathSegments[i] === "People" ||
          pathSegments[i] === "Sessions" ||
          pathSegments[i] === "Description" ||
          pathSegments[i] === "OtherDocs"
        ) {
          startIndex = i;
          break;
        }
      }

      if (startIndex !== -1) {
        // Return the path starting from the recognized folder
        return pathSegments.slice(startIndex).join("/");
      }

      // Fallback: return just the filename
      return pathSegments[pathSegments.length - 1] || path;
    } catch (e) {
      // If URL parsing fails, return the original id
      return id;
    }
  }

  // Handle URL-encoded relative paths (e.g., "People/BAKEMBA%20Martine/BAKEMBA%20Martine_Photo.JPG")
  if (id.includes("%")) {
    try {
      return decodeURIComponent(id);
    } catch (e) {
      // If decoding fails, return the original id
      return id;
    }
  }

  return id;
}

// --- React Components ---

/**
 * Component for the CSS styles.
 */
const Style = () => (
  <style>{`
    :root {
      --color-primary: #4f7c0c;
      --color-primary-content: #568115;
      --color-primary-light: #cff09f;
      --color-background: #f8ffed;
      --color-white: white;
      --color-text: #333;
      --color-text-muted: #666;
      --color-border: #ddd;
      --color-entity-bg: #f9f9f9;
      --color-json-bg: #lightyellow;
    }
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; line-height: 1.6; background-color: var(--color-background); }
    a { color: var(--color-primary); text-decoration: underline; }
    a:visited { color: var(--color-primary); }
    a:hover { text-decoration: underline; }
    .header { }
    .main-content { overflow: auto; display: flex; flex-direction: column; gap: 20px; }
    .entity { border: 1px solid var(--color-border); border-radius: 5px; background-color: var(--color-white); position: relative; box-sizing: border-box; padding: 20px; }
    .entity.child .entity-header { display: none; }
    .entity:target { animation: targetHighlight 1s ease-in-out forwards; }
    @keyframes targetHighlight { 0% { background-color: var(--color-white); } 50% { background-color: #fff581ff; } 100% { background-color: var(--color-white); } }
    .entity-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .entity-id { font-weight: bold; background-color: var(--color-primary-content); color: var(--color-white); padding: 2px 8px; border-radius: 3px; font-size: 0.9em; display: inline-block; flex: 1; }
    .entity-types { display: flex; flex-wrap: wrap; gap: 5px; margin-left: 10px; }
    .entity-types.bottom-right { position: absolute; bottom: 10px; right: 10px; margin-left: 0; }
    .entity-type { background-color: transparent; color: var(--color-primary-content); padding: 2px 8px; font-size: 0.9em; }
    .property { margin: 8px 0; }
    .property-name { font-weight: bold; color: var(--color-text); }
    .property-value { color: var(--color-text-muted); margin-left: 10px; }
    .property-value a { color: var(--color-primary-content); text-decoration: underline; font-weight: 500; }
    .property-value a:visited { color: var(--color-primary-content); }
    .property-value a:hover { text-decoration: underline; }
    .sessions-list { list-style-type: disc; margin-left: 20px; padding-left: 0; }
    .sessions-list li { margin: 8px 0; }
    .sessions-list a { color: var(--color-primary-content); text-decoration: underline; font-weight: 500; }
    .sessions-list a:visited { color: var(--color-primary-content); }
    .sessions-list a:hover { text-decoration: underline; }
    .image-thumbnail { max-width: 200px; max-height: 200px; border: 1px solid var(--color-border); border-radius: 5px; margin: 10px 0; display: block; }
    .media-player { max-width: 400px; width: 100%; border: 1px solid var(--color-border); border-radius: 5px; margin: 10px 0; display: block; }
    .image-entity, .media-entity { text-align: left; display: inline-block; width: auto; min-width: 200px; max-width: 300px; vertical-align: top; margin: 5px; }
    .entity-children-container { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; padding-right: 30px; padding-left: 30px; }
    .entity-children-container .entity { flex: 0 0 auto; width: auto; box-sizing: border-box; min-height: 260px; min-width: 250px; }
  `}</style>
);

/**
 * Renders a property's value, automatically creating links for references.
 */
const PropertyValue: React.FC<{
  value: any;
  graph: RoCrateEntity[];
  propertyName?: string;
  fieldType?: string;
}> = ({ value, graph, propertyName, fieldType }) => {
  // Handle missing/undefined/null values
  if (value === null || value === undefined) {
    return (
      <span style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>
        Unknown
      </span>
    );
  }

  // Handle date formatting for fields with type "date"
  if (fieldType === "date" && typeof value === "string") {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // Format as YYYY-MM-DD (date only, no time)
        const formattedDate = date.toISOString().split("T")[0];
        return <>{formattedDate}</>;
      }
    } catch (e) {
      // If date parsing fails, fall through to normal rendering
    }
  }

  // Handle size formatting for fields with type "size"
  if (
    fieldType === "size" &&
    (typeof value === "string" || typeof value === "number")
  ) {
    try {
      const sizeInBytes =
        typeof value === "string" ? parseInt(value, 10) : value;
      if (!isNaN(sizeInBytes) && sizeInBytes >= 0) {
        // Format as human readable size (e.g., "74 MB")
        const formattedSize = filesize(sizeInBytes, { round: 0 });
        return <>{formattedSize}</>;
      }
    } catch (e) {
      // If size parsing fails, fall through to normal rendering
    }
  }

  if (Array.isArray(value)) {
    return (
      <>
        {value.map((item, index) => (
          <React.Fragment key={index}>
            <PropertyValue
              value={item}
              graph={graph}
              propertyName={propertyName}
              fieldType={fieldType}
            />
            {index < value.length - 1 && ", "}
          </React.Fragment>
        ))}
      </>
    );
  }

  const renderLink = (id: string, defaultName: string) => {
    const referencedEntity = graph.find((entity) => entity["@id"] === id);

    // Special handling for "Unknown" entities - don't link, just show text
    if (
      id === "tag:lameta/unknown" ||
      referencedEntity?.name === "Unknown" ||
      referencedEntity?.name === "<Unknown>" ||
      defaultName === "Unknown" ||
      defaultName === "<Unknown>"
    ) {
      return <>Unknown</>;
    }

    // Special handling for contentLocation (Place entities) - just show the name
    if (
      propertyName === "contentLocation" &&
      referencedEntity &&
      isPlaceEntity(referencedEntity)
    ) {
      return <>{referencedEntity.name || defaultName}</>;
    }

    // Check if this is an official LDAC term that should link externally
    if (referencedEntity && shouldLinkToLdacTerm(referencedEntity)) {
      const displayName = referencedEntity?.name || defaultName;
      const externalUrl = getLdacTermUrl(id);
      return (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
          {displayName}
        </a>
      );
    }

    // Check if this is an official LDAC DataReuseLicense that should link externally
    // This includes the class definition
    if (referencedEntity && id === "ldac:DataReuseLicense") {
      const displayName = referencedEntity?.name || defaultName;
      const externalUrl = getLdacTermUrl("ldac:DataReuseLicense");
      return (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
          {displayName}
        </a>
      );
    }

    // Check if this is an official LDAC access type that should link externally
    if (
      referencedEntity &&
      (id === "ldac:OpenAccess" || id === "ldac:AuthorizedAccess")
    ) {
      const displayName = referencedEntity?.name || defaultName;
      const externalUrl = getLdacTermUrl(id);
      return (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
          {displayName}
        </a>
      );
    }

    // Check if this is a Language entity that should link to Glottolog
    if (referencedEntity && isLanguageEntity(referencedEntity)) {
      const displayName = referencedEntity?.name || defaultName;
      const externalUrl = getGlottologUrl(id);
      return (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
          {displayName}
        </a>
      );
    }

    // Check if this is an LDAC term ID that should link externally even if not found in graph
    if (!referencedEntity && id.startsWith("ldac:")) {
      const termName = id.replace("ldac:", "");
      // Convert camelCase to spaced words using title case (e.g., "PrimaryMaterial" -> "Primary Material")
      const displayName = termName.replace(/([a-z])([A-Z])/g, "$1 $2");
      const externalUrl = getLdacTermUrl(id);
      return (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
          {displayName}
        </a>
      );
    }

    const displayName = referencedEntity?.name || defaultName;
    const anchorId = createAnchorId(id);
    return <a href={`#${anchorId}`}>{displayName}</a>;
  };

  if (typeof value === "object" && value["@id"]) {
    return renderLink(value["@id"], value["@id"]);
  }

  if (typeof value === "string" && value.startsWith("#")) {
    const cleanReference = value.replace("#language_#language_", "#language_");
    const referencedEntity = graph.find((e) => e["@id"] === cleanReference);
    if (referencedEntity) {
      return renderLink(referencedEntity["@id"], cleanReference);
    }

    let displayName = cleanReference.replace("#", "");
    if (cleanReference.startsWith("#language_")) {
      displayName = cleanReference
        .replace("#language_", "")
        .replace(/__/g, " ")
        .replace(/_/g, " ");
    }
    return <a href={`#${createAnchorId(cleanReference)}`}>{displayName}</a>;
  }

  if (typeof value === "object") {
    return <pre>{JSON.stringify(value, null, 2)}</pre>;
  }

  // Handle "Unknown" as plain text without linking
  if (String(value) === "Unknown" || String(value) === "<Unknown>") {
    return <>Unknown</>;
  }

  // Special handling for collectionWorkingLanguages - semicolon-separated language codes
  if (
    propertyName === "collectionWorkingLanguages" &&
    typeof value === "string"
  ) {
    const languageCodes = value
      .split(";")
      .map((code) => code.trim())
      .filter((code) => code.length > 0);
    if (languageCodes.length > 0) {
      return (
        <>
          {languageCodes.map((code, index) => {
            // Try to find a Language entity in the graph for this code
            const languageEntity = graph.find(
              (entity) =>
                entity["@type"] === "Language" &&
                entity["@id"] === `#language_${code}`
            );

            if (languageEntity) {
              // Use the language entity's name and create a Glottolog link
              const externalUrl = getGlottologUrl(`#language_${code}`);
              return (
                <React.Fragment key={code}>
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {languageEntity.name || code}
                  </a>
                  {index < languageCodes.length - 1 && ", "}
                </React.Fragment>
              );
            } else {
              // No language entity found, just show the code
              return (
                <React.Fragment key={code}>
                  {code}
                  {index < languageCodes.length - 1 && ", "}
                </React.Fragment>
              );
            }
          })}
        </>
      );
    }
  }

  return <>{String(value)}</>;
};

/**
 * Renders a standard list of links to other entities.
 */
const LinkedEntityList: React.FC<{ entities: RoCrateEntity[] }> = ({
  entities
}) => {
  if (entities.length === 0) return null;
  return (
    <ul className="sessions-list">
      {entities.map((entity) => (
        <li key={entity["@id"]}>
          <a href={`#${createAnchorId(entity["@id"])}`}>
            {entity.name || entity["@id"]}
          </a>
        </li>
      ))}
    </ul>
  );
};

/**
 * Renders a single entity, adapting its display based on its type (e.g., Image, Generic).
 */
const Entity: React.FC<{
  entity: RoCrateEntity;
  graph: RoCrateEntity[];
  isRootDataset?: boolean;
  isChild?: boolean;
}> = ({ entity, graph, isRootDataset = false, isChild = false }) => {
  if (!entity) return null;

  const { "@id": id, "@type": type, name } = entity;
  const types = Array.isArray(type) ? type : [type];
  const anchorId = createAnchorId(id);

  const isImage =
    types.includes("ImageObject") ||
    (entity.encodingFormat &&
      String(entity.encodingFormat).startsWith("image/")) ||
    (id && /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(id));
  const isVideo =
    types.includes("VideoObject") ||
    (entity.encodingFormat &&
      String(entity.encodingFormat).startsWith("video/")) ||
    (id && /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/i.test(id));
  const isAudio =
    types.includes("AudioObject") ||
    (entity.encodingFormat &&
      String(entity.encodingFormat).startsWith("audio/")) ||
    (id && /\.(mp3|wav|ogg|aac|flac|m4a|wma)$/i.test(id));

  const entityClasses = `entity ${isChild ? "child" : ""} ${
    isImage ? "image-entity" : ""
  } ${isVideo || isAudio ? "media-entity" : ""}`.trim();

  const EntityHeader = () =>
    !isChild ? (
      <div className="entity-header">
        <div className="entity-id">{getDisplayPath(id) || "Unknown ID"}</div>
      </div>
    ) : null;
  const EntityTypes = () => (
    <div className="entity-types bottom-right">
      {types.filter(Boolean).map((t) => (
        <span key={t} className="entity-type">
          {t}
        </span>
      ))}
    </div>
  );

  if (isImage) {
    const displayPath = getDisplayPath(id);
    const fields = getFieldsForEntity(entity);
    const labelOverrideMap = new Map<string, string>();
    fields.forEach((entry) => {
      if (typeof entry !== "string" && entry?.label && entry.property) {
        labelOverrideMap.set(entry.property, entry.label);
      }
    });

    const propertiesToRender: Array<[string, any, string?]> = [];
    const usedLabels = new Set<string>(); // Track labels to avoid duplicates

    fields.forEach((entry) => {
      const key = typeof entry === "string" ? entry : entry.property;
      const fieldType = typeof entry === "string" ? undefined : entry.type;
      const label = labelOverrideMap.get(key) ?? formatPropertyLabel(key);
      const value = (entity as any)[key];

      // Check if this property has a value
      const hasValue = value !== null && value !== undefined;

      // If we already have a label and this property has no value, skip it
      if (usedLabels.has(label) && !hasValue) {
        return;
      }

      // If this property has a value, it can override a previous "Unknown" entry with the same label
      if (hasValue && usedLabels.has(label)) {
        // Find and remove any existing entry with this label that has no value
        const existingIndex = propertiesToRender.findIndex(
          ([existingKey, existingValue]) => {
            const existingLabel =
              labelOverrideMap.get(existingKey) ??
              formatPropertyLabel(existingKey);
            return (
              existingLabel === label &&
              (existingValue === null || existingValue === undefined)
            );
          }
        );
        if (existingIndex !== -1) {
          propertiesToRender.splice(existingIndex, 1);
        }
      }

      propertiesToRender.push([key, value, fieldType]);
      usedLabels.add(label);
    });

    return (
      <div className={entityClasses} id={anchorId}>
        <EntityHeader />
        <EntityTypes />
        {name && (
          <h3 style={{ margin: "10px 0", color: "var(--color-text)" }}>
            {name}
          </h3>
        )}
        <a href={displayPath}>
          <img
            src={displayPath}
            alt={`Image: ${name || id}`}
            className="image-thumbnail"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              if (target.nextElementSibling)
                (target.nextElementSibling as HTMLElement).style.display =
                  "block";
            }}
          />
        </a>
        <div
          style={{
            display: "none",
            color: "var(--color-text-muted)",
            fontStyle: "italic"
          }}
        >
          Image could not be loaded: {displayPath}
        </div>
        {propertiesToRender.map(([key, value, fieldType]) => {
          const label = labelOverrideMap.get(key) ?? formatPropertyLabel(key);
          return (
            <div key={key} className="property">
              <span className="property-name">{label}:</span>
              <span className="property-value">
                <PropertyValue
                  value={value}
                  graph={graph}
                  propertyName={key}
                  fieldType={fieldType}
                />
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (isVideo || isAudio) {
    const MediaTag = isVideo ? "video" : "audio";
    const displayPath = getDisplayPath(id);
    const fields = getFieldsForEntity(entity);
    const labelOverrideMap = new Map<string, string>();
    fields.forEach((entry) => {
      if (typeof entry !== "string" && entry?.label && entry.property) {
        labelOverrideMap.set(entry.property, entry.label);
      }
    });

    const propertiesToRender: Array<[string, any, string?]> = [];
    const usedLabels = new Set<string>(); // Track labels to avoid duplicates

    fields.forEach((entry) => {
      const key = typeof entry === "string" ? entry : entry.property;
      const fieldType = typeof entry === "string" ? undefined : entry.type;
      const label = labelOverrideMap.get(key) ?? formatPropertyLabel(key);
      const value = (entity as any)[key];

      // Check if this property has a value
      const hasValue = value !== null && value !== undefined;

      // If we already have a label and this property has no value, skip it
      if (usedLabels.has(label) && !hasValue) {
        return;
      }

      // If this property has a value, it can override a previous "Unknown" entry with the same label
      if (hasValue && usedLabels.has(label)) {
        // Find and remove any existing entry with this label that has no value
        const existingIndex = propertiesToRender.findIndex(
          ([existingKey, existingValue]) => {
            const existingLabel =
              labelOverrideMap.get(existingKey) ??
              formatPropertyLabel(existingKey);
            return (
              existingLabel === label &&
              (existingValue === null || existingValue === undefined)
            );
          }
        );
        if (existingIndex !== -1) {
          propertiesToRender.splice(existingIndex, 1);
        }
      }

      propertiesToRender.push([key, value, fieldType]);
      usedLabels.add(label);
    });

    return (
      <div className={entityClasses} id={anchorId}>
        <EntityHeader />
        <EntityTypes />
        {name && (
          <h3 style={{ margin: "10px 0", color: "var(--color-text)" }}>
            {name}
          </h3>
        )}
        <MediaTag controls className="media-player">
          <source src={displayPath} type={entity.encodingFormat || ""} />
          Your browser does not support the {MediaTag} tag.
        </MediaTag>
        {propertiesToRender.map(([key, value, fieldType]) => {
          const label = labelOverrideMap.get(key) ?? formatPropertyLabel(key);
          return (
            <div key={key} className="property">
              <span className="property-name">{label}:</span>
              <span className="property-value">
                <PropertyValue
                  value={value}
                  graph={graph}
                  propertyName={key}
                  fieldType={fieldType}
                />
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const fields = getFieldsForEntity(entity);
  const labelOverrideMap = new Map<string, string>();
  fields.forEach((entry) => {
    if (typeof entry !== "string" && entry?.label && entry.property) {
      labelOverrideMap.set(entry.property, entry.label);
    }
  });

  const propertiesToRender: Array<[string, any, string?]> = [];
  const usedLabels = new Set<string>(); // Track labels to avoid duplicates

  fields.forEach((entry) => {
    const key = typeof entry === "string" ? entry : entry.property;
    const fieldType = typeof entry === "string" ? undefined : entry.type;
    const label = labelOverrideMap.get(key) ?? formatPropertyLabel(key);
    const value = (entity as any)[key];

    // Check if this property has a value
    const hasValue = value !== null && value !== undefined;

    // If we already have a label and this property has no value, skip it
    if (usedLabels.has(label) && !hasValue) {
      return;
    }

    // If this property has a value, it can override a previous "Unknown" entry with the same label
    if (hasValue && usedLabels.has(label)) {
      // Find and remove any existing entry with this label that has no value
      const existingIndex = propertiesToRender.findIndex(
        ([existingKey, existingValue]) => {
          const existingLabel =
            labelOverrideMap.get(existingKey) ??
            formatPropertyLabel(existingKey);
          return (
            existingLabel === label &&
            (existingValue === null || existingValue === undefined)
          );
        }
      );
      if (existingIndex !== -1) {
        propertiesToRender.splice(existingIndex, 1);
      }
    }

    propertiesToRender.push([key, value, fieldType]);
    usedLabels.add(label);
  });

  // Special lists for root dataset - using direct entity type checking instead of filtering
  const specialLists: { [key: string]: RoCrateEntity[] } = {};

  if (isRootDataset) {
    specialLists["Sessions"] = [];
    specialLists["People"] = [];
    specialLists["Description Documents"] = [];
    specialLists["Other Documents"] = [];

    // Build lists by checking each entity's type directly (no filtering)
    graph.forEach((e) => {
      const types = Array.isArray(e["@type"]) ? e["@type"] : [e["@type"]];
      const entityId = e["@id"];

      if (types.includes("Event") && entityId?.startsWith("Sessions/")) {
        specialLists["Sessions"].push(e);
      } else if (types.includes("Person") && e.name !== "Unknown") {
        specialLists["People"].push(e);
      } else if (entityId?.startsWith("Description/")) {
        specialLists["Description Documents"].push(e);
      } else if (entityId?.startsWith("OtherDocs/")) {
        specialLists["Other Documents"].push(e);
      }
    });
  }

  const isClickable = isClickableFile(entity);
  const displayPath = isClickable ? getDisplayPath(id) : null;

  return (
    <div className={entityClasses} id={anchorId}>
      <EntityHeader />
      <EntityTypes />
      {name && (
        <h3 style={{ margin: "10px 0", color: "var(--color-text)" }}>
          {isClickable && displayPath ? (
            <a
              href={displayPath}
              style={{
                color: "var(--color-primary-content)",
                textDecoration: "underline",
                fontWeight: "500"
              }}
            >
              {name}
            </a>
          ) : (
            name
          )}
        </h3>
      )}
      {isLametaXmlFile(entity) && (
        <p
          style={{
            margin: "10px 0",
            color: "var(--color-text-muted)",
            fontStyle: "italic"
          }}
        >
          This is an XML file that is used by{" "}
          <a href="https://sites.google.com/site/metadatatooldiscussion/home">
            lameta
          </a>{" "}
          (<a href="https://github.com/onset/lameta">github</a>) software.
        </p>
      )}
      {propertiesToRender.map(([key, value, fieldType]) => {
        const label = labelOverrideMap.get(key) ?? formatPropertyLabel(key);
        return (
          <div key={key} className="property">
            <span className="property-name">{label}:</span>
            <span className="property-value">
              <PropertyValue
                value={value}
                graph={graph}
                propertyName={key}
                fieldType={fieldType}
              />
            </span>
          </div>
        );
      })}
      {isRootDataset &&
        Object.entries(specialLists).map(
          ([title, entities]) =>
            entities.length > 0 && (
              <div key={title} className="property">
                <span className="property-name">{title}:</span>
                <div className="property-value">
                  <LinkedEntityList entities={entities} />
                </div>
              </div>
            )
        )}
    </div>
  );
};

/**
 * Recursively renders an entity and its children based on ID path hierarchy.
 */
/**
 * Pre-compute the hierarchical structure of entities
 */
function computeHierarchy(graph: RoCrateEntity[]) {
  const rootEntities: RoCrateEntity[] = [];
  const childrenMap = new Map<string, RoCrateEntity[]>();

  // First pass: identify all root entities and build children map
  graph.forEach((entity) => {
    const entityId = entity["@id"];
    if (!entityId) return;

    // Skip ro-crate-metadata.json file
    if (entityId === "ro-crate-metadata.json") {
      return;
    }

    // Filter out entities by ID and type
    if (isFilteredEntity(entity)) {
      return;
    }

    // Skip Language entities - they should link to Glottolog
    if (isLanguageEntity(entity)) {
      return;
    }

    // Skip Place entities - they should only show their name in contentLocation
    if (isPlaceEntity(entity)) {
      return;
    }

    // Skip entities with "Unknown" names
    if (
      entity.name === "Unknown" ||
      entity.name === "<Unknown>" ||
      entity["@id"] === "tag:lameta/unknown"
    ) {
      return;
    }

    // Check if this entity is a child of any other entity in the graph
    const parentEntity = graph.find((parent) => {
      const parentId = parent["@id"];
      if (!parentId || parentId === entityId) {
        return false;
      }

      // Check if this entity is explicitly listed in the parent's hasPart array
      if (parent.hasPart && Array.isArray(parent.hasPart)) {
        const isInHasPart = parent.hasPart.some((part: any) => {
          if (typeof part === "object" && part["@id"]) {
            return part["@id"] === entityId;
          }
          return part === entityId;
        });
        if (isInHasPart) {
          // Special case: Person and Session entities should not be treated as children
          // of the root project even if they're in hasPart - they should have their own headers
          const entityTypes = Array.isArray(entity["@type"])
            ? entity["@type"]
            : [entity["@type"]];
          const isPersonOrSession =
            entityTypes.includes("Person") ||
            entityTypes.includes("Event") ||
            entityId.startsWith("People/") ||
            entityId.startsWith("Sessions/");
          if (parentId === "./" && isPersonOrSession) {
            return false;
          }
          return true;
        }
      }

      // Fallback to path-based detection for entities not explicitly listed
      if (!entityId.startsWith(parentId)) {
        return false;
      }

      // More precise parent-child detection
      const remainder = entityId.substring(parentId.length);

      // If parent ends with '/', child should have content after that with no more '/'
      if (parentId.endsWith("/")) {
        return remainder.length > 0 && !remainder.includes("/");
      }

      // If parent doesn't end with '/', child should start with '/' and be a direct child
      if (remainder.startsWith("/")) {
        const afterSlash = remainder.substring(1);
        return afterSlash.length > 0 && !afterSlash.includes("/");
      }

      return false;
    });

    // Special case: Description/, OtherDocs/, and *.sprj entities should be children of root project entity
    let finalParentEntity = parentEntity;
    if (
      entityId.startsWith("Description/") ||
      entityId.startsWith("OtherDocs/") ||
      entityId.endsWith(".sprj")
    ) {
      const rootProject = graph.find((e) => e["@id"] === "./");
      if (rootProject) {
        finalParentEntity = rootProject;
      }
    }

    if (finalParentEntity) {
      // This is a child entity
      const parentId = finalParentEntity["@id"];
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(entity);
    } else {
      // This is a root entity
      rootEntities.push(entity);
    }
  });

  // Sort root entities
  rootEntities.sort((a, b) => {
    const getSortPriority = (entity: RoCrateEntity) => {
      const id = entity["@id"];
      const types = Array.isArray(entity["@type"])
        ? entity["@type"]
        : [entity["@type"]];

      // Project comes first
      if (id === "./" || types.includes("Dataset")) return 0;

      // Description documents come second
      if (id?.startsWith("Description/")) return 1;

      // Other documents come third
      if (id?.startsWith("OtherDocs/")) return 2;

      // Sessions come fourth
      if (id?.startsWith("Sessions/") || types.includes("Event")) return 3;

      // People come fifth
      if (types.includes("Person")) return 4;

      // Everything else comes last
      return 5;
    };

    const priorityA = getSortPriority(a);
    const priorityB = getSortPriority(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Within the same priority group, sort alphabetically by @id
    return a["@id"].localeCompare(b["@id"]);
  });

  // Sort children within each parent as well
  childrenMap.forEach((children) => {
    children.sort((a, b) => {
      const getSortPriority = (entity: RoCrateEntity) => {
        const id = entity["@id"];

        // Description documents come first
        if (id?.startsWith("Description/")) return 0;

        // Other documents come second
        if (id?.startsWith("OtherDocs/")) return 1;

        // Everything else comes after
        return 2;
      };

      const priorityA = getSortPriority(a);
      const priorityB = getSortPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within the same priority group, sort alphabetically by @id
      return a["@id"].localeCompare(b["@id"]);
    });
  });

  return { rootEntities, childrenMap };
}

const StaticHierarchicalEntityDisplay: React.FC<{
  entity: RoCrateEntity;
  graph: RoCrateEntity[];
  childrenMap: Map<string, RoCrateEntity[]>;
  isRootDataset?: boolean;
  isChild?: boolean;
}> = ({
  entity,
  graph,
  childrenMap,
  isRootDataset = false,
  isChild = false
}) => {
  const entityId = entity["@id"];
  const children = childrenMap.get(entityId) || [];

  return (
    <>
      <Entity
        entity={entity}
        graph={graph}
        isRootDataset={isRootDataset}
        isChild={isChild}
      />
      {children.length > 0 && (
        <div className="entity-children-container">
          {children.map((child) => (
            <StaticHierarchicalEntityDisplay
              key={child["@id"]}
              entity={child}
              graph={graph}
              childrenMap={childrenMap}
              isRootDataset={false}
              isChild={true}
            />
          ))}
        </div>
      )}
    </>
  );
};

const HierarchicalEntityDisplay: React.FC<{
  entity: RoCrateEntity;
  graph: RoCrateEntity[];
  processedIds: Set<string>;
  onProcess: (id: string) => void;
  isRootDataset?: boolean;
  isChild?: boolean;
}> = ({
  entity,
  graph,
  processedIds,
  onProcess,
  isRootDataset = false,
  isChild = false
}) => {
  const entityId = entity["@id"];
  if (processedIds.has(entityId)) return null;
  onProcess(entityId);

  const children = graph.filter((child) => {
    const childId = child["@id"];
    if (!childId || childId === entityId || processedIds.has(childId))
      return false;

    // Skip ro-crate-metadata.json file
    if (childId === "ro-crate-metadata.json") {
      return false;
    }

    // Filter out entities by ID and type
    if (isFilteredEntity(child)) {
      return false;
    }

    // Skip Language entities
    if (isLanguageEntity(child)) {
      return false;
    }

    // Skip Place entities
    if (isPlaceEntity(child)) {
      return false;
    }

    // Skip entities with "Unknown" names
    if (child.name === "Unknown") {
      return false;
    }

    // Check if child is a direct descendant of this entity
    if (childId.startsWith(entityId)) {
      const remainder = childId.substring(entityId.length);

      // If parent ends with '/', child should have content after that with no more '/'
      if (entityId.endsWith("/")) {
        return remainder.length > 0 && !remainder.includes("/");
      }

      // If parent doesn't end with '/', child should start with '/' and be a direct child
      if (remainder.startsWith("/")) {
        const afterSlash = remainder.substring(1);
        return afterSlash.length > 0 && !afterSlash.includes("/");
      }
    }
    return false;
  });

  return (
    <>
      <Entity
        entity={entity}
        graph={graph}
        isRootDataset={isRootDataset}
        isChild={isChild}
      />
      {children.length > 0 && (
        <div className="entity-children-container">
          {children.map((child) => (
            <HierarchicalEntityDisplay
              key={child["@id"]}
              entity={child}
              graph={graph}
              processedIds={processedIds}
              onProcess={onProcess}
              isRootDataset={false}
              isChild={true}
            />
          ))}
        </div>
      )}
    </>
  );
};

const RoCratePreview: React.FC<{ roCrateData: RoCrateData }> = ({
  roCrateData
}) => {
  const graph = roCrateData["@graph"] || [];
  const rootDataset = graph.find((item) => item["@id"] === "./");

  // Use the new static hierarchy computation
  const { rootEntities, childrenMap } = computeHierarchy(graph);

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          RO-Crate Preview - {rootDataset?.name || "Research Object"}
        </title>
        <Style />
      </head>
      <body>
        <div className="header">
          <h1>{rootDataset?.name}</h1>
          <p>
            This dataset was created by{" "}
            <a href="https://github.com/onset/lameta">lameta</a>. This page is a
            simplified, human-readable view of the{" "}
            <a
              href="https://www.researchobject.org/ro-crate/"
              target="_blank"
              rel="noopener noreferrer"
            >
              RO-Crate
            </a>{" "}
            metadata found in the accompanying{" "}
            <a href="ro-crate-metadata.json">ro-crate-metadata.json</a> file,
            which conforms to the{" "}
            <a
              href="https://w3id.org/ldac/profile"
              target="_blank"
              rel="noopener noreferrer"
            >
              LDAC Profile
            </a>
            . The purpose of this page is to give you a general idea of what is
            in the dataset.
          </p>
        </div>
        <div className="main-content">
          {rootEntities.map((entity) => (
            <StaticHierarchicalEntityDisplay
              key={entity["@id"]}
              entity={entity}
              graph={graph}
              childrenMap={childrenMap}
              isRootDataset={entity["@id"] === "./"}
            />
          ))}
        </div>
      </body>
    </html>
  );
};

// --- Main Export Function ---

/**
 * Generates a static HTML preview of an RO-Crate.
 * @param roCrateData The RO-Crate JSON-LD data.
 * @returns A string containing the full HTML document.
 */
export function generateRoCrateHtml(roCrateData: RoCrateData): string {
  const doctype = "<!DOCTYPE html>";
  const markup = renderToStaticMarkup(
    <RoCratePreview roCrateData={roCrateData} />
  );
  return doctype + markup;
}
