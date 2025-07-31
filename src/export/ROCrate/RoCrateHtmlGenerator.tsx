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
  "publisher"
]);

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
  return spaceSeparated.toLowerCase();
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
const PropertyValue: React.FC<{ value: any; graph: RoCrateEntity[] }> = ({
  value,
  graph
}) => {
  if (value === null || value === undefined) {
    return <>{String(value)}</>;
  }

  if (Array.isArray(value)) {
    return (
      <>
        {value.map((item, index) => (
          <React.Fragment key={index}>
            <PropertyValue value={item} graph={graph} />
            {index < value.length - 1 && ", "}
          </React.Fragment>
        ))}
      </>
    );
  }

  const renderLink = (id: string, defaultName: string) => {
    const referencedEntity = graph.find((entity) => entity["@id"] === id);
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

  const EntityHeader = () => (
    <div className="entity-header">
      <div className="entity-id">{id || "Unknown ID"}</div>
    </div>
  );
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
    People: graph.filter(
      (e) => Array.isArray(e["@type"]) && e["@type"].includes("Person")
    ),
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
      {properties.map(([key, value]) => (
        <div key={key} className="property">
          <span className="property-name">{formatPropertyLabel(key)}:</span>
          <span className="property-value">
            <PropertyValue value={value} graph={graph} />
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
const HierarchicalEntityDisplay: React.FC<{
  entity: RoCrateEntity;
  graph: RoCrateEntity[];
  processedIds: Set<string>;
  onProcess: (id: string) => void;
  isRootDataset?: boolean;
}> = ({ entity, graph, processedIds, onProcess, isRootDataset = false }) => {
  const entityId = entity["@id"];
  if (processedIds.has(entityId)) return null;
  onProcess(entityId);

  const children = graph.filter((child) => {
    const childId = child["@id"];
    if (!childId || childId === entityId || processedIds.has(childId))
      return false;

    if (childId.startsWith(entityId)) {
      const remainder = childId.substring(entityId.length);
      if (entityId.endsWith("/"))
        return remainder.length > 0 && !remainder.includes("/");
      return remainder.startsWith("/");
    }
    return false;
  });

  return (
    <>
      <Entity entity={entity} graph={graph} isRootDataset={isRootDataset} />
      {children.length > 0 && (
        <div className="entity-children-container">
          {children.map((child) => (
            <HierarchicalEntityDisplay
              key={child["@id"]}
              entity={child}
              graph={graph}
              processedIds={processedIds}
              onProcess={onProcess}
            />
          ))}
        </div>
      )}
    </>
  );
};

/**
 * The root component for the entire HTML page.
 */
const RoCratePreview: React.FC<{ roCrateData: RoCrateData }> = ({
  roCrateData
}) => {
  const graph = roCrateData["@graph"] || [];
  const rootDataset = graph.find((item) => item["@id"] === "./");

  const rootEntities = graph
    .filter((entity) => {
      const entityId = entity["@id"];
      if (!entityId) return false;
      const isChild = graph.some((parent) => {
        const parentId = parent["@id"];
        if (
          !parentId ||
          parentId === entityId ||
          !entityId.startsWith(parentId)
        )
          return false;
        const remainder = entityId.substring(parentId.length);
        if (parentId.endsWith("/"))
          return remainder.length > 0 && !remainder.includes("/");
        return remainder.startsWith("/");
      });
      return !isChild;
    })
    .sort((a, b) => a["@id"].localeCompare(b["@id"]));

  const processedIds = new Set<string>();
  const onProcess = (id: string) => processedIds.add(id);

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
              ro-crate
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
            <HierarchicalEntityDisplay
              key={entity["@id"]}
              entity={entity}
              graph={graph}
              processedIds={processedIds}
              onProcess={onProcess}
              isRootDataset={entity["@id"] === "./"}
            />
          ))}
          {/* Render any remaining entities not caught by the hierarchy logic as a fallback */}
          {graph
            .filter((entity) => !processedIds.has(entity["@id"]))
            .map((entity) => (
              <Entity
                key={entity["@id"]}
                entity={entity}
                graph={graph}
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
