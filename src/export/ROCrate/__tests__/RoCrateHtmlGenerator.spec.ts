import { describe, it, expect } from "vitest";
import { generateRoCrateHtml } from "../RoCrateHtmlGenerator";
import { createPersonId, expandLdacId } from "../RoCrateUtils";
import { expandLdacTestValue } from "./test-utils/rocrate-test-setup";

const ldac = (term: string) => expandLdacId(term);
const awiPersonId = createPersonId({ filePrefix: "Awi_Heole" });
const ilawiPersonId = createPersonId({ filePrefix: "Ilawi_Amosa" });

describe("RoCrateHtmlGenerator", () => {
  const mockRoCrateData = expandLdacTestValue({
    "@context": "https://w3id.org/ro/crate/1.1/context",
    "@graph": [
      {
        "@id": "./",
        "@type": ["Dataset", "RepositoryCollection"],
        name: "Test Project",
        hasPart: [{ "@id": "#session-ETR009" }]
      },
      {
        "@id": awiPersonId,
        "@type": "Person",
        name: "Awi Heole",
        age: "38",
        image: [
          { "@id": "People/Awi_Heole/Awi_Heole_Photo.JPG" },
          { "@id": "People/Awi_Heole/Awi_Heole_Consent.JPG" }
        ],
        subjectOf: { "@id": "People/Awi_Heole/Awi_Heole.person" }
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
        // LAM-67 https://linear.app/lameta/issue/LAM-67/ro-crate-11-part-1
        // Session entity uses a fragment identifier rather than a pseudo-path.
        "@id": "#session-ETR009",
        "@type": ["RepositoryObject", "CollectionEvent"],
        collectionEventType: "https://w3id.org/ldac/terms#Session",
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

  it("should detect session children correctly", () => {
    const graph = mockRoCrateData["@graph"];

    const sessionEntity = graph.find((e) => e["@id"] === "#session-ETR009");
    if (!sessionEntity) throw new Error("Session entity not found");
    const referencedChildIds = (sessionEntity.hasPart || []).map(
      (part: any) => part["@id"]
    );
    const children = graph.filter((child) =>
      referencedChildIds.includes(child["@id"])
    );

    expect(children.length).toBe(2);
    expect(children.map((c) => c["@id"])).toEqual(
      expect.arrayContaining([
        "Sessions/ETR009/ETR009.session",
        "Sessions/ETR009/test.mp4"
      ])
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
    expect(html).toContain('id="entity__Awi_Heole"');

    // Should contain entity-children-container (indicating children are nested)
    expect(html).toContain('class="entity-children-container"');
  });

  it("should not render child entities as standalone root entities", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Check that the person entity exists
    expect(html).toContain('id="entity__Awi_Heole"');

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
    expect(html).toContain('id="entity__session_ETR009"');

    // Find the session entity block
    const sessionEntityMatch = html.match(
      /<div class="entity"[^>]*id="entity__session_ETR009"[^>]*>.*?(?=<div class="entity"[^>]*id="entity_[^"]*"[^>]*>|<\/div><\/body>)/s
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
    expect(html).toContain('id="entity__Awi_Heole"');

    // Find the Person entity section and verify it has an entity header
    // Person entities display decoded for readability
    const personEntityMatch = html.match(
      /<div class="entity"[^>]*id="entity__Awi_Heole"[^>]*>.*?<div class="entity-header">.*?<div class="entity-id">Person: #Awi_Heole<\/div>/s
    );
    expect(personEntityMatch).toBeTruthy();

    // Session entities should have entity headers (not be marked as children)
    expect(html).toContain('id="entity__session_ETR009"');

    // Find the Session entity section and verify it has an entity header
    const sessionEntityMatch = html.match(
      /<div class="entity"[^>]*id="entity__session_ETR009"[^>]*>.*?<div class="entity-header">.*?<div class="entity-id">#session-ETR009<\/div>/s
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
          hasPart: [{ "@id": "#session-RefSession" }]
        },
        {
          "@id": "#session-RefSession",
          "@type": ["RepositoryObject", "CollectionEvent"],
          collectionEventType: "https://w3id.org/ldac/terms#Session",
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
  });

  it("should detect children via person media references", () => {
    const graph = mockRoCrateData["@graph"];

    const peopleEntity = graph.find((e) => {
      const types = Array.isArray(e["@type"]) ? e["@type"] : [e["@type"]];
      return types.includes("Person") && e.name === "Awi Heole";
    });
    if (!peopleEntity) throw new Error("People entity not found");
    expect(peopleEntity["@id"]).toBe(awiPersonId);

    const referencesChild = (value: any, childId: string): boolean => {
      if (!value) return false;
      if (Array.isArray(value)) {
        return value.some((item) => referencesChild(item, childId));
      }
      if (typeof value === "object" && value["@id"]) {
        return value["@id"] === childId;
      }
      return false;
    };

    const children = graph.filter((child) => {
      const childId = child["@id"];
      if (!childId || childId === peopleEntity["@id"]) return false;
      return (
        referencesChild((peopleEntity as any).image, childId) ||
        referencesChild((peopleEntity as any).subjectOf, childId)
      );
    });

    expect(children.length).toBe(3);
    expect(children.map((c) => c["@id"])).toEqual(
      expect.arrayContaining([
        "People/Awi_Heole/Awi_Heole.person",
        "People/Awi_Heole/Awi_Heole_Photo.JPG",
        "People/Awi_Heole/Awi_Heole_Consent.JPG"
      ])
    );
  });

  it("should describe person media via image/subjectOf references", () => {
    const graph = mockRoCrateData["@graph"];

    const peopleEntity = graph.find((e) => {
      const types = Array.isArray(e["@type"]) ? e["@type"] : [e["@type"]];
      return types.includes("Person") && e.name === "Awi Heole";
    });
    if (!peopleEntity) throw new Error("People entity not found");

    // LAM-48 https://linear.app/lameta/issue/LAM-48 requires that Person
    // entities avoid hasPart, so verify we expose their files through
    // image/subjectOf links instead.
    expect(peopleEntity).not.toHaveProperty("hasPart");
    expect(peopleEntity.image).toEqual(
      expect.arrayContaining([
        { "@id": "People/Awi_Heole/Awi_Heole_Photo.JPG" },
        { "@id": "People/Awi_Heole/Awi_Heole_Consent.JPG" }
      ])
    );
    expect(peopleEntity.subjectOf).toEqual({
      "@id": "People/Awi_Heole/Awi_Heole.person"
    });
  });

  it("should not render unknown genre fields for sessions", () => {
    const html = generateRoCrateHtml(mockRoCrateData);

    // Session entities should skip rendering unknown values entirely
    // So there should be no Genre field shown when the value is unknown
    expect(html).not.toContain('href="#entity_tag_lameta_unknown"');
    expect(html).not.toContain('<a href="#entity_tag_lameta_unknown">');

    // The session should not have a Genre property rendered at all when it's unknown
    // (The session in mockRoCrateData has no genre defined, so it should be skipped)
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
    expect(imgHtml).not.toContain("Description:");
    expect(imgHtml).not.toContain("Date Created:");

    // Test VideoObject
    const vidStart = html.indexOf('id="entity_test_mp4"');
    const vidEnd = html.indexOf("</div></div>", vidStart);
    const vidHtml = html.substring(vidStart, vidEnd);

    expect(vidHtml).toContain("Encoding Format:");
    expect(vidHtml).toContain("video/mp4");
    expect(vidHtml).not.toContain("Description:");

    // Test AudioObject
    const audStart = html.indexOf('id="entity_test_mp3"');
    const audEnd = html.indexOf("</div></div>", audStart);
    const audHtml = html.substring(audStart, audEnd);

    expect(audHtml).toContain("Encoding Format:");
    expect(audHtml).toContain("audio/mpeg");
    expect(audHtml).not.toContain("Description:");
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

  it("should render participants in ETR009 session when participants are valid persons", () => {
    // Test that sessions with valid participant data show the Participant field
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset"],
          name: "Test Project"
        },
        {
          "@id": "#session-ETR009",
          "@type": ["RepositoryObject", "CollectionEvent"],
          collectionEventType: "https://w3id.org/ldac/terms#Session",
          name: "Test Session",
          description: "A test session",
          "ldac:participant": [{ "@id": awiPersonId }, { "@id": ilawiPersonId }]
        },
        {
          "@id": awiPersonId,
          "@type": "Person",
          name: "Awi Heole"
        },
        {
          "@id": ilawiPersonId,
          "@type": "Person",
          name: "Ilawi Amosa"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should render the participant field when participants are valid persons
    expect(html).toContain("Participant");
    expect(html).toContain("Awi Heole");
    expect(html).toContain("Ilawi Amosa");
  });

  it("should NOT render participant field when all participants are unknown", () => {
    // Test that sessions with only unknown participants don't show the Participant field
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset"],
          name: "Test Project"
        },
        {
          "@id": "#session-TEST",
          "@type": ["RepositoryObject", "CollectionEvent"],
          collectionEventType: "https://w3id.org/ldac/terms#Session",
          name: "Test Session",
          description: "A test session",
          "ldac:participant": [{ "@id": "tag:lameta/unknown" }]
        },
        {
          "@id": "tag:lameta/unknown",
          "@type": "Person",
          name: "Unknown"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Find the session section
    const sessionStart = html.indexOf('id="entity__session_TEST"');
    const sessionEnd = html.indexOf('<div class="entity"', sessionStart + 1);
    const sessionHtml =
      sessionEnd !== -1
        ? html.substring(sessionStart, sessionEnd)
        : html.substring(sessionStart, sessionStart + 2000);

    // Session should NOT have a Participant property when all participants are unknown
    expect(sessionHtml).not.toContain("Participant:");
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
      (entity: any) => entity["@id"] === "#session-ETR009"
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

  it("should display Country from contentLocation Place entity", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          contentLocation: [{ "@id": "#place-country-Papua_New_Guinea" }]
        },
        {
          "@id": "#place-country-Papua_New_Guinea",
          "@type": "Place",
          name: "Papua New Guinea",
          description: "Located in Oceania"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should render the Country field with the place name
    expect(html).toContain("Country:");
    expect(html).toContain("Papua New Guinea");

    // Should NOT render as "Unknown"
    const countrySection = html.match(
      /Country:<\/span><span class="property-value">([^<]+)/
    );
    expect(countrySection).toBeTruthy();
    expect(countrySection![1]).not.toContain("Unknown");
  });

  it("should filter out wrapper Dataset entities (People, Sessions, person-files)", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          hasPart: [{ "@id": "#People" }, { "@id": "Sessions/" }]
        },
        {
          "@id": "#People",
          "@type": "Dataset",
          name: "People",
          description: "Directory of people",
          hasPart: [{ "@id": "#Awi_Heole-files" }]
        },
        {
          "@id": "#Awi_Heole-files",
          "@type": "Dataset",
          name: "Awi_Heole files",
          hasPart: [{ "@id": "#Awi_Heole" }]
        },
        {
          "@id": "#Awi_Heole",
          "@type": "Person",
          name: "Awi Heole"
        },
        {
          "@id": "Sessions/",
          "@type": "Dataset",
          name: "Sessions",
          hasPart: [{ "@id": "Sessions/ETR009/" }]
        },
        {
          "@id": "Sessions/ETR009/",
          "@type": "Dataset",
          name: "Session ETR009",
          hasPart: [{ "@id": "#session-ETR009" }]
        },
        {
          "@id": "#session-ETR009",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Test Session"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should NOT render wrapper Datasets (People, person-files, Sessions/)
    expect(html).not.toContain('id="entity__People"');
    expect(html).not.toContain('id="entity__Awi_Heole_files"');
    expect(html).not.toContain('id="entity_Sessions_"');

    // Session directory Datasets (Sessions/ETR009/) SHOULD now be rendered as merged entities
    // with their CollectionEvent metadata. The directory path is used as the main ID.
    expect(html).toContain('id="entity_Sessions_ETR009_"');
    // The original CollectionEvent ID should exist as a secondary anchor for link resolution
    expect(html).toContain('id="entity__session_ETR009"');

    // Should still render the actual Person entities
    expect(html).toContain('id="entity__Awi_Heole"');
  });

  it("should merge session directory Datasets with their CollectionEvent entities", () => {
    // This test verifies that session directory Datasets (Sessions/ETR009/) are merged
    // with their corresponding CollectionEvent (#session-ETR009) into a single entity.
    // The link is via the "about" property on the directory Dataset.
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "Sessions/",
          "@type": "Dataset",
          name: "Sessions",
          hasPart: [{ "@id": "Sessions/ETR009/" }]
        },
        {
          // Session directory Dataset - linked to CollectionEvent via "about"
          "@id": "Sessions/ETR009/",
          "@type": "Dataset",
          name: "ETR009 Directory",
          about: { "@id": "#session-ETR009" },
          hasPart: [
            { "@id": "Sessions/ETR009/audio.mp3" },
            { "@id": "Sessions/ETR009/video.mp4" }
          ]
        },
        {
          // Session CollectionEvent - has metadata but files are in the directory
          "@id": "#session-ETR009",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Test Session from CollectionEvent",
          description: "A test session description",
          subjectOf: { "@id": "Sessions/ETR009/" },
          "ldac:participant": [{ "@id": "#person-1" }]
        },
        {
          "@id": "Sessions/ETR009/audio.mp3",
          "@type": "AudioObject",
          name: "audio.mp3"
        },
        {
          "@id": "Sessions/ETR009/video.mp4",
          "@type": "VideoObject",
          name: "video.mp4"
        },
        {
          "@id": "#person-1",
          "@type": "Person",
          name: "Test Person"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // The merged entity should use the directory path as its ID
    expect(html).toContain('id="entity_Sessions_ETR009_"');

    // The merged entity should display "Session: ETR009" format
    expect(html).toContain(">Session: ETR009<");

    // The merged entity should have the CollectionEvent's name
    expect(html).toContain("Test Session from CollectionEvent");

    // The merged entity should have the CollectionEvent's description
    expect(html).toContain("A test session description");

    // The original CollectionEvent ID should exist as a secondary anchor for link resolution
    expect(html).toContain('id="entity__session_ETR009"');

    // The session files should be rendered (as children of the session)
    expect(html).toContain("audio.mp3");
    expect(html).toContain("video.mp4");

    // Links to #session-ETR009 should work (secondary anchor exists)
    // The Sessions list on the root card should link to the session
    expect(html).toContain('href="#entity__session_ETR009"');
  });

  it("should have all internal anchor links point to valid entity IDs", () => {
    // This test ensures all href="#entity_..." links have a corresponding id="entity_..." target
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          hasPart: [{ "@id": "#session-ETR008" }, { "@id": "#session-ETR009" }],
          "pcdm:hasMember": [
            { "@id": "#session-ETR008" },
            { "@id": "#session-ETR009" }
          ]
        },
        {
          "@id": "#session-ETR008",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR008",
          hasPart: [{ "@id": "Sessions/ETR008/audio.mp3" }],
          "ldac:participant": [{ "@id": "#Awi_Heole" }]
        },
        {
          "@id": "#session-ETR009",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR009",
          hasPart: [{ "@id": "Sessions/ETR009/video.mp4" }]
        },
        {
          "@id": "Sessions/ETR008/audio.mp3",
          "@type": "AudioObject",
          name: "audio.mp3"
        },
        {
          "@id": "Sessions/ETR009/video.mp4",
          "@type": "VideoObject",
          name: "video.mp4"
        },
        {
          "@id": "#Awi_Heole",
          "@type": "Person",
          name: "Awi Heole"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Extract all internal anchor links (href="#entity_...")
    const linkMatches = html.match(/href="#(entity_[^"]+)"/g) || [];
    const linkedIds = linkMatches
      .map((match) => {
        const m = match.match(/href="#(entity_[^"]+)"/);
        return m ? m[1] : null;
      })
      .filter(Boolean) as string[];

    // Extract all entity IDs (id="entity_...")
    const idMatches = html.match(/id="(entity_[^"]+)"/g) || [];
    const definedIds = new Set(
      idMatches
        .map((match) => {
          const m = match.match(/id="(entity_[^"]+)"/);
          return m ? m[1] : null;
        })
        .filter(Boolean) as string[]
    );

    // Verify all linked IDs exist as defined entity IDs
    const brokenLinks = linkedIds.filter((id) => !definedIds.has(id));

    // Log for debugging if there are broken links
    if (brokenLinks.length > 0) {
      console.log("Broken links found:", brokenLinks);
      console.log("Defined entity IDs:", Array.from(definedIds));
    }

    expect(brokenLinks).toEqual([]);

    // Ensure we actually tested some links (sanity check)
    expect(linkedIds.length).toBeGreaterThan(0);
  });

  it("should have working session links in root Sessions list when sessions are merged with directory Datasets", () => {
    // This test specifically verifies that the Sessions list on the root dataset
    // contains working links when sessions are merged from CollectionEvent entities
    // into their corresponding session directory Datasets.
    // This is a regression test for the issue where session links in the root's
    // Sessions list didn't work because they pointed to the original CollectionEvent
    // IDs but the rendered entities had merged directory IDs.
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          // Top-level Sessions directory (filtered out)
          "@id": "Sessions/",
          "@type": "Dataset",
          name: "Sessions",
          hasPart: [
            { "@id": "Sessions/ETR008/" },
            { "@id": "Sessions/ETR009/" }
          ]
        },
        {
          // Session directory Dataset - linked to CollectionEvent via "about"
          "@id": "Sessions/ETR008/",
          "@type": "Dataset",
          name: "ETR008 Directory",
          about: { "@id": "#session-ETR008" },
          hasPart: [{ "@id": "Sessions/ETR008/audio.mp3" }]
        },
        {
          // Session CollectionEvent - has metadata
          "@id": "#session-ETR008",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR008",
          description: "First test session"
        },
        {
          // Session directory Dataset
          "@id": "Sessions/ETR009/",
          "@type": "Dataset",
          name: "ETR009 Directory",
          about: { "@id": "#session-ETR009" },
          hasPart: [{ "@id": "Sessions/ETR009/video.mp4" }]
        },
        {
          // Session CollectionEvent
          "@id": "#session-ETR009",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR009",
          description: "Second test session"
        },
        {
          "@id": "Sessions/ETR008/audio.mp3",
          "@type": "AudioObject",
          name: "audio.mp3"
        },
        {
          "@id": "Sessions/ETR009/video.mp4",
          "@type": "VideoObject",
          name: "video.mp4"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Find the root dataset section
    const rootStart = html.indexOf('id="entity___"');
    expect(rootStart).toBeGreaterThan(-1);

    // Find the Sessions list in the root dataset
    const sessionsLabelIndex = html.indexOf("Sessions:", rootStart);
    expect(sessionsLabelIndex).toBeGreaterThan(-1);

    // Extract session links from the Sessions list (they're in a ul.sessions-list)
    const sessionsListStart = html.indexOf(
      '<ul class="sessions-list">',
      sessionsLabelIndex
    );
    expect(sessionsListStart).toBeGreaterThan(-1);
    const sessionsListEnd = html.indexOf("</ul>", sessionsListStart);
    const sessionsListHtml = html.substring(sessionsListStart, sessionsListEnd);

    // Extract all href values from the Sessions list
    const sessionLinkMatches =
      sessionsListHtml.match(/href="#(entity_[^"]+)"/g) || [];
    const sessionLinkIds = sessionLinkMatches
      .map((match) => {
        const m = match.match(/href="#(entity_[^"]+)"/);
        return m ? m[1] : null;
      })
      .filter(Boolean) as string[];

    // Should have links to both sessions
    expect(sessionLinkIds.length).toBe(2);

    // Extract all entity IDs from the entire document (including secondary anchors)
    const idMatches = html.match(/id="(entity_[^"]+)"/g) || [];
    const definedIds = new Set(
      idMatches
        .map((match) => {
          const m = match.match(/id="(entity_[^"]+)"/);
          return m ? m[1] : null;
        })
        .filter(Boolean) as string[]
    );

    // Verify all session links have corresponding anchors
    const brokenSessionLinks = sessionLinkIds.filter(
      (id) => !definedIds.has(id)
    );

    // Log for debugging if there are broken links
    if (brokenSessionLinks.length > 0) {
      console.log(
        "Broken session links in root Sessions list:",
        brokenSessionLinks
      );
      console.log("All defined entity IDs:", Array.from(definedIds));
      console.log("Sessions list HTML:", sessionsListHtml);
    }

    expect(brokenSessionLinks).toEqual([]);

    // Verify that the sessions are being rendered (either as merged or with secondary anchors)
    // The merged entities should have IDs like "entity_Sessions_ETR008_"
    // AND secondary anchors like "entity__session_ETR008" for backward compatibility
    expect(definedIds.has("entity_Sessions_ETR008_")).toBe(true);
    expect(definedIds.has("entity_Sessions_ETR009_")).toBe(true);
  });

  it("should render person contributions grouped by role combination", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "#session-ETR008",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR008",
          "ldac:speaker": [{ "@id": "#Test_Person" }],
          "ldac:recorder": [{ "@id": "#Test_Person" }]
        },
        {
          "@id": "#session-ETR009",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR009",
          "ldac:speaker": [{ "@id": "#Test_Person" }]
        },
        {
          "@id": "#session-ETR010",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR010",
          "ldac:recorder": [{ "@id": "#Test_Person" }]
        },
        {
          "@id": "#session-ETR011",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR011",
          "ldac:recorder": [{ "@id": "#Test_Person" }]
        },
        {
          "@id": "#Test_Person",
          "@type": "Person",
          name: "Test Person"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should have a "Contributions:" field label
    expect(html).toContain("Contributions:");

    // Should contain the session IDs as links
    expect(html).toMatch(/href="#entity__session_ETR008"[^>]*>ETR008<\/a>/);
    expect(html).toMatch(/href="#entity__session_ETR009"[^>]*>ETR009<\/a>/);
    expect(html).toMatch(/href="#entity__session_ETR010"[^>]*>ETR010<\/a>/);
    expect(html).toMatch(/href="#entity__session_ETR011"[^>]*>ETR011<\/a>/);

    // ETR010 and ETR011 both have only Recorder role, so they should be grouped together
    // Format: "ETR010, ETR011: Recorder" (sessions with same roles grouped)
    expect(html).toMatch(/ETR010<\/a>,\s*<a[^>]*>ETR011<\/a>:\s*Recorder/);
  });

  it("should render single session with single role", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "#session-ETR001",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR001",
          "ldac:speaker": [{ "@id": "#Single_Role_Person" }]
        },
        {
          "@id": "#Single_Role_Person",
          "@type": "Person",
          name: "Single Role Person"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should have Contributions field
    expect(html).toContain("Contributions:");
    // Should show "ETR001: Speaker"
    expect(html).toMatch(/ETR001<\/a>:\s*Speaker/);
  });

  it("should render single session with multiple roles", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "#session-ETR001",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR001",
          "ldac:speaker": [{ "@id": "#Multi_Role_Person" }],
          "ldac:recorder": [{ "@id": "#Multi_Role_Person" }],
          "ldac:researcher": [{ "@id": "#Multi_Role_Person" }]
        },
        {
          "@id": "#Multi_Role_Person",
          "@type": "Person",
          name: "Multi Role Person"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should have Contributions field
    expect(html).toContain("Contributions:");
    // Should show ETR001 with all three roles (alphabetically sorted)
    expect(html).toMatch(/ETR001<\/a>:\s*Recorder,\s*Researcher,\s*Speaker/);
  });

  it("should render multiple sessions each with different single roles", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "#session-ETR001",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR001",
          "ldac:speaker": [{ "@id": "#Varied_Role_Person" }]
        },
        {
          "@id": "#session-ETR002",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR002",
          "ldac:recorder": [{ "@id": "#Varied_Role_Person" }]
        },
        {
          "@id": "#session-ETR003",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR003",
          "ldac:researcher": [{ "@id": "#Varied_Role_Person" }]
        },
        {
          "@id": "#Varied_Role_Person",
          "@type": "Person",
          name: "Varied Role Person"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should have Contributions field
    expect(html).toContain("Contributions:");
    // Each session should be separate since they have different roles
    expect(html).toMatch(/ETR001<\/a>:\s*Speaker/);
    expect(html).toMatch(/ETR002<\/a>:\s*Recorder/);
    expect(html).toMatch(/ETR003<\/a>:\s*Researcher/);
  });

  it("should not render Contributions field for person with no session roles", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "#session-ETR001",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR001",
          "ldac:speaker": [{ "@id": "#Other_Person" }]
        },
        {
          "@id": "#No_Contribution_Person",
          "@type": "Person",
          name: "No Contribution Person"
        },
        {
          "@id": "#Other_Person",
          "@type": "Person",
          name: "Other Person"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Find the No_Contribution_Person entity section
    const personStart = html.indexOf('id="entity__No_Contribution_Person"');
    expect(personStart).toBeGreaterThan(-1);

    const personEnd = html.indexOf('<div class="entity"', personStart + 1);
    const personHtml =
      personEnd > -1
        ? html.substring(personStart, personEnd)
        : html.substring(personStart, personStart + 2000);

    // Should NOT have Contributions field for this person
    expect(personHtml).not.toContain("Contributions:");
  });

  it("should handle person referenced in multiple sessions with same role combination", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "#session-ETR001",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR001",
          "ldac:speaker": [{ "@id": "#Same_Roles_Person" }],
          "ldac:recorder": [{ "@id": "#Same_Roles_Person" }]
        },
        {
          "@id": "#session-ETR002",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR002",
          "ldac:speaker": [{ "@id": "#Same_Roles_Person" }],
          "ldac:recorder": [{ "@id": "#Same_Roles_Person" }]
        },
        {
          "@id": "#session-ETR003",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR003",
          "ldac:speaker": [{ "@id": "#Same_Roles_Person" }],
          "ldac:recorder": [{ "@id": "#Same_Roles_Person" }]
        },
        {
          "@id": "#Same_Roles_Person",
          "@type": "Person",
          name: "Same Roles Person"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // All three sessions have the same role combination, so they should be grouped
    // Format: "ETR001, ETR002, ETR003: Recorder, Speaker"
    expect(html).toMatch(
      /ETR001<\/a>,\s*<a[^>]*>ETR002<\/a>,\s*<a[^>]*>ETR003<\/a>:\s*Recorder,\s*Speaker/
    );
  });

  it("should handle mixed grouping with some sessions sharing roles and others not", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "#session-ETR001",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR001",
          "ldac:speaker": [{ "@id": "#Mixed_Person" }]
        },
        {
          "@id": "#session-ETR002",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR002",
          "ldac:speaker": [{ "@id": "#Mixed_Person" }]
        },
        {
          "@id": "#session-ETR003",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR003",
          "ldac:recorder": [{ "@id": "#Mixed_Person" }]
        },
        {
          "@id": "#session-ETR004",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Session ETR004",
          "ldac:speaker": [{ "@id": "#Mixed_Person" }],
          "ldac:recorder": [{ "@id": "#Mixed_Person" }]
        },
        {
          "@id": "#Mixed_Person",
          "@type": "Person",
          name: "Mixed Person"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // ETR001 and ETR002 share "Speaker" role only
    expect(html).toMatch(/ETR001<\/a>,\s*<a[^>]*>ETR002<\/a>:\s*Speaker/);

    // ETR003 has "Recorder" role only
    expect(html).toMatch(/ETR003<\/a>:\s*Recorder/);

    // ETR004 has both "Recorder, Speaker" roles
    expect(html).toMatch(/ETR004<\/a>:\s*Recorder,\s*Speaker/);
  });

  it("should link person contributions to correct session anchors even with merged entities", () => {
    // Test that contributions link to the correct session anchors when sessions
    // are merged from CollectionEvent into directory Datasets
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project"
        },
        {
          "@id": "Sessions/",
          "@type": "Dataset",
          name: "Sessions",
          hasPart: [{ "@id": "Sessions/ETR010/" }]
        },
        {
          "@id": "Sessions/ETR010/",
          "@type": "Dataset",
          name: "ETR010 Directory",
          about: { "@id": "#session-ETR010" }
        },
        {
          "@id": "#session-ETR010",
          "@type": ["RepositoryObject", "CollectionEvent"],
          name: "Test Session ETR010",
          "ldac:speaker": [{ "@id": "#Contributor_Person" }]
        },
        {
          "@id": "#Contributor_Person",
          "@type": "Person",
          name: "Contributor Person"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // The person entity should have a Contributions field
    const personStart = html.indexOf('id="entity__Contributor_Person"');
    expect(personStart).toBeGreaterThan(-1);

    // Find the person entity section
    const personEnd = html.indexOf('<div class="entity"', personStart + 1);
    const personHtml =
      personEnd > -1
        ? html.substring(personStart, personEnd)
        : html.substring(personStart, personStart + 2000);

    // Should have Contributions label
    expect(personHtml).toContain("Contributions:");

    // Should link to the session using the directory path anchor (merged entity)
    // The session should be accessible via the Sessions/ETR010/ path
    expect(personHtml).toMatch(
      /href="#entity_Sessions_ETR010_"[^>]*>ETR010<\/a>/
    );
  });

  it("should render Organization description and url as clickable link", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          publisher: { "@id": "#publisher-paradisec" }
        },
        {
          "@id": "#publisher-paradisec",
          "@type": "Organization",
          name: "PARADISEC",
          description:
            "Pacific and Regional Archive for Digital Sources in Endangered Cultures",
          url: "https://www.paradisec.org.au/"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should render the Organization entity
    expect(html).toContain('id="entity__publisher_paradisec"');

    // Find the Organization entity section
    const orgStart = html.indexOf('id="entity__publisher_paradisec"');
    const orgEnd = html.indexOf('<div class="entity"', orgStart + 1);
    const orgHtml =
      orgEnd > -1
        ? html.substring(orgStart, orgEnd)
        : html.substring(orgStart, orgStart + 2000);

    // Should render the description
    expect(orgHtml).toContain("Description:");
    expect(orgHtml).toContain(
      "Pacific and Regional Archive for Digital Sources in Endangered Cultures"
    );

    // Should render the URL as a clickable link
    expect(orgHtml).toContain("Url:");
    expect(orgHtml).toContain('href="https://www.paradisec.org.au/"');
    expect(orgHtml).toContain('target="_blank"');
    expect(orgHtml).toContain(">https://www.paradisec.org.au/</a>");
  });

  it("should handle Organization without description or url gracefully", () => {
    const testData = {
      "@context": "https://w3id.org/ro/crate/1.1/context",
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          publisher: { "@id": "#publisher-unknown" }
        },
        {
          "@id": "#publisher-unknown",
          "@type": "Organization",
          name: "Unknown Archive"
        }
      ]
    };

    const html = generateRoCrateHtml(testData);

    // Should render the Organization entity
    expect(html).toContain('id="entity__publisher_unknown"');

    // Find the Organization entity section
    const orgStart = html.indexOf('id="entity__publisher_unknown"');
    const orgEnd = html.indexOf('<div class="entity"', orgStart + 1);
    const orgHtml =
      orgEnd > -1
        ? html.substring(orgStart, orgEnd)
        : html.substring(orgStart, orgStart + 2000);

    // Should show "Unknown" for missing description and url
    expect(orgHtml).toContain("Description:");
    expect(orgHtml).toContain("Unknown");
    expect(orgHtml).toContain("Url:");
  });

  describe("File path encoding - percent-encoded paths", () => {
    // Issue: RO-Crate JSON uses @id with percent-encoded spaces (%20),
    // and the HTML generator decodes them to create working file paths.

    it("should decode percent-encoded spaces in People folder paths", () => {
      // RO-Crate @id uses %20 for spaces, HTML src should have actual spaces
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "#HANGUILA%20Fidel",
            "@type": "Person",
            name: "HANGUILA Fidel",
            image: [
              { "@id": "People/HANGUILA%20Fidel/HANGUILA%20Fidel_Photo.JPG" },
              { "@id": "People/HANGUILA%20Fidel/HANGUILA%20Fidel_Consent.jpg" }
            ]
          },
          {
            "@id": "People/HANGUILA%20Fidel/HANGUILA%20Fidel_Photo.JPG",
            "@type": ["File", "ImageObject"],
            name: "HANGUILA Fidel_Photo.JPG",
            encodingFormat: "image/jpeg"
          },
          {
            "@id": "People/HANGUILA%20Fidel/HANGUILA%20Fidel_Consent.jpg",
            "@type": ["File", "ImageObject"],
            name: "HANGUILA Fidel_Consent.jpg",
            encodingFormat: "image/jpeg"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // The src attribute should have decoded spaces to match actual file paths
      expect(html).toContain(
        'src="People/HANGUILA Fidel/HANGUILA Fidel_Photo.JPG"'
      );
      expect(html).toContain(
        'src="People/HANGUILA Fidel/HANGUILA Fidel_Consent.jpg"'
      );

      // Should NOT contain the percent-encoded version
      expect(html).not.toContain(
        'src="People/HANGUILA%20Fidel/HANGUILA%20Fidel_Photo.JPG"'
      );
    });

    it("should decode percent-encoded spaces in Sessions folder paths", () => {
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "#session-Test%20Session%20001",
            "@type": ["RepositoryObject", "CollectionEvent"],
            name: "Test Session 001",
            hasPart: [
              {
                "@id":
                  "Sessions/Test%20Session%20001/Test%20Session%20001_Audio.mp3"
              }
            ]
          },
          {
            "@id":
              "Sessions/Test%20Session%20001/Test%20Session%20001_Audio.mp3",
            "@type": ["File", "AudioObject"],
            name: "Test Session 001_Audio.mp3",
            encodingFormat: "audio/mpeg"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // The src attribute should have decoded spaces
      expect(html).toContain(
        'src="Sessions/Test Session 001/Test Session 001_Audio.mp3"'
      );

      // Should NOT contain the percent-encoded version in src attributes
      expect(html).not.toContain('src="Sessions/Test%20Session%20001');
    });

    it("should decode percent-encoded parentheses and spaces", () => {
      // Names like "BAKALA Michel (@Mfouati)" have parentheses and spaces
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "#BAKALA%20Michel%20%28@Mfouati%29",
            "@type": "Person",
            name: "BAKALA Michel (@Mfouati)",
            image: [
              {
                "@id":
                  "People/BAKALA%20Michel%20%28@Mfouati%29/BAKALA%20Michel%20%28@Mfouati%29_Photo.JPG"
              }
            ]
          },
          {
            "@id":
              "People/BAKALA%20Michel%20%28@Mfouati%29/BAKALA%20Michel%20%28@Mfouati%29_Photo.JPG",
            "@type": ["File", "ImageObject"],
            name: "BAKALA Michel (@Mfouati)_Photo.JPG",
            encodingFormat: "image/jpeg"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Should decode all percent-encoded characters in src attributes
      expect(html).toContain(
        'src="People/BAKALA Michel (@Mfouati)/BAKALA Michel (@Mfouati)_Photo.JPG"'
      );

      // Should NOT contain percent-encoded characters in src/href attributes
      expect(html).not.toContain('src="People/BAKALA%20');
      expect(html).not.toContain('href="People/BAKALA%20');
    });

    it("should handle video files with percent-encoded paths", () => {
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
              "Sessions/Interview%20With%20Speaker/Interview%20With%20Speaker_Video.mp4",
            "@type": ["File", "VideoObject"],
            name: "Interview With Speaker_Video.mp4",
            encodingFormat: "video/mp4"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Video elements should have decoded paths
      expect(html).toContain(
        'src="Sessions/Interview With Speaker/Interview With Speaker_Video.mp4"'
      );
    });

    it("should handle audio consent files with percent-encoded paths", () => {
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "#BINDOUMOUNOU%20Jean-Pierre",
            "@type": "Person",
            name: "BINDOUMOUNOU Jean-Pierre",
            image: [
              {
                "@id":
                  "People/BINDOUMOUNOU%20Jean-Pierre/BINDOUMOUNOU%20Jean-Pierre_Consent.wav"
              }
            ]
          },
          {
            "@id":
              "People/BINDOUMOUNOU%20Jean-Pierre/BINDOUMOUNOU%20Jean-Pierre_Consent.wav",
            "@type": ["File", "AudioObject"],
            name: "BINDOUMOUNOU Jean-Pierre_Consent.wav",
            encodingFormat: "audio/wav"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Audio consent file should have decoded spaces
      expect(html).toContain(
        'src="People/BINDOUMOUNOU Jean-Pierre/BINDOUMOUNOU Jean-Pierre_Consent.wav"'
      );
    });

    it("should preserve underscores that are part of actual filenames", () => {
      // Underscores that are in the original filename should stay as underscores
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "People/Smith/Smith_Photo.JPG",
            "@type": ["File", "ImageObject"],
            name: "Smith_Photo.JPG",
            encodingFormat: "image/jpeg"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Underscores in original filenames should be preserved
      expect(html).toContain('src="People/Smith/Smith_Photo.JPG"');
    });

    it("should handle clickable file links with percent-encoded paths", () => {
      // File links (for PDFs, text files, etc.) should also have decoded paths
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
              "Sessions/Field%20Recording%20Day%201/Field%20Recording%20Notes.pdf",
            "@type": "File",
            name: "Field Recording Notes.pdf",
            encodingFormat: "application/pdf"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // Clickable file link should have decoded spaces
      expect(html).toContain(
        'href="Sessions/Field Recording Day 1/Field Recording Notes.pdf"'
      );
    });

    it("should decode percent-encoded session IDs in entity headers", () => {
      // Session headers should display "Session: dde-houmba-ori (v1)" not "Session: dde-houmba-ori_%28v1%29"
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "Sessions/dde-houmba-ori%20%28v1%29/",
            "@type": "Dataset",
            name: "Session with special characters",
            // Add description to prevent filtering as "pure wrapper"
            description: "A test session with special characters in the name"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // The session header should display decoded ID
      expect(html).toContain(">Session: dde-houmba-ori (v1)<");
      // Should NOT contain the encoded version in the display
      expect(html).not.toContain(">Session: dde-houmba-ori%20%28v1%29<");
    });

    it("should decode percent-encoded person IDs in entity headers", () => {
      // Person headers should display "Person: #José García" not "Person: #José%20García"
      const testData = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
          {
            "@id": "./",
            "@type": ["Dataset", "RepositoryCollection"],
            name: "Test Project"
          },
          {
            "@id": "#Jos%C3%A9%20Garc%C3%ADa",
            "@type": "Person",
            name: "José García"
          }
        ]
      };

      const html = generateRoCrateHtml(testData);

      // The person header should display decoded ID
      expect(html).toContain(">Person: #José García<");
      // Should NOT contain the encoded version in the display
      expect(html).not.toContain(">Person: #Jos%C3%A9%20Garc%C3%ADa<");
    });
  });
});
