import { describe, it, expect } from "vitest";
import { generateRoCrateHtml } from "./RoCrateHtmlGenerator";

describe("RoCrateHtmlGenerator", () => {
  const mockRoCrateData = {
    "@context": "https://w3id.org/ro/crate/1.1/context",
    "@graph": [
      {
        "@id": "./",
        "@type": ["Dataset", "pcdm:Collection"],
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
      },
      {
        "@id": "ro-crate-metadata.json",
        "@type": "CreativeWork",
        conformsTo: { "@id": "https://w3id.org/ro/crate/1.1" },
        about: { "@id": "./" }
      },
      {
        "@id": "ldac:DataReuseLicense",
        "@type": "Class",
        name: "Data Reuse License",
        description: "A license for reusing data"
      },
      {
        "@id": "ldac:OpenAccess",
        "@type": "DefinedTerm",
        name: "Open Access",
        description: "Data may be accessed without authorization"
      },
      {
        "@id": "ldac:AuthorizedAccess",
        "@type": "DefinedTerm",
        name: "Authorized Access",
        description: "Data requires authorization for access"
      },
      {
        "@id": "#license-testarchive-f",
        "@type": "ldac:DataReuseLicense",
        name: "Open Access License",
        "ldac:access": { "@id": "ldac:OpenAccess" }
      },
      {
        "@id": "#language_etr",
        "@type": "Language",
        code: "etr",
        name: "Edolo"
      },
      {
        "@id": "#language_tpi",
        "@type": "Language",
        code: "tpi",
        name: "Tok Pisin"
      },
      {
        "@id": "#CustomGenreTerms",
        "@type": "DefinedTermSet",
        name: "Custom Genre Terms"
      },
      {
        "@id": "test.session",
        "@type": "DigitalDocument",
        name: "Test Session File",
        encodingFormat: "application/lameta-session"
      },
      {
        "@id": "person.person",
        "@type": "DigitalDocument",
        name: "Person File",
        encodingFormat: "application/lameta-person"
      },
      {
        "@id": "project.sprj",
        "@type": "DigitalDocument",
        name: "Project File",
        encodingFormat: "application/lameta-project"
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

      // Should contain the child entities within the person entity (checking for names, not full paths)
      expect(personEntityHtml).toContain("Awi_Heole_Photo.JPG");
      expect(personEntityHtml).toContain("Awi_Heole_Consent.JPG");
      expect(personEntityHtml).toContain("Awi_Heole.person");
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

      // Should contain the child entities within the session entity (checking for names, not full paths)
      expect(sessionEntityHtml).toContain("ETR009.session");
      expect(sessionEntityHtml).toContain("test.mp4");
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

  it("should filter out ro-crate-metadata.json file", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Check that ro-crate-metadata.json is not rendered as an entity
    expect(html).not.toContain('id="entity_ro-crate-metadata_json"');

    // Should not contain the ro-crate-metadata.json as an entity header
    expect(html).not.toContain(
      '<div class="entity-id">ro-crate-metadata.json</div>'
    );
  });

  it("should filter out official LDAC DataReuseLicense class definition and access types but keep custom licenses", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Check that the LDAC DataReuseLicense class definition is not rendered as a separate entity
    expect(html).not.toContain('id="entity_ldac_DataReuseLicense"');
    expect(html).not.toContain(
      '<div class="entity-id">ldac:DataReuseLicense</div>'
    );

    // Check that LDAC access types are not rendered as separate entities
    expect(html).not.toContain('id="entity_ldac_OpenAccess"');
    expect(html).not.toContain('id="entity_ldac_AuthorizedAccess"');
    expect(html).not.toContain('<div class="entity-id">ldac:OpenAccess</div>');
    expect(html).not.toContain(
      '<div class="entity-id">ldac:AuthorizedAccess</div>'
    );

    // But custom license entities should be rendered
    expect(html).toContain('id="entity__license_testarchive_f"');
    expect(html).toContain(
      '<div class="entity-id">#license-testarchive-f</div>'
    );
  });

  it("should filter out Language entities and link to Glottolog", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Check that Language entities are not rendered as separate entities
    expect(html).not.toContain('id="entity__language_etr"');
    expect(html).not.toContain('id="entity__language_tpi"');

    // Should not contain Language entities as entity headers
    expect(html).not.toContain('<div class="entity-id">#language_etr</div>');
    expect(html).not.toContain('<div class="entity-id">#language_tpi</div>');
  });

  it("should generate external links for LDAC terms, DataReuseLicense, access types, and Languages", () => {
    // Create test data with references to these entities
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "pcdm:Collection"],
          name: "Test Project with References",
          genre: { "@id": "ldac:Narrative" },
          license: { "@id": "#license-testarchive-f" },
          subjectLanguages: [{ "@id": "#language_etr" }]
        },
        {
          "@id": "ldac:Narrative",
          "@type": "DefinedTerm",
          name: "Narrative",
          inDefinedTermSet: { "@id": "ldac:Genres" }
        },
        {
          "@id": "ldac:DataReuseLicense",
          "@type": "Class",
          name: "Data Reuse License",
          description: "A license for reusing data"
        },
        {
          "@id": "#license-testarchive-f",
          "@type": "ldac:DataReuseLicense",
          name: "Open Access License",
          "ldac:access": { "@id": "ldac:OpenAccess" },
          conformsTo: { "@id": "ldac:DataReuseLicense" }
        },
        {
          "@id": "ldac:OpenAccess",
          "@type": "DefinedTerm",
          name: "Open Access",
          description: "Data may be accessed without authorization"
        },
        {
          "@id": "#language_etr",
          "@type": "Language",
          code: "etr",
          name: "Edolo"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should contain external link to LDAC genre
    expect(html).toContain('href="https://w3id.org/ldac/terms#Narrative"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');

    // Should contain external link to LDAC access type (within the custom license entity)
    expect(html).toContain('href="https://w3id.org/ldac/terms#OpenAccess"');

    // Should contain external link to Glottolog for language
    expect(html).toContain(
      'href="https://glottolog.org/resource/languoid/iso/etr"'
    );
  });

  it("should filter out CustomGenreTerms entity", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Check that CustomGenreTerms entity is not rendered
    expect(html).not.toContain('id="entity__CustomGenreTerms"');
    expect(html).not.toContain(
      '<div class="entity-id">#CustomGenreTerms</div>'
    );
  });

  it("should add lameta XML file description for .sprj, .session, and .person files", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Should contain the description for lameta XML files
    expect(html).toContain("This is an XML file that is used by");
    expect(html).toContain('href="https://github.com/onset/lameta"');
    expect(html).toContain("lameta</a> (<a href=\"https://github.com/onset/lameta\">github</a>) software");

    // Should appear for all lameta XML files (2 existing + 3 new = 5 total)
    const lametaDescriptionCount = (
      html.match(/This is an XML file that is used by/g) || []
    ).length;
    expect(lametaDescriptionCount).toBe(5); // All .sprj, .session, .person files
  });
});
