import { describe, it, expect } from "vitest";
import { generateRoCrateHtml } from "./RoCrateHtmlGenerator";

describe("RoCrateHtmlGenerator", () => {
  const mockRoCrateData = {
    "@context": "https://w3id.org/ro/crate/1.1/context",
    "@graph": [
      {
        "@id": "./",
        "@type": ["Dataset", "RepositoryCollection"],
        name: "Test Project",
        hasPart: [{ "@id": "People/Awi_Heole/" }, { "@id": "Sessions/ETR009/" }]
      },
      {
        "@id": "People/Awi_Heole/",
        "@type": "Person",
        name: "Awi Heole",
        age: "38",
        hasPart: [
          { "@id": "People/Awi_Heole/Awi_Heole.person" },
          { "@id": "People/Awi_Heole/Awi_Heole_Photo.JPG" },
          { "@id": "People/Awi_Heole/Awi_Heole_Consent.JPG" }
        ]
      },
      {
        "@id": "People/Awi_Heole/Awi_Heole.person",
        "@type": "DigitalDocument",
        name: "Awi_Heole.person",
        encodingFormat: "application/lameta-person"
      },
      {
        "@id": "People/Awi_Heole/Awi_Heole_Photo.JPG",
        "@type": "ImageObject",
        name: "Awi_Heole_Photo.JPG"
      },
      {
        "@id": "People/Awi_Heole/Awi_Heole_Consent.JPG",
        "@type": "ImageObject",
        name: "Awi_Heole_Consent.JPG"
      },
      {
        "@id": "Sessions/ETR009/",
        "@type": "Event",
        name: "Test Session",
        hasPart: [
          { "@id": "Sessions/ETR009/ETR009.session" },
          { "@id": "Sessions/ETR009/test.mp4" }
        ]
      },
      {
        "@id": "Sessions/ETR009/ETR009.session",
        "@type": "DigitalDocument",
        name: "ETR009.session",
        encodingFormat: "application/lameta-session"
      },
      {
        "@id": "Sessions/ETR009/test.mp4",
        "@type": "VideoObject",
        name: "test.mp4"
      }
    ]
  };

  it("should detect children correctly", () => {
    const graph = mockRoCrateData["@graph"];

    // Test the child detection logic directly
    const peopleEntity = graph.find((e) => e["@id"] === "People/Awi_Heole/");
    if (!peopleEntity) throw new Error("People entity not found");
    const entityId = peopleEntity["@id"];

    const children = graph.filter((child) => {
      const childId = child["@id"];
      if (!childId || childId === entityId) return false;

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

    expect(children.length).toBeGreaterThan(0);
    expect(children.map((c) => c["@id"])).toContain(
      "People/Awi_Heole/Awi_Heole.person"
    );
    expect(children.map((c) => c["@id"])).toContain(
      "People/Awi_Heole/Awi_Heole_Photo.JPG"
    );
  });

  it("should nest child entities within their parents using entity-children-container", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Debug: Check what entities are being generated
    const entityMatches = html.match(
      /<div class="entity[^>]*id="[^"]*"[^>]*>/g
    );
    console.log(
      "Generated entities:",
      entityMatches?.map((match) => {
        const idMatch = match.match(/id="([^"]*)"/);
        return idMatch ? idMatch[1] : "unknown";
      })
    );

    // The person entity should exist
    expect(html).toContain('id="entity_People_Awi_Heole_"');

    // The person entity should have an entity-children-container
    const personEntityMatch = html.match(
      /<div class="entity"[^>]*id="entity_People_Awi_Heole_"[^>]*>.*?(?=<div class="entity"[^>]*id="entity_[^"]*"[^>]*>|<\/div><\/body>)/s
    );
    expect(personEntityMatch).toBeTruthy();

    if (personEntityMatch) {
      const personEntityHtml = personEntityMatch[0];

      // Should contain entity-children-container
      expect(personEntityHtml).toContain("entity-children-container");

      // Should contain the child entities within the person entity
      expect(personEntityHtml).toContain(
        "People/Awi_Heole/Awi_Heole_Photo.JPG"
      );
      expect(personEntityHtml).toContain(
        "People/Awi_Heole/Awi_Heole_Consent.JPG"
      );
      expect(personEntityHtml).toContain("People/Awi_Heole/Awi_Heole.person");
    }
  });

  it("should not render child entities as standalone root entities", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Check that the person entity exists
    expect(html).toContain('id="entity_People_Awi_Heole_"');

    // Check that child entities are not rendered as standalone entities at the root level
    // by verifying they are within entity-children-container divs and have the "child" class

    // Find all photo entity instances
    const photoEntityMatches = html.match(
      /<div[^>]*id="entity_People_Awi_Heole_Awi_Heole_Photo_JPG"[^>]*>/g
    );
    expect(photoEntityMatches).toBeTruthy();
    expect(photoEntityMatches!.length).toBe(1); // Should only appear once

    // The photo entity should have the "child" class
    const photoEntityHtml = photoEntityMatches![0];
    expect(photoEntityHtml).toContain('class="entity');
    expect(photoEntityHtml).toContain("child");

    // Check that the photo entity is within an entity-children-container
    const photoEntityIndex = html.indexOf(
      'id="entity_People_Awi_Heole_Awi_Heole_Photo_JPG"'
    );
    const beforePhotoEntity = html.substring(0, photoEntityIndex);
    const childrenContainerIndex = beforePhotoEntity.lastIndexOf(
      '<div class="entity-children-container">'
    );
    expect(childrenContainerIndex).toBeGreaterThan(-1);
  });

  it("should render session children correctly", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // The session entity should exist
    expect(html).toContain('id="entity_Sessions_ETR009_"');

    // Find the session entity block
    const sessionEntityMatch = html.match(
      /<div class="entity"[^>]*id="entity_Sessions_ETR009_"[^>]*>.*?(?=<div class="entity"[^>]*id="entity_[^"]*"[^>]*>|<\/div><\/body>)/s
    );

    if (sessionEntityMatch) {
      const sessionEntityHtml = sessionEntityMatch[0];

      // Should contain entity-children-container
      expect(sessionEntityHtml).toContain("entity-children-container");

      // Should contain the child entities within the session entity
      expect(sessionEntityHtml).toContain("Sessions/ETR009/ETR009.session");
      expect(sessionEntityHtml).toContain("Sessions/ETR009/test.mp4");
    }
  });

  it("should mark child entities with the child class", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Child entities should have the "child" class
    const childEntityPattern =
      /<div class="entity[^"]*child[^"]*"[^>]*id="entity_People_Awi_Heole_Awi_Heole_Photo_JPG"[^>]*>/;
    expect(html).toMatch(childEntityPattern);
  });

  it("should hide entity headers for child entities", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // The CSS rule should hide headers for child entities
    expect(html).toContain(".entity.child .entity-header { display: none; }");
  });
});
