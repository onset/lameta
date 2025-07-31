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
      border-bottom: 2px solid var(--color-primary); 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
    }
    .entity { 
      border: 1px solid var(--color-border); 
      margin: 20px 0; 
      padding: 15px; 
      border-radius: 5px; 
      background-color: var(--color-white); 
    }
    .entity-id { 
      font-weight: bold; 
      color: var(--color-primary); 
      margin-bottom: 10px; 
    }
    .entity-type { 
      background-color: var(--color-primary); 
      color: var(--color-white); 
      padding: 2px 8px; 
      border-radius: 3px; 
      font-size: 0.9em; 
      margin-right: 5px; 
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
  </style>
</head>
<body>
  <div class="header">
    <h1>${rootDataset?.name}</h1>
    <p>This is a human-readable view of the <a href="https://www.researchobject.org/ro-crate/" target="_blank">ro-crate</a> metadata found in the accompanying ro-crate-metadata.json file.</p>
    <p>It conforms to the <a href="https://w3id.org/ldac/profile" target="_blank">LDAC Profile</a></p>
  </div>

  <div class="main-content">
    ${generateEntityHtml(rootDataset)}
    
    <h2>All Entities</h2>
    ${graph.map((entity: any) => generateEntityHtml(entity)).join("")}
  </div>

  <button class="json-toggle" onclick="toggleJson()">Show/Hide Raw JSON</button>
  <div id="json-content" class="json-content">
    <pre>${JSON.stringify(roCrateData, null, 2)}</pre>
  </div>

  <script>
    function toggleJson() {
      const content = document.getElementById('json-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
  </script>
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

  const properties = Object.entries(entity)
    .filter(([key]) => !key.startsWith("@"))
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
    <div class="entity">
      <div class="entity-id">${entity["@id"] || "Unknown ID"}</div>
      <div>${typeHtml}</div>
      ${properties}
    </div>
  `;
}
