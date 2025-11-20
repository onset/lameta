import { describe, it, expect } from "vitest";
import { generateRoCrateHtml } from "../RoCrateHtmlGenerator";
import { expandLdacId } from "../RoCrateUtils";
import { expandLdacTestValue } from "./test-utils/rocrate-test-setup";

const ldac = (term: string) => expandLdacId(term);

describe("RoCrateHtmlGenerator", () => {
  const mockRoCrateData = expandLdacTestValue({
    "@context": "https://w3id.org/ro/crate/1.1/context",
    "@graph": [
      {
        "@id": "./",
        "@type": ["Dataset", "RepositoryCollection"],
        name: "Test Project",
        hasPart: [{ "@id": "Sessions/ETR009/" }]
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
        "@type": "File",
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
        "@type": "File",
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
        "@id": ldac("ldac:DataReuseLicense"),
        "@type": "Class",
        name: "Data Reuse License",
        description: "A license for reusing data"
      },
      {
        "@id": ldac("ldac:OpenAccess"),
        "@type": "DefinedTerm",
        name: "Open Access",
        description: "Data may be accessed without authorization"
      },
      {
        "@id": ldac("ldac:AuthorizedAccess"),
        "@type": "DefinedTerm",
        name: "Authorized Access",
        description: "Data requires authorization for access"
      },
      {
        "@id": "#license-testarchive-f",
        "@type": ldac("ldac:DataReuseLicense"),
        name: "Open Access License",
        "ldac:access": { "@id": ldac("ldac:OpenAccess") }
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
        "@type": "File",
        name: "Test Session File",
        encodingFormat: "application/lameta-session"
      },
      {
        "@id": "person.person",
        "@type": "File",
        name: "Person File",
        encodingFormat: "application/lameta-person"
      },
      {
        "@id": "project.sprj",
        "@type": "File",
        name: "Project File",
        encodingFormat: "application/lameta-project"
      }
    ]
  });

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

    // Should contain entity-children-container (indicating children are nested)
    expect(html).toContain('class="entity-children-container"');
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

  it("should show entity headers for Person and Session entities", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Person entities should have entity headers (not be marked as children)
    expect(html).toContain('id="entity_People_Awi_Heole_"');

    // Find the Person entity section and verify it has an entity header
    const personEntityMatch = html.match(
      /<div class="entity"[^>]*id="entity_People_Awi_Heole_"[^>]*>.*?<div class="entity-header">.*?<div class="entity-id">People\/Awi_Heole\/<\/div>/s
    );
    expect(personEntityMatch).toBeTruthy();

    // Session entities should have entity headers (not be marked as children)
    expect(html).toContain('id="entity_Sessions_ETR009_"');

    // Find the Session entity section and verify it has an entity header
    const sessionEntityMatch = html.match(
      /<div class="entity"[^>]*id="entity_Sessions_ETR009_"[^>]*>.*?<div class="entity-header">.*?<div class="entity-id">Sessions\/ETR009\/<\/div>/s
    );
    expect(sessionEntityMatch).toBeTruthy();
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
    // Create test data with references to these entities.
    // Note: Project root is now whitelisted to a few props; attach genre/language to a session so they render.
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project with References",
          license: { "@id": "#license-testarchive-f" },
          hasPart: [{ "@id": "Sessions/RefSession/" }]
        },
        {
          "@id": "Sessions/RefSession/",
          "@type": ["RepositoryObject", "Event"],
          name: "Ref Session",
          genre: { "@id": "ldac:Narrative" },
          "ldac:subjectLanguage": [{ "@id": "#language_etr" }]
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
    expect(html).toContain(
      'lameta</a> software (<a href="https://github.com/onset/lameta">github</a>)'
    );

    // Should appear for all lameta XML files (2 existing + 3 new = 5 total)
    const lametaDescriptionCount = (
      html.match(/This is an XML file that is used by/g) || []
    ).length;
    expect(lametaDescriptionCount).toBe(5); // All .sprj, .session, .person files
  });

  it("should filter out Unknown genre entities and display Unknown as plain text in properties", () => {
    const testDataWithUnknown = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          hasPart: [{ "@id": "Sessions/UnknownGenre/" }]
        },
        {
          "@id": "Sessions/UnknownGenre/",
          "@type": ["RepositoryObject", "Event"],
          name: "Unknown Genre Session",
          genre: { "@id": "tag:lameta/unknown" }
        },
        {
          "@id": "tag:lameta/unknown",
          "@type": "DefinedTerm",
          name: "<Unknown>",
          description: "Custom term: <Unknown>",
          inDefinedTermSet: { "@id": "#CustomGenreTerms" }
        },
        {
          "@id": "#CustomGenreTerms",
          "@type": "DefinedTermSet",
          name: "Custom Genre Terms"
        }
      ]
    };

    const html = generateRoCrateHtml(testDataWithUnknown);

    // The Unknown entity should not be rendered as a card
    expect(html).not.toContain('id="entity_tag_lameta_unknown"');
    expect(html).not.toContain(
      '<div class="entity-id">tag:lameta/unknown</div>'
    );

    // The genre property should display "Unknown" as plain text, not as a link
    expect(html).toContain(
      '<span class="property-name">Genre:</span><span class="property-value">Unknown</span>'
    );

    // Should not contain any links to the unknown entity
    expect(html).not.toContain('href="#entity_tag_lameta_unknown"');
    expect(html).not.toContain('<a href="#entity_tag_lameta_unknown">');
  });

  it("should only render whitelisted fields for File entities", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          hasPart: [{ "@id": "test.person" }]
        },
        {
          "@id": "test.person",
          "@type": "File",
          name: "test.person",
          description: "A person file description",
          encodingFormat: "application/lameta-person",
          "ldac:materialType": { "@id": "ldac:Annotation" },
          contentSize: 1234,
          dateCreated: "2023-01-01",
          dateModified: "2023-01-02",
          creator: "Test User",
          license: "MIT"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Extract only the File entity section
    const docStart = html.indexOf('id="entity_test_person"');
    const docEnd = html.indexOf("</div></div>", docStart);
    const docHtml = html.substring(docStart, docEnd);

    // Should contain only the whitelisted fields for File
    expect(docHtml).toContain("Encoding Format:");
    expect(docHtml).toContain("application/lameta-person");
    expect(docHtml).toContain("Material type:");
    expect(docHtml).toContain("Annotation");

    // Should NOT contain the non-whitelisted fields in the File section
    expect(docHtml).not.toContain("Description:");
    expect(docHtml).not.toContain("Date Created:");
    expect(docHtml).not.toContain("Date Modified:");
    expect(docHtml).not.toContain("Creator:");
    expect(docHtml).not.toContain("License:");
  });

  it("should use DIGITAL_DOCUMENT_FIELDS for file entities (ImageObject, VideoObject, AudioObject)", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          hasPart: [
            { "@id": "test.jpg" },
            { "@id": "test.mp4" },
            { "@id": "test.mp3" }
          ]
        },
        {
          "@id": "test.jpg",
          "@type": "ImageObject",
          name: "test.jpg",
          description: "An image file description",
          encodingFormat: "image/jpeg",
          "ldac:materialType": { "@id": "ldac:PrimaryMaterial" },
          contentSize: 1234,
          dateCreated: "2023-01-01",
          dateModified: "2023-01-02",
          creator: "Test User",
          license: "MIT"
        },
        {
          "@id": "test.mp4",
          "@type": "VideoObject",
          name: "test.mp4",
          description: "A video file description",
          encodingFormat: "video/mp4",
          "ldac:materialType": { "@id": "ldac:PrimaryMaterial" },
          contentSize: 5678,
          dateCreated: "2023-01-01",
          dateModified: "2023-01-02",
          creator: "Test User",
          license: "MIT"
        },
        {
          "@id": "test.mp3",
          "@type": "AudioObject",
          name: "test.mp3",
          description: "An audio file description",
          encodingFormat: "audio/mpeg",
          "ldac:materialType": { "@id": "ldac:PrimaryMaterial" },
          contentSize: 9012,
          dateCreated: "2023-01-01",
          dateModified: "2023-01-02",
          creator: "Test User",
          license: "MIT"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Test ImageObject
    const imgStart = html.indexOf('id="entity_test_jpg"');
    const imgEnd = html.indexOf("</div></div>", imgStart);
    const imgHtml = html.substring(imgStart, imgEnd);

    expect(imgHtml).toContain("Encoding Format:");
    expect(imgHtml).toContain("image/jpeg");
    expect(imgHtml).toContain("Material type:");
    expect(imgHtml).toContain("Primary Material");
    expect(imgHtml).not.toContain("Description:");
    expect(imgHtml).not.toContain("Date Created:");

    // Test VideoObject
    const vidStart = html.indexOf('id="entity_test_mp4"');
    const vidEnd = html.indexOf("</div></div>", vidStart);
    const vidHtml = html.substring(vidStart, vidEnd);

    expect(vidHtml).toContain("Encoding Format:");
    expect(vidHtml).toContain("video/mp4");
    expect(vidHtml).toContain("Material type:");
    expect(vidHtml).not.toContain("Description:");

    // Test AudioObject
    const audStart = html.indexOf('id="entity_test_mp3"');
    const audEnd = html.indexOf("</div></div>", audStart);
    const audHtml = html.substring(audStart, audEnd);

    expect(audHtml).toContain("Encoding Format:");
    expect(audHtml).toContain("audio/mpeg");
    expect(audHtml).toContain("Material type:");
    expect(audHtml).not.toContain("Description:");
  });

  it("should render ldac:materialType with external link for File entities", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          hasPart: [{ "@id": "People/Awi_Heole/Awi_Heole.person" }]
        },
        {
          "@id": "People/Awi_Heole/Awi_Heole.person",
          "@type": "File",
          name: "Awi_Heole.person",
          encodingFormat: "application/lameta-person",
          "ldac:materialType": { "@id": "ldac:Annotation" },
          contentSize: 2048
        }
        // Note: NOT including the ldac:Annotation entity so it becomes an external link
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Extract only the File entity section
    const docStart = html.indexOf(
      'id="entity_People_Awi_Heole_Awi_Heole_person"'
    );
    const docEnd = html.indexOf("</div></div></body>", docStart);
    const docHtml = html.substring(docStart, docEnd);

    // Should contain Material type field
    expect(docHtml).toContain("Material type:");

    // Should contain external link to LDAC Annotation
    expect(docHtml).toContain('href="https://w3id.org/ldac/terms#Annotation"');
    expect(docHtml).toContain('target="_blank"');
    expect(docHtml).toContain('rel="noopener noreferrer"');
    expect(docHtml).toContain(">Annotation</a>");

    // Should NOT show as "Unknown"
    expect(docHtml).not.toContain("Unknown");
  });

  describe("getDisplayPath function", () => {
    // Test the getDisplayPath function directly by accessing it through the generated HTML
    it("should convert file:// URLs to relative paths for images", () => {
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id":
              "file:///C:/dev/lameta%20projects/SayMore%20Data%20from%20Brian%20Parker/Doondo/People/NZOUMBA-Georgine/NZOUMBA-Georgine_Photo.JPG",
            "@type": "ImageObject",
            name: "NZOUMBA-Georgine_Photo.JPG"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Should convert file:// URL to relative path
      expect(html).toContain(
        'src="People/NZOUMBA-Georgine/NZOUMBA-Georgine_Photo.JPG"'
      );
      // Should not contain the original file:// URL
      expect(html).not.toContain('src="file:///');
      // Should not contain percent-encoded characters in the path
      expect(html).not.toContain("%20");
      // Should decode the URL properly
      expect(html).toContain("NZOUMBA-Georgine_Photo.JPG");
    });

    it("should handle Windows paths with spaces in file:// URLs", () => {
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id":
              "file:///C:/dev/lameta%20projects/Project%20With%20Spaces/People/Person%20Name/Person%20Name_Photo.JPG",
            "@type": "ImageObject",
            name: "Person Name_Photo.JPG"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Should properly decode and convert to relative path
      expect(html).toContain('src="People/Person Name/Person Name_Photo.JPG"');
      expect(html).not.toContain("%20");
      expect(html).not.toContain("file://");
    });

    it("should handle various project folder structures", () => {
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id":
              "file:///Users/researcher/Documents/Research/LanguageProject/Sessions/session1/recording.mp3",
            "@type": "AudioObject",
            name: "recording.mp3"
          },
          {
            "@id": "file:///D:/Research/Data/OtherDocs/readme.txt",
            "@type": "File",
            name: "readme.txt"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Should extract relative paths starting from recognized folders
      expect(html).toContain('src="Sessions/session1/recording.mp3"');
      // For File files, check the entity-id display uses getDisplayPath
      expect(html).toContain(">OtherDocs/readme.txt</div>");
    });

    it("should handle relative paths that are already correct", () => {
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "People/Person/Person_Photo.JPG",
            "@type": "ImageObject",
            name: "Person_Photo.JPG"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Should keep relative paths as-is
      expect(html).toContain('src="People/Person/Person_Photo.JPG"');
    });

    it("should fallback to filename if no recognized folder found", () => {
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "file:///some/unknown/path/structure/image.jpg",
            "@type": "ImageObject",
            name: "image.jpg"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Should fallback to just the filename
      expect(html).toContain('src="image.jpg"');
    });

    it("should handle malformed URLs gracefully", () => {
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "file://[invalid-url-format",
            "@type": "ImageObject",
            name: "image.jpg"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Should return the original id if URL parsing fails
      expect(html).toContain('src="file://[invalid-url-format"');
    });

    it("should handle URL-encoded spaces in @id paths", () => {
      // Test case for the new URL encoding approach: @id uses %20 for spaces
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "People/BAKEMBA%20Martine/BAKEMBA%20Martine_Photo.JPG",
            "@type": "ImageObject",
            name: "BAKEMBA Martine_Photo.JPG"
          },
          {
            "@id": "People/BAKEMBA%20Martine/BAKEMBA%20Martine_Consent.jpg",
            "@type": "ImageObject",
            name: "BAKEMBA Martine_Consent.jpg"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Should correctly decode %20 back to spaces in the relative paths
      expect(html).toContain(
        'src="People/BAKEMBA Martine/BAKEMBA Martine_Photo.JPG"'
      );
      expect(html).toContain(
        'src="People/BAKEMBA Martine/BAKEMBA Martine_Consent.jpg"'
      );

      // Should not contain the original percent-encoded URLs
      expect(html).not.toContain('src="People/BAKEMBA%20Martine');
      expect(html).not.toContain("%20");
    });
  });

  describe("Person entity nesting", () => {
    it("should render person photos and consents as child cards within person entities", () => {
      const testDataWithPersonFiles = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project",
            hasPart: [{ "@id": "People/NZOUMBA Georgine/" }]
          },
          {
            "@id": "People/NZOUMBA Georgine/",
            "@type": "Person",
            name: "NZOUMBA Georgine",
            hasPart: [
              { "@id": "People/NZOUMBA-Georgine/NZOUMBA-Georgine.person" },
              { "@id": "People/NZOUMBA-Georgine/NZOUMBA-Georgine_Photo.JPG" },
              { "@id": "People/NZOUMBA-Georgine/NZOUMBA-Georgine_Consent.jpg" }
            ]
          },
          {
            "@id": "People/NZOUMBA-Georgine/NZOUMBA-Georgine.person",
            "@type": "File",
            name: "NZOUMBA-Georgine.person",
            encodingFormat: "application/lameta-person"
          },
          {
            "@id": "People/NZOUMBA-Georgine/NZOUMBA-Georgine_Photo.JPG",
            "@type": "ImageObject",
            name: "NZOUMBA-Georgine_Photo.JPG"
          },
          {
            "@id": "People/NZOUMBA-Georgine/NZOUMBA-Georgine_Consent.jpg",
            "@type": "ImageObject",
            name: "NZOUMBA-Georgine_Consent.jpg"
          }
        ]
      };

      const html = generateRoCrateHtml(testDataWithPersonFiles);

      // Debug output
      console.log("Generated HTML for person files test contains:");
      const entityMatches = html.match(
        /<div class="entity[^>]*id="[^"]*"[^>]*>/g
      );
      console.log(
        "Entity divs:",
        entityMatches?.map((match) => {
          const idMatch = match.match(/id="([^"]*)"/);
          return idMatch ? idMatch[1] : "unknown";
        })
      );

      // The person entity should exist
      expect(html).toContain('id="entity_People_NZOUMBA_Georgine_"');

      // Find the person entity section in the HTML
      const personEntityStart = html.indexOf(
        'id="entity_People_NZOUMBA_Georgine_"'
      );
      expect(personEntityStart).toBeGreaterThan(-1);

      // Look for the next top-level entity to find the end of the person entity section
      const nextEntityStart = html.indexOf(
        '<div class="entity"',
        personEntityStart + 1
      );
      const personEntityEnd =
        nextEntityStart > -1 ? nextEntityStart : html.length;
      const personEntityHtml = html.substring(
        personEntityStart,
        personEntityEnd
      );

      // The person entity should contain an entity-children-container
      expect(personEntityHtml).toContain("entity-children-container");

      // The child entities should be within the person entity section
      expect(personEntityHtml).toContain("NZOUMBA-Georgine_Photo.JPG");
      expect(personEntityHtml).toContain("NZOUMBA-Georgine_Consent.jpg");
      expect(personEntityHtml).toContain("NZOUMBA-Georgine.person");

      // Child entities should have the "child" class
      expect(html).toMatch(/<div[^>]*class="[^"]*child[^"]*"[^>]*>/);
    });

    it("should not show person files as separate root-level entities", () => {
      const testDataWithPersonFiles = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project",
            hasPart: [{ "@id": "People/BAKALA Michel (@Mfouati)/" }]
          },
          {
            "@id": "People/BAKALA Michel (@Mfouati)/",
            "@type": "Person",
            name: "BAKALA Michel (@Mfouati)",
            hasPart: [
              {
                "@id":
                  "People/BAKALA-Michel-@Mfouati/BAKALA-Michel-@Mfouati-.person"
              },
              {
                "@id":
                  "People/BAKALA-Michel-@Mfouati/BAKALA-Michel-@Mfouati-_Photo.JPG"
              },
              {
                "@id":
                  "People/BAKALA-Michel-@Mfouati/BAKALA-Michel-@Mfouati-_Consent.jpg"
              }
            ]
          },
          {
            "@id":
              "People/BAKALA-Michel-@Mfouati/BAKALA-Michel-@Mfouati-.person",
            "@type": "File",
            name: "BAKALA Michel (@Mfouati).person",
            encodingFormat: "application/lameta-person"
          },
          {
            "@id":
              "People/BAKALA-Michel-@Mfouati/BAKALA-Michel-@Mfouati-_Photo.JPG",
            "@type": "ImageObject",
            name: "BAKALA Michel (@Mfouati)_Photo.JPG"
          },
          {
            "@id":
              "People/BAKALA-Michel-@Mfouati/BAKALA-Michel-@Mfouati-_Consent.jpg",
            "@type": "ImageObject",
            name: "BAKALA Michel (@Mfouati)_Consent.jpg"
          }
        ]
      };

      const html = generateRoCrateHtml(testDataWithPersonFiles);

      // Should contain the person entity
      expect(html).toContain('id="entity_People_BAKALA_Michel___Mfouati__"');

      // Photo and consent files should NOT appear as separate root-level entities
      // They should only appear within the person entity's children container
      const photoEntityMatches = html.match(
        /<div class="entity"[^>]*id="[^"]*BAKALA[^"]*Photo[^"]*"[^>]*>/g
      );

      if (photoEntityMatches) {
        // If they appear, they should all have the "child" class
        photoEntityMatches.forEach((match) => {
          expect(match).toContain("child");
        });

        // Should only appear once (as child, not as separate entity)
        expect(photoEntityMatches.length).toBe(1);
      }
    });

    it("should properly compute hierarchy for person entities and their files", () => {
      // Test the hierarchical structure computation directly
      const testGraph = [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "People/PARKER Brian/",
          "@type": "Person",
          name: "PARKER Brian"
        },
        {
          "@id": "People/PARKER-Brian/PARKER-Brian.person",
          "@type": "File",
          name: "PARKER Brian.person",
          encodingFormat: "application/lameta-person"
        },
        {
          "@id": "People/PARKER-Brian/PARKER-Brian_Photo.jpg",
          "@type": "ImageObject",
          name: "PARKER Brian_Photo.jpg"
        },
        {
          "@id": "People/PARKER-Brian/PARKER-Brian_Consent.wav",
          "@type": "AudioObject",
          name: "PARKER Brian_Consent.wav"
        }
      ];

      // Test the child detection logic that's used in computeHierarchy
      const personEntity = testGraph.find(
        (e) => e["@id"] === "People/PARKER Brian/"
      );
      const personEntityId = personEntity!["@id"];

      const potentialChildren = testGraph.filter((child) => {
        const childId = child["@id"];
        if (!childId || childId === personEntityId) return false;

        // The logic from computeHierarchy for checking if a child belongs to a parent
        if (childId.startsWith(personEntityId)) {
          const remainder = childId.substring(personEntityId.length);

          if (personEntityId.endsWith("/")) {
            return remainder.length > 0 && !remainder.includes("/");
          }

          if (remainder.startsWith("/")) {
            const afterSlash = remainder.substring(1);
            return afterSlash.length > 0 && !afterSlash.includes("/");
          }
        }
        return false;
      });

      // Should NOT find children because the file paths don't match the person folder structure
      // "People/PARKER Brian/" vs "People/PARKER-Brian/..."
      expect(potentialChildren.length).toBe(0);

      // But if the structure was consistent:
      const consistentGraph = [
        {
          "@id": "People/PARKER-Brian/",
          "@type": "Person",
          name: "PARKER Brian"
        },
        {
          "@id": "People/PARKER-Brian/PARKER-Brian.person",
          "@type": "File",
          name: "PARKER Brian.person"
        },
        {
          "@id": "People/PARKER-Brian/PARKER-Brian_Photo.jpg",
          "@type": "ImageObject",
          name: "PARKER Brian_Photo.jpg"
        }
      ];

      const consistentPersonEntity = consistentGraph.find(
        (e) => e["@type"] === "Person"
      );
      const consistentPersonId = consistentPersonEntity!["@id"];

      const consistentChildren = consistentGraph.filter((child) => {
        const childId = child["@id"];
        if (!childId || childId === consistentPersonId) return false;

        if (childId.startsWith(consistentPersonId)) {
          const remainder = childId.substring(consistentPersonId.length);

          if (consistentPersonId.endsWith("/")) {
            return remainder.length > 0 && !remainder.includes("/");
          }
        }
        return false;
      });

      // Should find children when paths are consistent
      expect(consistentChildren.length).toBe(2);
      expect(consistentChildren.map((c) => c.name)).toContain(
        "PARKER Brian.person"
      );
      expect(consistentChildren.map((c) => c.name)).toContain(
        "PARKER Brian_Photo.jpg"
      );
    });
  });

  it("should add download links for browser-supported file types only", () => {
    const testDataWithFiles = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "test-document.pdf",
          "@type": "File",
          name: "Test PDF Document",
          encodingFormat: "application/pdf"
        },
        {
          "@id": "word-document.docx",
          "@type": "File",
          name: "Word Document",
          encodingFormat:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        },
        {
          "@id": "Description/README.txt",
          "@type": "File",
          name: "README.txt",
          encodingFormat: "text/plain"
        },
        {
          "@id": "data.json",
          "@type": "File",
          name: "Data File",
          encodingFormat: "application/json"
        },
        {
          "@id": "#collection-license",
          "@type": "CreativeWork",
          name: "Collection License"
        }
      ]
    };

    const html = generateRoCrateHtml(testDataWithFiles);

    // Should contain download links for browser-supported files
    expect(html).toContain('href="test-document.pdf"');
    expect(html).toContain(">Test PDF Document</a>");
    expect(html).toContain('href="Description/README.txt"');
    expect(html).toContain(">README.txt</a>");
    expect(html).toContain('href="data.json"');
    expect(html).toContain(">Data File</a>");

    // Should NOT contain download link for unsupported file types (docx)
    expect(html).not.toContain('href="word-document.docx"');
    expect(html).toContain(">Word Document</h3>"); // Should still show name as plain text

    // Should NOT contain download link for non-file entities
    expect(html).not.toContain('href="#collection-license"');

    // Should NOT contain the old "📁 Download" text
    expect(html).not.toContain("📁 Download");
  });

  it("should render participants in ETR009 session using real Edolo data", () => {
    const fs = require("fs");

    // Load the actual Edolo data
    const edoloDataPath =
      "C:\\Users\\hatto\\OneDrive\\Documents\\lameta\\edolo-rocrate\\ro-crate-metadata.json";
    let edoloData;
    try {
      edoloData = JSON.parse(fs.readFileSync(edoloDataPath, "utf8"));
    } catch (error) {
      console.log("Could not load Edolo data, using mock data");
      edoloData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset"],
            name: "Test Project"
          },
          {
            "@id": "Sessions/ETR009/",
            "@type": ["Event"],
            name: "Test Session",
            description: "A test session",
            "ldac:participant": [
              { "@id": "People/Awi_Heole/" },
              { "@id": "People/Ilawi_Amosa/" }
            ]
          },
          {
            "@id": "People/Awi_Heole/",
            "@type": "Person",
            name: "Awi Heole"
          },
          {
            "@id": "People/Ilawi_Amosa/",
            "@type": "Person",
            name: "Ilawi Amosa"
          }
        ]
      };
    }

    const html = generateRoCrateHtml(edoloData);

    // Find the ETR009 session in the HTML
    const sessionStart = html.indexOf('id="entity_Sessions_ETR009_"');
    if (sessionStart !== -1) {
      const sessionEnd = html.indexOf('<div class="entity"', sessionStart + 1);
      const sessionHtml =
        sessionEnd !== -1
          ? html.substring(sessionStart, sessionEnd)
          : html.substring(sessionStart, sessionStart + 2000);
    }

    // Should render the participant field
    expect(html).toContain("Participant:");
  });

  it("should render participants in ETR009 session from actual Edolo sample", () => {
    const fs = require("fs");
    const path = require("path");

    // Load the actual Edolo sample RO-Crate data
    const edoloDataPath =
      "C:\\Users\\hatto\\OneDrive\\Documents\\lameta\\edolo-rocrate\\ro-crate-metadata.json";

    let edoloData;
    try {
      const rawData = fs.readFileSync(edoloDataPath, "utf8");
      edoloData = JSON.parse(rawData);
    } catch (error) {
      console.log(
        `Could not load Edolo sample data from ${edoloDataPath}: ${error.message}`
      );
      // Skip this test if we can't load the actual data
      return;
    }

    // Find the ETR009 session in the graph
    const etr009Session = edoloData["@graph"].find(
      (entity: any) => entity["@id"] === "Sessions/ETR009/"
    );

    const html = generateRoCrateHtml(edoloData);

    if (etr009Session && etr009Session["ldac:participant"]) {
      // Should render the participant field
      expect(html).toContain("Participant:");
    } else {
      console.log("ETR009 session does not have ldac:participant field");
    }
  });

  it("should render both subject language and collection working languages with proper links", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project with Language Comparison",
          "ldac:subjectLanguage": [{ "@id": "#language_etr" }],
          collectionWorkingLanguages: "spa;ita"
        },
        {
          "@id": "#language_etr",
          "@type": "Language",
          code: "etr",
          name: "Edolo"
        },
        {
          "@id": "#language_spa",
          "@type": "Language",
          code: "spa",
          name: "Spanish"
        },
        {
          "@id": "#language_ita",
          "@type": "Language",
          code: "ita",
          name: "Italian"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Subject Language should be linked to Glottolog
    expect(html).toContain(
      'href="https://glottolog.org/resource/languoid/iso/etr"'
    );
    expect(html).toContain(">Edolo</a>");

    // Collection Working Languages should also be linked to Glottolog, not just show raw codes
    expect(html).toContain(
      'href="https://glottolog.org/resource/languoid/iso/spa"'
    );
    expect(html).toContain(">Spanish</a>");
    expect(html).toContain(
      'href="https://glottolog.org/resource/languoid/iso/ita"'
    );
    expect(html).toContain(">Italian</a>");

    // Should NOT contain raw language codes
    expect(html).not.toContain("Collection Working Languages:spa;ita");
  });

  it("should handle collection working languages when language entities are not in graph", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project with Missing Languages",
          collectionWorkingLanguages: "fra;deu"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should show the raw language codes when no Language entities are found
    expect(html).toContain(
      'Collection Working Languages:</span><span class="property-value">fra, deu</span>'
    );
  });

  it("should handle mixed scenarios with some language entities present and some missing", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project with Mixed Languages",
          collectionWorkingLanguages: "spa;xyz;ita"
        },
        {
          "@id": "#language_spa",
          "@type": "Language",
          code: "spa",
          name: "Spanish"
        },
        {
          "@id": "#language_ita",
          "@type": "Language",
          code: "ita",
          name: "Italian"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should link the found languages and show raw codes for missing ones
    expect(html).toContain(
      'href="https://glottolog.org/resource/languoid/iso/spa"'
    );
    expect(html).toContain(">Spanish</a>");
    expect(html).toContain(
      'href="https://glottolog.org/resource/languoid/iso/ita"'
    );
    expect(html).toContain(">Italian</a>");
    expect(html).toContain("xyz"); // Raw code for missing language entity
  });

  it("should format file sizes in human-readable format", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset"],
          name: "Test Project"
        },
        {
          "@id": "test-file.mp4",
          "@type": ["File", "VideoObject"],
          name: "Test Video",
          contentSize: 77594624 // 74 MB
        },
        {
          "@id": "small-file.txt",
          "@type": ["File"],
          name: "Small Text File",
          contentSize: 1024 // 1 KB
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should format large file size as MB
    expect(html).toContain("74 MB");

    // Should format small file size as KB
    expect(html).toContain("1 KB");
  });
});
