import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

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

// Fields to exclude from the property display
const EXCLUDED_FIELDS = new Set([
  "name",
  "conformsTo",
  "datePublished",
  "dateCreated",
  "dateModified",
  "contentSize",
  "publisher",
  "hasPart",
  "pcdm:hasMember"
]);
// Entities that don't add any value to the human just wanting to know "what's in this collection"
const FILTERED_ENTITY_IDS = [
  "#collection-license",
  "#CustomGenreTerms",
  "ldac:DataReuseLicense",
  "ldac:OpenAccess",
  "ldac:AuthorizedAccess"
];

// Creates a URL-safe anchor ID from an entity ID
const createAnchorId = (id: string): string => {
  return id ? `entity_${id.replace(/[^a-zA-Z0-9]/g, "_")}` : "";
};

// Transforms property labels for display
function formatPropertyLabel(propertyName: string): string {
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
}> = ({ value, graph, propertyName }) => {
  if (value === null || value === undefined) {
    return <>{String(value)}</>;
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
            />
            {index < value.length - 1 && ", "}
          </React.Fragment>
        ))}
      </>
    );
  }

  const renderLink = (id: string, defaultName: string) => {
    const referencedEntity = graph.find((entity) => entity["@id"] === id);

    // Special handling for "Unknown" - don't link, just show text
    if (referencedEntity?.name === "Unknown" || defaultName === "Unknown") {
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
  if (String(value) === "Unknown") {
    return <>Unknown</>;
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
        <div className="entity-id">{id || "Unknown ID"}</div>
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
    return (
      <div className={entityClasses} id={anchorId}>
        <EntityHeader />
        <EntityTypes />
        {name && (
          <h3 style={{ margin: "10px 0", color: "var(--color-text)" }}>
            {name}
          </h3>
        )}
        <a href={id}>
          <img
            src={id}
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
          Image could not be loaded: {id}
        </div>
      </div>
    );
  }

  if (isVideo || isAudio) {
    const MediaTag = isVideo ? "video" : "audio";
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
          <source src={id} type={entity.encodingFormat || ""} />
          Your browser does not support the {MediaTag} tag.
        </MediaTag>
      </div>
    );
  }

  // Generic Entity View
  const properties = Object.entries(entity).filter(
    ([key]) => !key.startsWith("@") && !EXCLUDED_FIELDS.has(key)
  );
  const specialLists = {
    Sessions: graph.filter(
      (e) =>
        e["@id"]?.startsWith("Sessions/") &&
        Array.isArray(e["@type"]) &&
        e["@type"].includes("Event")
    ),
    People: graph.filter((e) => {
      const types = Array.isArray(e["@type"]) ? e["@type"] : [e["@type"]];
      return types.includes("Person") && e.name !== "Unknown";
    }),
    "Description Documents": graph.filter((e) =>
      e["@id"]?.startsWith("Description/")
    ),
    "Other Documents": graph.filter((e) => e["@id"]?.startsWith("OtherDocs/"))
  };

  return (
    <div className={entityClasses} id={anchorId}>
      <EntityHeader />
      <EntityTypes />
      {name && (
        <h3 style={{ margin: "10px 0", color: "var(--color-text)" }}>{name}</h3>
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
      {properties
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => (
          <div key={key} className="property">
            <span className="property-name">{formatPropertyLabel(key)}:</span>
            <span className="property-value">
              <PropertyValue value={value} graph={graph} propertyName={key} />
            </span>
          </div>
        ))}
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
    if (entity.name === "Unknown") {
      return;
    }

    // Check if this entity is a child of any other entity in the graph
    const parentEntity = graph.find((parent) => {
      const parentId = parent["@id"];
      if (
        !parentId ||
        parentId === entityId ||
        !entityId.startsWith(parentId)
      ) {
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
