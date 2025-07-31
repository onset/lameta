// Fields to exclude from the property display in HTML
const EXCLUDED_FIELDS = new Set([
  "name", // Handled separately in the header
  "conformsTo",
  "datePublished",
  "dateCreated",
  "dateModified",
  "contentSize",
  "publisher" // Hide publisher field
]);

// Helper function to format property values with hyperlinks for object references
function formatPropertyValue(value: any, graph: any[]): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const formattedItems = value.map((item) => {
      if (typeof item === "object" && item["@id"]) {
        // Find the referenced entity to get its name
        const referencedEntity = graph.find(
          (entity: any) => entity["@id"] === item["@id"]
        );
        const displayName = referencedEntity?.name || item["@id"];
        const anchorId = item["@id"].replace(/[^a-zA-Z0-9]/g, "_");
        return `<a href="#entity_${anchorId}">${displayName}</a>`;
      }
      return typeof item === "object"
        ? JSON.stringify(item, null, 2)
        : String(item);
    });
    return formattedItems.join(", ");
  }

  // Handle single object with @id
  if (typeof value === "object" && value["@id"]) {
    const referencedEntity = graph.find(
      (entity: any) => entity["@id"] === value["@id"]
    );
    const displayName = referencedEntity?.name || value["@id"];
    const anchorId = value["@id"].replace(/[^a-zA-Z0-9]/g, "_");
    return `<a href="#entity_${anchorId}">${displayName}</a>`;
  }

  // Handle string references that start with #
  if (typeof value === "string" && value.startsWith("#")) {
    // Clean up malformed references like "#language_#language_etr__Edolo"
    let cleanReference = value;
    if (value.includes("#language_#language_")) {
      cleanReference = value.replace("#language_#language_", "#language_");
    }

    const referencedEntity = graph.find(
      (entity: any) =>
        entity["@id"] === cleanReference || entity["@id"] === value
    );
    if (referencedEntity) {
      const displayName = referencedEntity.name || cleanReference;
      const anchorId = (referencedEntity["@id"] || cleanReference).replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );
      return `<a href="#entity_${anchorId}">${displayName}</a>`;
    }

    // If no entity found, try to make a nicer display name from the reference
    if (cleanReference.startsWith("#language_")) {
      const languageCode = cleanReference
        .replace("#language_", "")
        .replace(/__/g, " ")
        .replace(/_/g, " ");
      const anchorId = cleanReference.replace(/[^a-zA-Z0-9]/g, "_");
      return `<a href="#entity_${anchorId}">${languageCode}</a>`;
    }

    // For other references like #Huya, just clean up the display
    const displayName = cleanReference.replace("#", "");
    const anchorId = cleanReference.replace(/[^a-zA-Z0-9]/g, "_");
    return `<a href="#entity_${anchorId}">${displayName}</a>`;
  }

  // Handle other objects or primitive values
  return typeof value === "object"
    ? JSON.stringify(value, null, 2)
    : String(value);
}

export function generateRoCrateHtml(roCrateData: any): string {
  const graph = roCrateData["@graph"] || [];
  const rootDataset = graph.find((item: any) => item["@id"] === "./");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RO-Crate Preview - ${rootDataset?.name || "Research Object"}</title>
  <style>
    :root {
      --color-primary: #75b01c;
      --color-primary-light: #cff09f;
      --color-background: #e9ffc8;
      --color-white: white;
      --color-text: #333;
      --color-text-muted: #666;
      --color-border: #ddd;
      --color-entity-bg: #f9f9f9;
      --color-json-bg: #lightyellow;
    }
    body { 
      font-family: Arial, sans-serif; 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 20px; 
      line-height: 1.6; 
      background-color: var(--color-background);
    }
    .header { 
    /*   border-bottom: 2px solid var(--color-primary); */
  /*    padding-bottom: 20px; 
      margin-bottom: 30px; */
    }
      .main-content{
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
    .entity { 
      border: 1px solid var(--color-border); 
      
      
      border-radius: 5px; 
      background-color: var(--color-white); 
      position: relative;
      
    }
    .entity.child {
      /* Hide the entity header (green ID bar) for child entities */
    }
    .entity.child .entity-header {
      display: none;
    }
    .entity:target {
      animation: targetHighlight 1s ease-in-out forwards;
    }
    @keyframes targetHighlight {
      0% {
        background-color: var(--color-white);
      }
      50% {
        background-color: #fff581ff;
      }
      100% {
        background-color: var(--color-white);
      }
    }
    .entity-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .entity-id { 
      font-weight: bold; 
      background-color: var(--color-primary); 
      color: var(--color-white); 
      padding: 2px 8px; 
      border-radius: 3px; 
      font-size: 0.9em; 
      display: inline-block;
      flex: 1;
    }
    .entity-types {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-left: 10px;
    }
    .entity-types.bottom-right {
      position: absolute;
      bottom: 10px;
      right: 10px;
      margin-left: 0;
    }
    .entity-type { 
      background-color: transparent; 
      color: var(--color-primary); 
      border: 1px solid var(--color-primary);
      padding: 2px 8px; 
      border-radius: 3px; 
      font-size: 0.9em; 
    }
    .property { 
      margin: 8px 0; 
    }
    .property-name { 
      font-weight: bold; 
      color: var(--color-text); 
    }
    .property-value { 
      color: var(--color-text-muted); 
      margin-left: 10px; 
    }
    .json-toggle { 
      background-color: var(--color-primary); 
      color: var(--color-white); 
      border: none; 
      padding: 10px 20px; 
      border-radius: 5px; 
      cursor: pointer; 
      margin: 20px 0; 
    }
    .json-content { 
      display: none; 
      background-color: var(--color-json-bg); 
      border: 1px solid var(--color-border); 
      padding: 15px; 
      border-radius: 5px; 
      overflow-x: auto; 
    }
    pre { 
      margin: 0; 
      white-space: pre-wrap; 
    }
    .sessions-section {
      background-color: var(--color-white);
      border: 1px solid var(--color-border);
      border-radius: 5px;
      padding: 20px;
      margin: 20px 0;
    }
    .sessions-list {
      list-style-type: disc;
      margin-left: 20px;
    }
    .sessions-list li {
      margin: 8px 0;
    }
    .sessions-list a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .sessions-list a:hover {
      text-decoration: underline;
    }
    .image-thumbnail {
      max-width: 200px;
      max-height: 200px;
      border: 1px solid var(--color-border);
      border-radius: 5px;
      margin: 10px 0;
      display: block;
    }
    .media-player {
      max-width: 400px;
      width: 100%;
      border: 1px solid var(--color-border);
      border-radius: 5px;
      margin: 10px 0;
      display: block;
    }
    .image-entity, .media-entity {
      text-align: left;
      display: inline-block;
      width: auto;
      min-width: 200px;
      max-width: 300px;
      vertical-align: top;
      margin: 5px;
    }
    .entity-children-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: flex-start;
      padding-right: 30px;
      padding-left: 30px;
    }
    .entity-children-container .entity {
      flex: 0 0 auto;
      width: auto;
      box-sizing: border-box;
      min-height: 250px; /* makes it more uniform */
      min-width: 250px; /* makes it more uniform */
    }
    .entity {
      box-sizing: border-box;
      padding: 20px;
    }
    .property-value a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .property-value a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${rootDataset?.name}</h1>
    <p>This dataset was created by <a href="https://github.com/onset/lameta">lameta</a>. This page is a simplified, human-readable view of the <a href="https://www.researchobject.org/ro-crate/" target="_blank">ro-crate</a> metadata found in the accompanying <a href="ro-crate-metadata.json">ro-crate-metadata.json</a> file, which conforms to the <a href="https://w3id.org/ldac/profile" target="_blank">LDAC Profile</a>. The purpose of this page is to give you a general idea of what is in the dataset.</p>
  </div>

  <div class="main-content">
    ${generateEntityHtml(rootDataset, graph, true)}
    
    <h2>All Entities</h2>
    ${generateHierarchicalEntitiesHtml(graph)}
  </div>

</body>
</html>`;
}

function generateEntityHtml(
  entity: any,
  graph: any[],
  isRootDataset = false
): string {
  if (!entity) return "";

  const types = Array.isArray(entity["@type"])
    ? entity["@type"]
    : [entity["@type"]];
  const typeHtml = types
    .filter(Boolean)
    .map((type: string) => `<span class="entity-type">${type}</span>`)
    .join("");

  // Create anchor ID for linking
  const anchorId = entity["@id"]
    ? entity["@id"].replace(/[^a-zA-Z0-9]/g, "_")
    : "unknown";

  // Check if this is an image entity
  const isImage = types.some(
    (type: string) =>
      type === "ImageObject" ||
      (entity.encodingFormat && entity.encodingFormat.startsWith("image/")) ||
      (entity["@id"] &&
        /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(entity["@id"]))
  );

  // Check if this is a video entity
  const isVideo = types.some(
    (type: string) =>
      type === "VideoObject" ||
      (entity.encodingFormat && entity.encodingFormat.startsWith("video/")) ||
      (entity["@id"] &&
        /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/i.test(entity["@id"]))
  );

  // Check if this is an audio entity
  const isAudio = types.some(
    (type: string) =>
      type === "AudioObject" ||
      (entity.encodingFormat && entity.encodingFormat.startsWith("audio/")) ||
      (entity["@id"] &&
        /\.(mp3|wav|ogg|aac|flac|m4a|wma)$/i.test(entity["@id"]))
  );

  if (isImage) {
    // For images, show only ID and thumbnail
    const imageUrl = entity["@id"];
    return `
      <div class="entity image-entity" id="entity_${anchorId}">
        <div class="entity-header">
          <div class="entity-id">${entity["@id"] || "Unknown ID"}</div>
          <div class="entity-types">${typeHtml}</div>
        </div>
        ${
          entity.name
            ? `<h3 style="margin: 10px 0; color: var(--color-text);">${entity.name}</h3>`
            : ""
        }
        <img src="${imageUrl}" alt="Image: ${
      entity.name || entity["@id"]
    }" class="image-thumbnail" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div style="display:none; color: var(--color-text-muted); font-style: italic;">
          Image could not be loaded: ${imageUrl}
        </div>
      </div>
    `;
  }

  if (isVideo) {
    // For videos, show ID and video player
    const videoUrl = entity["@id"];
    return `
      <div class="entity media-entity" id="entity_${anchorId}">
        <div class="entity-header">
          <div class="entity-id">${entity["@id"] || "Unknown ID"}</div>
          <div class="entity-types">${typeHtml}</div>
        </div>
        ${
          entity.name
            ? `<h3 style="margin: 10px 0; color: var(--color-text);">${entity.name}</h3>`
            : ""
        }
        <video controls class="media-player">
          <source src="${videoUrl}" type="${entity.encodingFormat || ""}">
          Your browser does not support the video tag.
        </video>
      </div>
    `;
  }

  if (isAudio) {
    // For audio, show ID and audio player
    const audioUrl = entity["@id"];
    return `
      <div class="entity media-entity" id="entity_${anchorId}">
        <div class="entity-header">
          <div class="entity-id">${entity["@id"] || "Unknown ID"}</div>
          <div class="entity-types">${typeHtml}</div>
        </div>
        ${
          entity.name
            ? `<h3 style="margin: 10px 0; color: var(--color-text);">${entity.name}</h3>`
            : ""
        }
        <audio controls class="media-player">
          <source src="${audioUrl}" type="${entity.encodingFormat || ""}">
          Your browser does not support the audio tag.
        </audio>
      </div>
    `;
  }

  // For non-image entities, show all properties as before
  const properties = Object.entries(entity)
    .filter(([key]) => !key.startsWith("@") && !EXCLUDED_FIELDS.has(key))
    .map(([key, value]) => {
      const displayValue = formatPropertyValue(value, graph);
      return `
        <div class="property">
          <span class="property-name">${key}:</span>
          <span class="property-value">${displayValue}</span>
        </div>
      `;
    })
    .join("");

  // Add sessions and people sections for root dataset
  let specialSections = "";
  if (isRootDataset) {
    const sessionsSection = generateSessionsList(graph);
    const peopleSection = generatePeopleList(graph);
    const descriptionSection = generateDescriptionDocumentsList(graph);
    const otherDocsSection = generateOtherDocumentsList(graph);

    if (sessionsSection) {
      specialSections += `
        <div class="property">
          <span class="property-name">Sessions:</span>
          <div class="property-value">${sessionsSection}</div>
        </div>
      `;
    }

    if (peopleSection) {
      specialSections += `
        <div class="property">
          <span class="property-name">People:</span>
          <div class="property-value">${peopleSection}</div>
        </div>
      `;
    }

    if (descriptionSection) {
      specialSections += `
        <div class="property">
          <span class="property-name">Description Documents:</span>
          <div class="property-value">${descriptionSection}</div>
        </div>
      `;
    }

    if (otherDocsSection) {
      specialSections += `
        <div class="property">
          <span class="property-name">Other Documents:</span>
          <div class="property-value">${otherDocsSection}</div>
        </div>
      `;
    }
  }

  return `
    <div class="entity" id="entity_${anchorId}">
      <div class="entity-header">
        <div class="entity-id">${entity["@id"] || "Unknown ID"}</div>
        <div class="entity-types">${typeHtml}</div>
      </div>
      ${
        entity.name
          ? `<h3 style="margin: 10px 0; color: var(--color-text);">${entity.name}</h3>`
          : ""
      }
      ${properties}
      ${specialSections}
    </div>
  `;
}

function generateSessionsList(graph: any[]): string {
  // Find session entities - they have @id starting with "Sessions/" and @type includes "Event"
  const sessions = graph.filter((entity: any) => {
    const id = entity["@id"];
    const types = Array.isArray(entity["@type"])
      ? entity["@type"]
      : [entity["@type"]];
    return id && id.startsWith("Sessions/") && types.includes("Event");
  });

  if (sessions.length === 0) {
    return "";
  }

  const sessionLinks = sessions
    .map((session: any) => {
      const sessionId = session["@id"];
      const sessionName = session.name || sessionId;
      const anchorId = sessionId.replace(/[^a-zA-Z0-9]/g, "_");
      return `<li><a href="#entity_${anchorId}">${sessionName}</a></li>`;
    })
    .join("");

  return `<ul class="sessions-list">${sessionLinks}</ul>`;
}

function generatePeopleList(graph: any[]): string {
  // Find person entities - they have @type includes "Person"
  const people = graph.filter((entity: any) => {
    const types = Array.isArray(entity["@type"])
      ? entity["@type"]
      : [entity["@type"]];
    return types.includes("Person");
  });

  if (people.length === 0) {
    return "";
  }

  const peopleWithParts = people
    .map((person: any) => {
      const personId = person["@id"];
      const personName = person.name || personId;
      const personAnchorId = personId.replace(/[^a-zA-Z0-9]/g, "_");
      return `<li><a href="#entity_${personAnchorId}">${personName}</a></li>`;
    })
    .join("");

  return `<ul class="sessions-list">${peopleWithParts}</ul>`;
}

function generateDescriptionDocumentsList(graph: any[]): string {
  // Find description document entities - they have @id starting with "Description/"
  const descriptionDocs = graph.filter((entity: any) => {
    const id = entity["@id"];
    return id && id.startsWith("Description/");
  });

  if (descriptionDocs.length === 0) {
    return "";
  }

  const docLinks = descriptionDocs
    .map((doc: any) => {
      const docId = doc["@id"];
      const docName = doc.name || docId;
      const anchorId = docId.replace(/[^a-zA-Z0-9]/g, "_");
      return `<li><a href="#entity_${anchorId}">${docName}</a></li>`;
    })
    .join("");

  return `<ul class="sessions-list">${docLinks}</ul>`;
}

function generateOtherDocumentsList(graph: any[]): string {
  // Find other document entities - they have @id starting with "OtherDocs/"
  const otherDocs = graph.filter((entity: any) => {
    const id = entity["@id"];
    return id && id.startsWith("OtherDocs/");
  });

  if (otherDocs.length === 0) {
    return "";
  }

  const docLinks = otherDocs
    .map((doc: any) => {
      const docId = doc["@id"];
      const docName = doc.name || docId;
      const anchorId = docId.replace(/[^a-zA-Z0-9]/g, "_");
      return `<li><a href="#entity_${anchorId}">${docName}</a></li>`;
    })
    .join("");

  return `<ul class="sessions-list">${docLinks}</ul>`;
}

function generateHierarchicalEntitiesHtml(graph: any[]): string {
  console.log("=== Starting generateHierarchicalEntitiesHtml ===");
  console.log(`Total entities in graph: ${graph.length}`);

  // Log all entity IDs for debugging
  console.log("All entity IDs:");
  graph.forEach((entity, index) => {
    console.log(`  ${index}: "${entity["@id"]}"`);
  });

  const processedEntities = new Set<string>();

  // Recursive function to generate entity HTML with proper nesting
  function generateEntityWithChildren(entity: any, depth: number = 0): string {
    const entityId = entity["@id"];
    console.log(`\n--- Processing entity at depth ${depth}: "${entityId}" ---`);

    if (processedEntities.has(entityId)) {
      console.log(`  Already processed, skipping`);
      return "";
    }

    processedEntities.add(entityId);
    console.log(`  Added to processed set`);

    // Generate the entity HTML
    let entityHtml = generateEntityHtml(entity, graph);

    // Apply child styling based on depth
    if (depth > 0) {
      console.log(`  Applying child styling at depth ${depth}`);
      // Add 'child' class for child entities - no need for manual indentation
      entityHtml = entityHtml.replace(
        /<div class="entity([^"]*)"([^>]*)>/,
        `<div class="entity$1 child"$2>`
      );

      // Move entity types to bottom right for child entities
      entityHtml = entityHtml.replace(
        /<div class="entity-types"([^>]*)>/,
        `<div class="entity-types bottom-right"$1>`
      );
    }

    let html = entityHtml;

    // Find and add child entities (those whose IDs start with this entity's ID)
    if (entityId) {
      console.log(`  Looking for children of: "${entityId}"`);
      const children = graph.filter((child: any) => {
        const childId = child["@id"];
        if (!childId || childId === entityId || processedEntities.has(childId))
          return false;

        // Check if child ID starts with parent ID and is a direct child
        if (childId.startsWith(entityId)) {
          const remainder = childId.substring(entityId.length);
          let isDirectChild = false;
          if (entityId.endsWith("/") || entityId.endsWith("\\")) {
            // Parent is a folder, so remainder should be just the filename/subfolder
            isDirectChild =
              remainder.length > 0 &&
              !remainder.includes("/") &&
              !remainder.includes("\\");
          } else {
            // Parent is not a folder, so remainder should start with path separator
            isDirectChild =
              remainder.startsWith("/") || remainder.startsWith("\\");
          }
          if (isDirectChild) {
            console.log(
              `    Found child: "${childId}" (remainder: "${remainder}")`
            );
          }
          return isDirectChild;
        }
        return false;
      });

      console.log(`  Found ${children.length} children`);

      // If there are children, wrap them in a container for proper layout
      if (children.length > 0) {
        const childrenHtml = children
          .map((child: any) => generateEntityWithChildren(child, depth + 1))
          .filter(Boolean)
          .join("");

        html += `<div class="entity-children-container">${childrenHtml}</div>`;
      }
    }

    return html;
  }

  // Find root entities (those that aren't children of any other entity)
  console.log("\n=== Finding root entities ===");
  const rootEntities = graph.filter((entity: any) => {
    const entityId = entity["@id"];
    if (!entityId) return false;

    console.log(`\nChecking if "${entityId}" is a root entity:`);

    // Check if this entity is a child of any other entity
    const isChild = graph.some((potentialParent: any) => {
      const parentId = potentialParent["@id"];
      if (!parentId || parentId === entityId) return false;

      console.log(`  Checking against potential parent: "${parentId}"`);

      // If this entity's ID starts with the parent's ID and has more path segments,
      // then it's a child
      if (entityId.startsWith(parentId) && entityId !== parentId) {
        const remainder = entityId.substring(parentId.length);
        console.log(`    Entity starts with parent. Remainder: "${remainder}"`);
        // For folder parents (ending with /), the remainder should not start with /
        // For non-folder parents, the remainder should start with / or \
        let isDirectChild = false;
        if (parentId.endsWith("/") || parentId.endsWith("\\")) {
          // Parent is a folder, so remainder should be just the filename/subfolder
          isDirectChild =
            remainder.length > 0 &&
            !remainder.includes("/") &&
            !remainder.includes("\\");
        } else {
          // Parent is not a folder, so remainder should start with path separator
          isDirectChild =
            remainder.startsWith("/") || remainder.startsWith("\\");
        }
        console.log(
          `    Is direct child? ${isDirectChild} (parent ends with /: ${parentId.endsWith(
            "/"
          )}, remainder: "${remainder}")`
        );
        if (isDirectChild) {
          console.log(
            `  ✓ "${entityId}" is child of "${parentId}" (remainder: "${remainder}")`
          );
          return true;
        }
      }
      return false;
    });

    if (!isChild) {
      console.log(`  ✓ Root entity: "${entityId}"`);
    }
    return !isChild;
  });

  console.log(`Found ${rootEntities.length} root entities`);

  // Sort root entities to ensure folders come before their files
  rootEntities.sort((a, b) => {
    const aId = a["@id"];
    const bId = b["@id"];
    // Folders (ending with /) should come first
    if (aId.endsWith("/") && !bId.endsWith("/")) return -1;
    if (!aId.endsWith("/") && bId.endsWith("/")) return 1;
    return aId.localeCompare(bId);
  });

  // Generate HTML for root entities and their hierarchies
  console.log("\n=== Generating HTML for root entities ===");
  const entitiesHtml = rootEntities
    .map((entity: any) => generateEntityWithChildren(entity, 0))
    .filter(Boolean)
    .join("");

  // Add any remaining entities that weren't processed (shouldn't happen, but safety net)
  const remainingEntities = graph
    .filter((entity: any) => !processedEntities.has(entity["@id"]))
    .map((entity: any) => {
      console.log(`Adding remaining entity: "${entity["@id"]}"`);
      return generateEntityHtml(entity, graph);
    })
    .join("");

  console.log(
    `Remaining unprocessed entities: ${
      graph.filter((entity: any) => !processedEntities.has(entity["@id"]))
        .length
    }`
  );
  console.log("=== Finished generateHierarchicalEntitiesHtml ===\n");

  return entitiesHtml + remainingEntities;
}
