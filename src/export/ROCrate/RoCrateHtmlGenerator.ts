// Fields to exclude from the property display in HTML
const EXCLUDED_FIELDS = new Set([
  "name", // Handled separately in the header
  "conformsTo",
  "datePublished",
  "dateCreated",
  "dateModified",
  "contentSize"
]);

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
    .entity { 
      border: 1px solid var(--color-border); 
      margin: 20px 0; 
      padding: 15px; 
      border-radius: 5px; 
      background-color: var(--color-white); 
      position: relative;
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
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${rootDataset?.name}</h1>
    <It>This dataset was created by <a href="https://github.com/onset/lameta">lameta</a>. This page is a simplified, human-readable view of the <a href="https://www.researchobject.org/ro-crate/" target="_blank">ro-crate</a> metadata found in the accompanying ro-crate-metadata.json file, which conforms to the <a href="https://w3id.org/ldac/profile" target="_blank">LDAC Profile</a>. The purpose of this pages is to give you a general idea of what is in the dataset.</p>
  </div>

  <div class="main-content">
    ${generateEntityHtml(rootDataset)}
    
    ${generateSessionsSection(graph)}
    
    <h2>All Entities</h2>
    ${graph.map((entity: any) => generateEntityHtml(entity)).join("")}
  </div>

</body>
</html>`;
}

function generateEntityHtml(entity: any): string {
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
      const displayValue =
        typeof value === "object"
          ? JSON.stringify(value, null, 2)
          : String(value);
      return `
        <div class="property">
          <span class="property-name">${key}:</span>
          <span class="property-value">${displayValue}</span>
        </div>
      `;
    })
    .join("");

  return `
    <div class="entity" id="entity_${anchorId}">
      <div class="entity-header">
        <div class="entity-id">${entity["@id"] || "Unknown ID"}</div>
        <div class="entity-types">${typeHtml}</div>
      </div>
      ${properties}
    </div>
  `;
}

function generateSessionsSection(graph: any[]): string {
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
      // Create anchor link to the entity in the "All Entities" section
      const anchorId = sessionId.replace(/[^a-zA-Z0-9]/g, "_");
      return `<li><a href="#entity_${anchorId}">${sessionName}</a></li>`;
    })
    .join("");

  return `
    <div class="sessions-section">
      <h2>Sessions</h2>
      <ul class="sessions-list">
        ${sessionLinks}
      </ul>
    </div>
  `;
}
