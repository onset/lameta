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
    body { 
      font-family: Arial, sans-serif; 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 20px; 
      line-height: 1.6; 
    }
    .header { 
      border-bottom: 2px solid #007acc; 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
    }
    .entity { 
      border: 1px solid #ddd; 
      margin: 20px 0; 
      padding: 15px; 
      border-radius: 5px; 
      background-color: #f9f9f9; 
    }
    .entity-id { 
      font-weight: bold; 
      color: #007acc; 
      margin-bottom: 10px; 
    }
    .entity-type { 
      background-color: #007acc; 
      color: white; 
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
      color: #333; 
    }
    .property-value { 
      color: #666; 
      margin-left: 10px; 
    }
    .json-toggle { 
      background-color: #28a745; 
      color: white; 
      border: none; 
      padding: 10px 20px; 
      border-radius: 5px; 
      cursor: pointer; 
      margin: 20px 0; 
    }
    .json-content { 
      display: none; 
      background-color: #f8f8f8; 
      border: 1px solid #ddd; 
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
    <h1>RO-Crate Preview</h1>
    <p><strong>Research Object Crate</strong> - Human-readable view of the metadata</p>
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
