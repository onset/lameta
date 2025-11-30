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

// Each item can be a string property name or an object { property, label, type }
// Project: order to reflect prior preview expectations
type OrderEntry =
  | string
  | { property: string; label?: string; type?: "date" | "size" };

// --- Entity Classification ---

// Helper to get normalized type array from an entity
const getEntityTypes = (entity: RoCrateEntity): string[] =>
  Array.isArray(entity["@type"]) ? entity["@type"] : [entity["@type"]];

// Entities that don't add any value to the human just wanting to know "what's in this collection"
const FILTERED_ENTITY_IDS = new Set([
  "#collection-license",
  "#CustomGenreTerms",
  "ldac:DataReuseLicense",
  "ldac:OpenAccess",
  "ldac:AuthorizedAccess",
  "https://lexvo.org/id/iso639-3/und", // "undetermined" language
  "#descriptionDocuments",
  "#otherDocuments"
]);

/**
 * EntityClassifier - Unified entity classification logic.
 * Consolidates all the filtering and categorization checks.
 */
const EntityClassifier = {
  /** Check if entity is a Language that should link to Glottolog */
  isLanguage(entity: RoCrateEntity): boolean {
    return (
      getEntityTypes(entity).includes("Language") &&
      entity["@id"]?.startsWith("#language_")
    );
  },

  /** Check if entity is a Place */
  isPlace(entity: RoCrateEntity): boolean {
    return getEntityTypes(entity).includes("Place");
  },

  /** Check if entity is an official LDAC term that should link externally */
  isOfficialLdacTerm(entity: RoCrateEntity): boolean {
    const types = getEntityTypes(entity);
    return (
      types.includes("DefinedTerm") &&
      entity["@id"]?.startsWith("ldac:") &&
      entity.inDefinedTermSet?.["@id"]?.startsWith("ldac:")
    );
  },

  /** Check if entity is a structural wrapper Dataset that shouldn't be rendered */
  isWrapperDataset(entity: RoCrateEntity): boolean {
    const id = entity["@id"];
    const types = getEntityTypes(entity);

    // Only filter Dataset types
    if (!types.includes("Dataset")) return false;

    // Don't filter if it has session types - it's a real session, not a wrapper
    if (hasSessionType(types)) return false;

    // Filter People/ Dataset
    if (id === "People/") return true;

    // Filter person-files Datasets (e.g., People/Awi_Heole/)
    if (id?.startsWith("People/") && id.endsWith("/") && id !== "People/")
      return true;

    // Filter Sessions/ top-level directory Dataset
    if (id === "Sessions/") return true;

    // Filter session directory Datasets (e.g., Sessions/ETR008/) ONLY if they're pure wrappers
    // A pure wrapper has only hasPart and structural properties, no session content like description
    if (id?.startsWith("Sessions/") && id.endsWith("/") && id !== "Sessions/") {
      // Check if this is a pure wrapper (no meaningful session content)
      // If it has description, name (other than the ID), or session-specific properties, keep it
      const hasSessionContent =
        entity.description ||
        entity["ldac:participant"] ||
        entity["ldac:subjectLanguage"] ||
        (entity.name &&
          entity.name !== id &&
          !entity.name.startsWith("Session "));
      if (!hasSessionContent) return true;
    }

    // Filter People/ directory Dataset
    if (id === "People/") return true;

    // Filter DescriptionDocuments/ and OtherDocuments/ directory Datasets
    if (id === "DescriptionDocuments/" || id === "OtherDocuments/") return true;

    return false;
  },

  /** Check if entity should be filtered out entirely from the display */
  isFiltered(entity: RoCrateEntity): boolean {
    const id = entity["@id"];

    // Filter by specific entity IDs
    if (FILTERED_ENTITY_IDS.has(id)) return true;

    // Filter entities with unknown/placeholder IDs
    if (id === "tag:lameta/unknown") return true;

    const types = getEntityTypes(entity);

    // Filter official LDAC DefinedTerms
    if (this.isOfficialLdacTerm(entity)) return true;

    // Filter official LDAC DefinedTermSets
    if (types.includes("DefinedTermSet") && id?.startsWith("ldac:"))
      return true;

    // Filter structural wrapper Datasets
    if (this.isWrapperDataset(entity)) return true;

    return false;
  },

  /** Check if entity is a lameta XML file */
  isLametaXml(entity: RoCrateEntity): boolean {
    const id = entity["@id"];
    return (
      id?.endsWith(".sprj") ||
      id?.endsWith(".session") ||
      id?.endsWith(".person")
    );
  },

  /** Check if entity represents a browser-handleable file */
  isClickableFile(entity: RoCrateEntity): boolean {
    const id = entity["@id"];
    if (!id) return false;

    // Skip special metadata files and non-file references
    if (
      id === "ro-crate-metadata.json" ||
      id.startsWith("ro-crate") ||
      id.startsWith("#") ||
      id.startsWith("ldac:") ||
      id.startsWith("tag:")
    )
      return false;

    const browserSupportedExtensions = new Set([
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
      // PDFs
      "pdf"
    ]);

    const extension = id.toLowerCase().split(".").pop();
    return extension ? browserSupportedExtensions.has(extension) : false;
  },

  /** Get the media type of an entity (image, video, audio, or null) */
  getMediaType(entity: RoCrateEntity): "image" | "video" | "audio" | null {
    const { "@id": id, encodingFormat } = entity;
    const types = getEntityTypes(entity);
    const format = String(encodingFormat || "");

    if (
      types.includes("ImageObject") ||
      format.startsWith("image/") ||
      (id && /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(id))
    )
      return "image";

    if (
      types.includes("VideoObject") ||
      format.startsWith("video/") ||
      (id && /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/i.test(id))
    )
      return "video";

    if (
      types.includes("AudioObject") ||
      format.startsWith("audio/") ||
      (id && /\.(mp3|wav|ogg|aac|flac|m4a|wma)$/i.test(id))
    )
      return "audio";

    return null;
  }
};

// --- Field Configuration ---
// Centralized field definitions by entity type

const ENTITY_FIELDS: Record<string, OrderEntry[]> = {
  Project: [
    "description",
    { property: "ldac:subjectLanguage", label: "Subject Language" },
    {
      property: "collectionWorkingLanguages",
      label: "Collection Working Languages"
    },
    "region",
    { property: "contentLocation", label: "Country" }
  ],
  Session: [
    "description",
    { property: "ldac:subjectLanguage", label: "Subject Language" },
    { property: "inLanguage", label: "Working Language" },
    { property: "ldac:linguisticGenre", label: "Genre" },
    { property: "genre", label: "Genre" },
    "ldac:participant",
    { property: "contentLocation", label: "Location" }
  ],
  Person: [
    "description",
    { property: "ldac:age", label: "Age" }
    // Note: Person contributions are generated dynamically as prose below these fields
  ],
  Organization: ["description", "url"],
  License: ["description", { property: "ldac:access", label: "Access" }],
  DefinedTerm: ["name", "description"],
  DigitalDocument: [
    { property: "encodingFormat", label: "Encoding Format" },
    { property: "contentSize", label: "Content size", type: "size" }
  ],
  Default: [
    "name",
    "description",
    "encodingFormat",
    { property: "contentSize", type: "size" },
    { property: "dateCreated", label: "Date Created", type: "date" },
    { property: "dateModified", label: "Date Modified", type: "date" },
    "creator",
    "license"
  ]
};

const hasSessionType = (types: string[]): boolean =>
  types.includes("CollectionEvent") || types.includes("Event");

const getFieldsForEntity = (entity: RoCrateEntity): OrderEntry[] => {
  const types = getEntityTypes(entity);

  if (hasSessionType(types)) return ENTITY_FIELDS.Session;
  if (types.includes("Person")) return ENTITY_FIELDS.Person;
  if (types.includes("Organization")) return ENTITY_FIELDS.Organization;
  if (types.includes("ldac:DataReuseLicense")) return ENTITY_FIELDS.License;
  if (types.includes("DefinedTerm")) return ENTITY_FIELDS.DefinedTerm;
  if (
    types.includes("File") ||
    types.includes("ImageObject") ||
    types.includes("VideoObject") ||
    types.includes("AudioObject")
  )
    return ENTITY_FIELDS.DigitalDocument;
  if (entity["@id"] === "./" || types.includes("Dataset"))
    return ENTITY_FIELDS.Project;

  return ENTITY_FIELDS.Default;
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

// --- Link Resolution ---

type LinkTarget =
  | { type: "plain"; text: string }
  | { type: "internal"; href: string; text: string }
  | { type: "external"; href: string; text: string };

/**
 * LinkResolver - Unified link resolution logic.
 * Determines whether an entity reference should be:
 * - Plain text (for unknown/place entities)
 * - External link (LDAC terms, Glottolog)
 * - Internal anchor link
 */
const LinkResolver = {
  resolve(
    id: string,
    defaultName: string,
    graph: RoCrateEntity[],
    propertyName?: string
  ): LinkTarget {
    const entity = graph.find((e) => e["@id"] === id);

    // Unknown entities - show plain text
    if (
      id === "tag:lameta/unknown" ||
      entity?.name === "Unknown" ||
      entity?.name === "<Unknown>" ||
      defaultName === "Unknown" ||
      defaultName === "<Unknown>"
    ) {
      return { type: "plain", text: "Unknown" };
    }

    // Place entities in contentLocation - show plain text name
    if (
      propertyName === "contentLocation" &&
      entity &&
      EntityClassifier.isPlace(entity)
    ) {
      return { type: "plain", text: entity.name || defaultName };
    }

    // Official LDAC terms - external link
    if (entity && EntityClassifier.isOfficialLdacTerm(entity)) {
      return {
        type: "external",
        href: getLdacTermUrl(id),
        text: entity.name || defaultName
      };
    }

    // LDAC DataReuseLicense class - external link
    if (entity && id === "ldac:DataReuseLicense") {
      return {
        type: "external",
        href: getLdacTermUrl(id),
        text: entity.name || defaultName
      };
    }

    // LDAC access types - external link
    if (
      entity &&
      (id === "ldac:OpenAccess" || id === "ldac:AuthorizedAccess")
    ) {
      return {
        type: "external",
        href: getLdacTermUrl(id),
        text: entity.name || defaultName
      };
    }

    // Language entities - external Glottolog link
    if (entity && EntityClassifier.isLanguage(entity)) {
      return {
        type: "external",
        href: getGlottologUrl(id),
        text: entity.name || defaultName
      };
    }

    // LDAC term ID not in graph - external link
    if (!entity && id.startsWith("ldac:")) {
      const termName = id.replace("ldac:", "");
      const displayName = termName.replace(/([a-z])([A-Z])/g, "$1 $2");
      return {
        type: "external",
        href: getLdacTermUrl(id),
        text: displayName
      };
    }

    // Default - internal anchor link
    return {
      type: "internal",
      href: `#${createAnchorId(id)}`,
      text: entity?.name || defaultName
    };
  },

  /** Render a resolved link target as JSX */
  render(target: LinkTarget): JSX.Element {
    switch (target.type) {
      case "plain":
        return <>{target.text}</>;
      case "external":
        return (
          <a href={target.href} target="_blank" rel="noopener noreferrer">
            {target.text}
          </a>
        );
      case "internal":
        return <a href={target.href}>{target.text}</a>;
    }
  }
};

// Helper function to convert RO-Crate @id values to display paths for HTML src/href attributes.
// The @id values are percent-encoded via sanitizeForIri() in RoCrateUtils.ts, so we simply
// decode them to get the original file paths that match the actual files on disk.
function getDisplayPath(id: string): string {
  // Skip non-file references
  if (
    !id ||
    id.startsWith("#") ||
    id.startsWith("ldac:") ||
    id.startsWith("tag:") ||
    id.startsWith("http://") ||
    id.startsWith("https://")
  ) {
    return id;
  }

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
      const pathSegments = path.split("/");

      // Find the segment that starts our relative path (usually "People", "Sessions", etc.)
      let startIndex = -1;
      for (let i = 0; i < pathSegments.length; i++) {
        if (
          pathSegments[i] === "People" ||
          pathSegments[i] === "Sessions" ||
          pathSegments[i] === "Description" ||
          pathSegments[i] === "DescriptionDocuments" ||
          pathSegments[i] === "OtherDocs" ||
          pathSegments[i] === "OtherDocuments"
        ) {
          startIndex = i;
          break;
        }
      }

      if (startIndex !== -1) {
        return pathSegments.slice(startIndex).join("/");
      }

      // Fallback: return just the filename
      return pathSegments[pathSegments.length - 1] || path;
    } catch (e) {
      return id;
    }
  }

  // For relative paths, simply decode the percent-encoded characters
  try {
    return decodeURIComponent(id);
  } catch (e) {
    // If decoding fails, return the original id
    return id;
  }
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
    h3 { word-wrap: break-word; overflow-wrap: break-word; }
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
    .entity-id { font-weight: bold; background-color: var(--color-primary-content); color: var(--color-white); padding: 2px 8px; border-radius: 3px; font-size: 0.9em; display: inline-block; flex: 1; word-wrap: break-word; overflow-wrap: break-word; }
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
    const target = LinkResolver.resolve(id, defaultName, graph, propertyName);
    return LinkResolver.render(target);
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

  // Handle URL strings - make them clickable links
  if (
    propertyName === "url" &&
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://"))
  ) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        {value}
      </a>
    );
  }

  return <>{String(value)}</>;
};

/**
 * Renders a standard list of links to other entities.
 * For sessions, displays as "ID: Name" (e.g., "ETR008: Under the House").
 */
const LinkedEntityList: React.FC<{ entities: RoCrateEntity[] }> = ({
  entities
}) => {
  if (entities.length === 0) return null;

  const getDisplayText = (entity: RoCrateEntity): string => {
    const types = getEntityTypes(entity);
    const isSession =
      hasSessionType(types) ||
      (entity["@id"]?.startsWith("Sessions/") && entity["@id"]?.endsWith("/"));

    if (isSession && entity.name) {
      // Extract short session ID (e.g., "ETR008" from "Sessions/ETR008/")
      const shortId = getShortSessionId(entity["@id"]);
      // Decode any percent-encoded characters for display
      let decodedId: string;
      try {
        decodedId = decodeURIComponent(shortId);
      } catch {
        decodedId = shortId;
      }
      // Return "ID: Name" format
      return `${decodedId}: ${entity.name}`;
    }
    return entity.name || entity["@id"];
  };

  return (
    <ul className="sessions-list">
      {entities.map((entity) => (
        <li key={entity["@id"]}>
          <a href={`#${createAnchorId(entity["@id"])}`}>
            {getDisplayText(entity)}
          </a>
        </li>
      ))}
    </ul>
  );
};

/**
 * Renders an inline comma-separated list of links to other entities.
 */
const InlineLinkedEntityList: React.FC<{ entities: RoCrateEntity[] }> = ({
  entities
}) => {
  if (entities.length === 0) return null;
  return (
    <span>
      {entities.map((entity, index) => (
        <span key={entity["@id"]}>
          <a href={`#${createAnchorId(entity["@id"])}`}>
            {entity.name || entity["@id"]}
          </a>
          {index < entities.length - 1 && ", "}
        </span>
      ))}
    </span>
  );
};

// --- DRY helpers for property rendering ---

type PropertyTuple = [string, any, string?]; // [propertyKey, value, fieldType?]

interface BuildEntityPropertiesResult {
  labelOverrideMap: Map<string, string>;
  propertiesToRender: PropertyTuple[];
}

/**
 * Builds the label-override map and deduplicated property list for an entity.
 * Consolidates logic previously repeated in image, media, and default branches.
 * @param skipUnknown If true, properties with null/undefined values are omitted entirely
 */
/** Check if a value is effectively "unknown" (null, undefined, or Unknown placeholder) */
function isUnknownValue(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    return value === "Unknown" || value === "<Unknown>";
  }
  if (typeof value === "object" && value["@id"]) {
    return (
      value["@id"] === "tag:lameta/unknown" ||
      value.name === "Unknown" ||
      value.name === "<Unknown>"
    );
  }
  if (Array.isArray(value)) {
    // If all items in array are unknown, treat the whole value as unknown
    return value.length === 0 || value.every((item) => isUnknownValue(item));
  }
  return false;
}

function buildEntityProperties(
  entity: RoCrateEntity,
  fields: OrderEntry[],
  skipUnknown: boolean = false
): BuildEntityPropertiesResult {
  const labelOverrideMap = new Map<string, string>();
  fields.forEach((entry) => {
    if (typeof entry !== "string" && entry?.label && entry.property) {
      labelOverrideMap.set(entry.property, entry.label);
    }
  });

  const propertiesToRender: PropertyTuple[] = [];
  const usedLabels = new Set<string>();

  fields.forEach((entry) => {
    const key = typeof entry === "string" ? entry : entry.property;
    const fieldType = typeof entry === "string" ? undefined : entry.type;
    const label = labelOverrideMap.get(key) ?? formatPropertyLabel(key);
    const value = (entity as any)[key];

    const hasValue = value !== null && value !== undefined;
    const isUnknown = isUnknownValue(value);

    // Skip properties with no value or unknown values entirely if skipUnknown is true
    if (skipUnknown && isUnknown) {
      return;
    }

    // Skip duplicate labels when the current property has no value or is unknown
    if (usedLabels.has(label) && isUnknown) {
      return;
    }

    // If this property has a real value, remove any previous "Unknown" entry with the same label
    if (!isUnknown && usedLabels.has(label)) {
      const existingIndex = propertiesToRender.findIndex(
        ([existingKey, existingValue]) => {
          const existingLabel =
            labelOverrideMap.get(existingKey) ??
            formatPropertyLabel(existingKey);
          return existingLabel === label && isUnknownValue(existingValue);
        }
      );
      if (existingIndex !== -1) {
        propertiesToRender.splice(existingIndex, 1);
      }
    }

    propertiesToRender.push([key, value, fieldType]);
    usedLabels.add(label);
  });

  return { labelOverrideMap, propertiesToRender };
}

/**
 * Renders the property list for an entity.
 */
const EntityProperties: React.FC<{
  labelOverrideMap: Map<string, string>;
  propertiesToRender: PropertyTuple[];
  graph: RoCrateEntity[];
}> = ({ labelOverrideMap, propertiesToRender, graph }) => (
  <>
    {propertiesToRender.map(([key, value, fieldType]) => {
      let label = labelOverrideMap.get(key) ?? formatPropertyLabel(key);
      // Special case: pluralize 'Participant' if multiple participants
      if (
        (key === "ldac:participant" || label === "Participant") &&
        Array.isArray(value) &&
        value.length > 1
      ) {
        label = "Participants";
      }
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
  </>
);

// LDAC role properties that link persons to sessions
const LDAC_ROLE_PROPERTIES = [
  "ldac:speaker",
  "ldac:signer",
  "ldac:singer",
  "ldac:performer",
  "ldac:interviewer",
  "ldac:recorder",
  "ldac:researcher",
  "ldac:author",
  "ldac:compiler",
  "ldac:consultant",
  "ldac:translator",
  "ldac:transcriber",
  "ldac:annotator",
  "ldac:participant",
  "ldac:depositor"
];

// Mapping from LDAC role property to human-readable role name
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  "ldac:speaker": "speaker",
  "ldac:signer": "signer",
  "ldac:singer": "singer",
  "ldac:performer": "performer",
  "ldac:interviewer": "interviewer",
  "ldac:recorder": "recorder",
  "ldac:researcher": "researcher",
  "ldac:author": "author",
  "ldac:compiler": "compiler",
  "ldac:consultant": "consultant",
  "ldac:translator": "translator",
  "ldac:transcriber": "transcriber",
  "ldac:annotator": "annotator",
  "ldac:participant": "participant",
  "ldac:depositor": "depositor"
};

/**
 * Helper function to extract a short session ID for display.
 * E.g., "#session-ETR009" -> "ETR009", "Sessions/ETR009/" -> "ETR009"
 */
function getShortSessionId(sessionId: string): string {
  // Handle #session-XXX format
  if (sessionId.startsWith("#session-")) {
    return sessionId.replace("#session-", "");
  }
  // Handle Sessions/XXX/ format
  if (sessionId.startsWith("Sessions/") && sessionId.endsWith("/")) {
    return sessionId.replace("Sessions/", "").replace(/\/$/, "");
  }
  // Fallback: return the full ID
  return sessionId;
}

/**
 * Helper function to find the correct anchor ID for a session.
 * Sessions may be rendered with merged IDs (Sessions/ETR009/) but linked via
 * their original CollectionEvent IDs (#session-ETR009).
 * This function finds the corresponding session directory path for proper linking.
 */
function findSessionAnchorId(
  sessionId: string,
  graph: RoCrateEntity[]
): string {
  // For #session-XXX format, look for corresponding Sessions/XXX/ entity
  if (sessionId.startsWith("#session-")) {
    const shortId = sessionId.replace("#session-", "");
    const directoryPath = `Sessions/${shortId}/`;

    // Check if there's a directory Dataset that links to this session via "about"
    const directoryEntity = graph.find(
      (e) =>
        e["@id"] === directoryPath ||
        (e["@id"]?.startsWith("Sessions/") &&
          e["@id"]?.endsWith("/") &&
          (e.about?.["@id"] === sessionId ||
            (Array.isArray(e.hasPart) &&
              e.hasPart.some((p: any) => p["@id"] === sessionId))))
    );

    if (directoryEntity) {
      return createAnchorId(directoryEntity["@id"]);
    }
  }

  // Fallback to the original session ID anchor
  return createAnchorId(sessionId);
}

/**
 * Generates contribution list for a Person entity.
 * Scans the graph to find sessions where this person contributed,
 * and displays as "SessionID: Role1, Role2" format.
 */
const PersonContributions: React.FC<{
  personEntity: RoCrateEntity;
  graph: RoCrateEntity[];
}> = ({ personEntity, graph }) => {
  const personId = personEntity["@id"];

  // Find all sessions and their roles for this person
  // Map: sessionId -> list of role names
  const sessionToRoles = new Map<string, string[]>();

  graph.forEach((entity) => {
    const types = getEntityTypes(entity);
    if (!hasSessionType(types)) return;

    const sessionId = entity["@id"];

    // Check each LDAC role property
    LDAC_ROLE_PROPERTIES.forEach((roleProp) => {
      const roleValue = entity[roleProp];
      if (!roleValue) return;

      // Check if this person is referenced in this role
      const references = Array.isArray(roleValue) ? roleValue : [roleValue];
      const isReferenced = references.some((ref: any) => {
        if (typeof ref === "object" && ref["@id"]) {
          return ref["@id"] === personId;
        }
        return ref === personId;
      });

      if (isReferenced) {
        if (!sessionToRoles.has(sessionId)) {
          sessionToRoles.set(sessionId, []);
        }
        const roleName = ROLE_DISPLAY_NAMES[roleProp] || roleProp;
        // Capitalize first letter for display
        const displayRole =
          roleName.charAt(0).toUpperCase() + roleName.slice(1);
        if (!sessionToRoles.get(sessionId)!.includes(displayRole)) {
          sessionToRoles.get(sessionId)!.push(displayRole);
        }
      }
    });
  });

  if (sessionToRoles.size === 0) {
    return null;
  }

  // Group sessions by their role combination
  // e.g., sessions with [Speaker, Recorder] grouped together, sessions with just [Recorder] grouped together
  const roleComboToSessions = new Map<string, string[]>();
  sessionToRoles.forEach((roles, sessionId) => {
    // Sort roles for consistent key generation
    const sortedRoles = [...roles].sort();
    const key = sortedRoles.join("|");
    if (!roleComboToSessions.has(key)) {
      roleComboToSessions.set(key, []);
    }
    roleComboToSessions.get(key)!.push(sessionId);
  });

  // Sort each group's sessions by short ID
  roleComboToSessions.forEach((sessionIds) => {
    sessionIds.sort((a, b) => {
      const aShort = getShortSessionId(a);
      const bShort = getShortSessionId(b);
      return aShort.localeCompare(bShort);
    });
  });

  // Sort role combinations for consistent output (by first session ID in each group)
  const sortedRoleCombos = Array.from(roleComboToSessions.entries()).sort(
    ([, aSessionIds], [, bSessionIds]) => {
      const aFirst = getShortSessionId(aSessionIds[0]);
      const bFirst = getShortSessionId(bSessionIds[0]);
      return aFirst.localeCompare(bFirst);
    }
  );

  // Build contribution items: "Session1, Session2: Role1, Role2"
  const contributionItems = sortedRoleCombos.map(
    ([roleComboKey, sessionIds], idx) => {
      const roles = roleComboKey.split("|");
      const rolesText = roles.join(", ");

      // Build session links
      const sessionLinks = sessionIds.map((sessionId, sessionIdx) => {
        const shortId = getShortSessionId(sessionId);
        const anchorId = findSessionAnchorId(sessionId, graph);
        return (
          <React.Fragment key={sessionId}>
            <a href={`#${anchorId}`}>{shortId}</a>
            {sessionIdx < sessionIds.length - 1 && ", "}
          </React.Fragment>
        );
      });

      return (
        <React.Fragment key={roleComboKey}>
          {sessionLinks}: {rolesText}
          {idx < sortedRoleCombos.length - 1 && ". "}
        </React.Fragment>
      );
    }
  );

  return (
    <div className="property">
      <span className="property-name">Contributions:</span>
      <span className="property-value">{contributionItems}</span>
    </div>
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
  const types = getEntityTypes(entity);
  const anchorId = createAnchorId(id);
  // For merged session entities, also create anchor for original CollectionEvent ID
  const originalCollectionEventId = (entity as any)._originalCollectionEventId;
  const secondaryAnchorId = originalCollectionEventId
    ? createAnchorId(originalCollectionEventId)
    : null;

  const mediaType = EntityClassifier.getMediaType(entity);
  const isImage = mediaType === "image";
  const isVideo = mediaType === "video";
  const isAudio = mediaType === "audio";

  const entityClasses = `entity ${isChild ? "child" : ""} ${
    isImage ? "image-entity" : ""
  } ${isVideo || isAudio ? "media-entity" : ""}`.trim();

  // Secondary anchor for merged session entities - allows links using original
  // CollectionEvent IDs (#session-XXX) to navigate to merged entities (Sessions/XXX/).
  // Uses position:absolute with zero dimensions instead of display:none to ensure
  // browsers can scroll to this anchor target.
  const SecondaryAnchor = () =>
    secondaryAnchorId ? (
      <span
        id={secondaryAnchorId}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden"
        }}
      />
    ) : null;

  // Format display ID for the header - Person and Session entities get special treatment
  const getHeaderDisplayId = () => {
    // Helper to decode percent-encoded characters for display
    const decodeForDisplay = (str: string) => {
      try {
        return decodeURIComponent(str);
      } catch {
        return str;
      }
    };

    if (types.includes("Person") && id.startsWith("#")) {
      // Display as "Person: #Ilawi Amosa" (decoded for readability)
      return `Person: ${decodeForDisplay(id)}`;
    }
    // Convert "Sessions/ETR009" or "Sessions/ETR009/" to "Session: ETR009"
    if (id.startsWith("Sessions/")) {
      const match = id.match(/^Sessions\/([^\/]+)\/?$/);
      if (match) {
        return `Session: ${decodeForDisplay(match[1])}`;
      }
    }
    return getDisplayPath(id) || "Unknown ID";
  };

  const EntityHeader = () =>
    !isChild ? (
      <div className="entity-header">
        <div className="entity-id">{getHeaderDisplayId()}</div>
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
    const { labelOverrideMap, propertiesToRender } = buildEntityProperties(
      entity,
      fields
    );

    return (
      <div className={entityClasses} id={anchorId}>
        <SecondaryAnchor />
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
        <EntityProperties
          labelOverrideMap={labelOverrideMap}
          propertiesToRender={propertiesToRender}
          graph={graph}
        />
      </div>
    );
  }

  if (isVideo || isAudio) {
    const MediaTag = isVideo ? "video" : "audio";
    const displayPath = getDisplayPath(id);
    const fields = getFieldsForEntity(entity);
    const { labelOverrideMap, propertiesToRender } = buildEntityProperties(
      entity,
      fields
    );

    return (
      <div className={entityClasses} id={anchorId}>
        <SecondaryAnchor />
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
        <EntityProperties
          labelOverrideMap={labelOverrideMap}
          propertiesToRender={propertiesToRender}
          graph={graph}
        />
      </div>
    );
  }

  const fields = getFieldsForEntity(entity);
  // For Person and Session entities, skip showing unknown/missing values
  const isPerson = types.includes("Person");
  const isSession = hasSessionType(types);
  const { labelOverrideMap, propertiesToRender } = buildEntityProperties(
    entity,
    fields,
    isPerson || isSession // skipUnknown for Person and Session entities
  );

  // Special lists for root dataset - using direct entity type checking instead of filtering
  // Note: Description Documents and Other Documents are now shown as separate cards after the root
  const specialLists: { [key: string]: RoCrateEntity[] } = {};

  if (isRootDataset) {
    specialLists["Sessions"] = [];
    specialLists["People"] = [];

    // Build lists by checking each entity's type directly (no filtering)
    graph.forEach((e) => {
      const eTypes = getEntityTypes(e);

      if (hasSessionType(eTypes)) {
        specialLists["Sessions"].push(e);
      } else if (eTypes.includes("Person") && e.name !== "Unknown") {
        specialLists["People"].push(e);
      }
    });

    // Sort sessions alphabetically by display text (ID: Name format)
    // Using Intl.Collator with numeric: true for natural sorting of numbers in IDs
    const collator = new Intl.Collator([], {
      numeric: true,
      sensitivity: "base"
    });
    const getSessionDisplayText = (entity: RoCrateEntity): string => {
      const shortId = getShortSessionId(entity["@id"]);
      let decodedId: string;
      try {
        decodedId = decodeURIComponent(shortId);
      } catch {
        decodedId = shortId;
      }
      if (entity.name) {
        return `${decodedId}: ${entity.name}`;
      }
      return decodedId;
    };
    specialLists["Sessions"].sort((a, b) => {
      const displayA = getSessionDisplayText(a);
      const displayB = getSessionDisplayText(b);
      return collator.compare(displayA, displayB);
    });
  }

  const isClickable = EntityClassifier.isClickableFile(entity);
  const displayPath = isClickable ? getDisplayPath(id) : null;

  return (
    <div className={entityClasses} id={anchorId}>
      <SecondaryAnchor />
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
      {EntityClassifier.isLametaXml(entity) && (
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
          </a>
          {" software "}(<a href="https://github.com/onset/lameta">github</a>).
        </p>
      )}
      <EntityProperties
        labelOverrideMap={labelOverrideMap}
        propertiesToRender={propertiesToRender}
        graph={graph}
      />
      {types.includes("Person") && (
        <PersonContributions personEntity={entity} graph={graph} />
      )}
      {isRootDataset &&
        Object.entries(specialLists).map(
          ([title, entities]) =>
            entities.length > 0 && (
              <div key={title} className="property">
                <span className="property-name">{title}:</span>
                {title === "People" ? (
                  <span className="property-value">
                    <InlineLinkedEntityList entities={entities} />
                  </span>
                ) : (
                  <div className="property-value">
                    <LinkedEntityList entities={entities} />
                  </div>
                )}
              </div>
            )
        )}
    </div>
  );
};

const entityReferenceIncludes = (value: any, entityId: string): boolean => {
  if (!value) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => entityReferenceIncludes(item, entityId));
  }
  if (typeof value === "object" && value["@id"]) {
    return value["@id"] === entityId;
  }
  return false;
};

/**
 * Merge session directory Datasets with their CollectionEvent entities.
 * This creates merged entities that have the directory path as the display ID
 * but contain the CollectionEvent's metadata.
 */
function mergeSessionEntities(graph: RoCrateEntity[]): {
  mergedGraph: RoCrateEntity[];
  sessionDirectoryToCollectionEvent: Map<string, string>;
} {
  // Map from session directory ID (e.g., "Sessions/ETR009/") to CollectionEvent ID (e.g., "#session-ETR009")
  const sessionDirectoryToCollectionEvent = new Map<string, string>();
  // Map from CollectionEvent ID to session directory ID
  const collectionEventToSessionDirectory = new Map<string, string>();

  // First, find all session directory Datasets and their linked CollectionEvents
  // The link can be via:
  // 1. hasPart (older format): directory has hasPart pointing to #session-XXX
  // 2. about (newer format): directory has about pointing to #session-XXX
  graph.forEach((entity) => {
    const id = entity["@id"];
    const types = getEntityTypes(entity);

    // Check if this is a session directory Dataset (e.g., Sessions/ETR009/)
    if (
      types.includes("Dataset") &&
      id?.startsWith("Sessions/") &&
      id.endsWith("/") &&
      id !== "Sessions/"
    ) {
      // Look for a CollectionEvent via "about" property (preferred/newer format)
      if (entity.about) {
        const aboutId =
          typeof entity.about === "object" ? entity.about["@id"] : entity.about;
        if (aboutId?.startsWith("#session-")) {
          const collectionEvent = graph.find((e) => e["@id"] === aboutId);
          if (
            collectionEvent &&
            hasSessionType(getEntityTypes(collectionEvent))
          ) {
            sessionDirectoryToCollectionEvent.set(id, aboutId);
            collectionEventToSessionDirectory.set(aboutId, id);
            return; // Found via about, skip hasPart check
          }
        }
      }

      // Fallback: Look for a CollectionEvent in hasPart (older format)
      if (entity.hasPart && Array.isArray(entity.hasPart)) {
        entity.hasPart.forEach((part: any) => {
          const partId = typeof part === "object" ? part["@id"] : part;
          if (partId?.startsWith("#session-")) {
            const collectionEvent = graph.find((e) => e["@id"] === partId);
            if (
              collectionEvent &&
              hasSessionType(getEntityTypes(collectionEvent))
            ) {
              sessionDirectoryToCollectionEvent.set(id, partId);
              collectionEventToSessionDirectory.set(partId, id);
            }
          }
        });
      }
    }
  });

  // Create merged graph with combined session entities
  const mergedGraph: RoCrateEntity[] = [];
  const processedCollectionEvents = new Set<string>();

  graph.forEach((entity) => {
    const id = entity["@id"];
    const types = getEntityTypes(entity);

    // Skip session directory Datasets - they'll be merged with CollectionEvents
    if (sessionDirectoryToCollectionEvent.has(id)) {
      return;
    }

    // For CollectionEvents that have a corresponding session directory, create merged entity
    if (collectionEventToSessionDirectory.has(id)) {
      const directoryId = collectionEventToSessionDirectory.get(id)!;
      const directoryEntity = graph.find((e) => e["@id"] === directoryId);

      // Create merged entity with directory path as ID but CollectionEvent's metadata
      const mergedEntity: RoCrateEntity = {
        ...entity,
        "@id": directoryId, // Use directory path for display
        _originalCollectionEventId: id // Keep reference to original for internal links
      };

      // The directory Dataset contains the files via hasPart, so use its hasPart
      // (The CollectionEvent shouldn't have hasPart per LAM-103)
      if (directoryEntity?.hasPart) {
        const parts = Array.isArray(directoryEntity.hasPart)
          ? directoryEntity.hasPart
          : [directoryEntity.hasPart];
        // Filter out the CollectionEvent reference from hasPart
        const fileParts = parts.filter((part: any) => {
          const partId = typeof part === "object" ? part["@id"] : part;
          return !partId?.startsWith("#session-");
        });
        if (fileParts.length > 0) {
          mergedEntity.hasPart = fileParts;
        }
      }

      mergedGraph.push(mergedEntity);
      processedCollectionEvents.add(id);
      return;
    }

    // For all other entities, pass through unchanged
    mergedGraph.push(entity);
  });

  return { mergedGraph, sessionDirectoryToCollectionEvent };
}

/**
 * Pre-compute the hierarchical structure of entities
 */
function computeHierarchy(graph: RoCrateEntity[]) {
  // First, merge session directory Datasets with their CollectionEvents
  const { mergedGraph, sessionDirectoryToCollectionEvent } =
    mergeSessionEntities(graph);

  const rootEntities: RoCrateEntity[] = [];
  const childrenMap = new Map<string, RoCrateEntity[]>();

  // First pass: identify all root entities and build children map
  mergedGraph.forEach((entity) => {
    const entityId = entity["@id"];
    if (!entityId) return;

    // Skip ro-crate-metadata.json file
    if (entityId === "ro-crate-metadata.json") return;

    // Filter out entities by ID and type
    if (EntityClassifier.isFiltered(entity)) return;

    // Skip Language entities - they should link to Glottolog
    if (EntityClassifier.isLanguage(entity)) return;

    // Skip Place entities - they should only show their name in contentLocation
    if (EntityClassifier.isPlace(entity)) return;

    // Skip entities with "Unknown" names
    if (
      entity.name === "Unknown" ||
      entity.name === "<Unknown>" ||
      entityId === "tag:lameta/unknown"
    )
      return;

    // Check if this entity is a child of any other entity in the graph
    // Skip filtered entities when looking for parents - if a wrapper Dataset is filtered,
    // its children should become root entities
    const parentEntity = mergedGraph.find((parent) => {
      const parentId = parent["@id"];
      if (!parentId || parentId === entityId) return false;

      // Don't consider filtered entities as potential parents
      if (EntityClassifier.isFiltered(parent)) return false;

      const parentTypes = getEntityTypes(parent);

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
          const entityTypes = getEntityTypes(entity);
          const isPersonOrSession =
            entityTypes.includes("Person") ||
            hasSessionType(entityTypes) ||
            entityId.startsWith("People/") ||
            entityId.startsWith("Sessions/");
          if (parentId === "./" && isPersonOrSession) return false;
          return true;
        }
      }

      if (
        parentTypes.includes("Person") &&
        (entityReferenceIncludes((parent as any).image, entityId) ||
          entityReferenceIncludes((parent as any).subjectOf, entityId))
      ) {
        // Person media is linked via image/subjectOf rather than hasPart, so keep
        // the HTML hierarchy aligned with those relationships.
        return true;
      }

      // Fallback to path-based detection for entities not explicitly listed
      if (!entityId.startsWith(parentId)) return false;

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

    // Special case: Description docs, Other docs, and *.sprj entities should be children of root project entity
    // Support both path naming conventions (Description/DescriptionDocuments and OtherDocs/OtherDocuments)
    let finalParentEntity = parentEntity;
    if (
      entityId.startsWith("Description/") ||
      entityId.startsWith("DescriptionDocuments/") ||
      entityId.startsWith("OtherDocs/") ||
      entityId.startsWith("OtherDocuments/") ||
      entityId.endsWith(".sprj")
    ) {
      const rootProject = mergedGraph.find((e) => e["@id"] === "./");
      if (rootProject) finalParentEntity = rootProject;
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

  // Sort function for entity priority
  const getSortPriority = (entity: RoCrateEntity) => {
    const id = entity["@id"];
    const types = getEntityTypes(entity);

    // Root dataset first
    if (id === "./") return 0;
    if (
      id?.startsWith("Description/") ||
      id?.startsWith("DescriptionDocuments/")
    )
      return 1;
    if (id?.startsWith("OtherDocs/") || id?.startsWith("OtherDocuments/"))
      return 2;
    // Sessions - either by type or by merged directory path
    if (
      hasSessionType(types) ||
      (id?.startsWith("Sessions/") && id.endsWith("/"))
    )
      return 3;
    if (types.includes("Person")) return 4;
    return 5;
  };

  // Sort root entities
  rootEntities.sort((a, b) => {
    const priorityA = getSortPriority(a);
    const priorityB = getSortPriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a["@id"].localeCompare(b["@id"]);
  });

  // Sort children within each parent
  const getChildSortPriority = (entity: RoCrateEntity) => {
    const id = entity["@id"];
    if (
      id?.startsWith("Description/") ||
      id?.startsWith("DescriptionDocuments/")
    )
      return 0;
    if (id?.startsWith("OtherDocs/") || id?.startsWith("OtherDocuments/"))
      return 1;
    return 2;
  };

  childrenMap.forEach((children) => {
    children.sort((a, b) => {
      const priorityA = getChildSortPriority(a);
      const priorityB = getChildSortPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
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
