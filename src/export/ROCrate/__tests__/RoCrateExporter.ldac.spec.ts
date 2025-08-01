import { vi, describe, it, beforeEach, expect } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Session } from "../../../model/Project/Session/Session";
import { Project } from "../../../model/Project/Project";
import { Person } from "../../../model/Project/Person/Person";
import { FieldDefinition } from "../../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../../model/field/ConfiguredFieldDefinitions";

// Mock fs-extra and other dependencies
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date("2023-01-01T00:00:00Z")
  })
}));

vi.mock("../../../languageFinder/LanguageFinder", () => ({
  staticLanguageFinder: {
    findOneLanguageNameFromCode_Or_ReturnCode: vi
      .fn()
      .mockImplementation((code: string) => {
        const languageMap: { [key: string]: string } = {
          etr: "Edolo",
          tpi: "Tok Pisin",
          hui: "Huli"
        };
        return languageMap[code] || `Language ${code}`;
      })
  }
}));

describe("RoCrateExporter LDAC Profile Compliance", () => {
  let mockProject: Project;
  let mockSession: Session;
  let mockPerson: Person;

  beforeEach(() => {
    // Mock field definitions for LDAC tests
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      [
        {
          key: "languages",
          persist: true,
          type: "languageChoices",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          rocrate: {
            key: "ldac:subjectLanguage",
            handler: "languages",
            array: true
          }
        } as FieldDefinition
      ]
    );

    vi.spyOn(fieldDefinitionsOfCurrentConfig, "common", "get").mockReturnValue([
      {
        key: "person",
        rocrate: {
          template: {
            "@id": "[v]",
            "@type": "Person"
          }
        }
      } as FieldDefinition,
      {
        key: "language",
        rocrate: {
          template: {
            "@id": "[code]",
            "@type": "Language",
            name: "[languageName]"
          }
        }
      } as FieldDefinition
    ]);

    // Create enhanced mocks following the original pattern
    mockPerson = {
      filePrefix: "Awi_Heole",
      directory: "/people/Awi_Heole",
      getIdToUseForReferences: () => "Awi_Heole",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "name") return "Awi Heole";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: []
    } as any;

    mockSession = {
      filePrefix: "ETR009",
      directory: "/sessions/ETR009",
      knownFields: [
        {
          key: "languages",
          persist: true,
          type: "languageChoices",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          rocrate: {
            key: "ldac:subjectLanguage",
            handler: "languages",
            array: true
          }
        } as FieldDefinition
      ],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title")
            return "The story behind how we catch fish with poison bark";
          if (key === "description") return "Some guys talking";
          if (key === "date") return "2010-06-06";
          if (key === "location") return "huya";
          if (key === "keyword") return "fishing, poison";
          if (key === "access") return "F: Free to All";
          if (key === "languages") return "etr: Edolo;tpi: Tok Pisin";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockImplementation((key: string) => {
            return key === "languages";
          }),
          getTextStringOrEmpty: vi.fn().mockImplementation((key: string) => {
            if (key === "languages") return "etr: Edolo;tpi: Tok Pisin";
            return "";
          }),
          forEach: vi.fn()
        }
      },
      files: [],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as any;

    mockProject = {
      filePrefix: "Edolo_sample",
      directory: "/project",
      sessions: {
        items: [mockSession]
      },
      findPerson: vi.fn(),
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Edolo Language Documentation";
          if (key === "description")
            return "Documentation of the Edolo language";
          if (key === "archiveConfigurationName") return "TestArchive";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [],
      knownFields: [],
      authorityLists: {
        accessChoicesOfCurrentProtocol: []
      }
    } as any;

    // Set up session contributions for LDAC role tests
    mockSession.getAllContributionsToAllFiles = vi.fn().mockReturnValue([
      {
        personReference: "Awi_Heole",
        role: "speaker"
      }
    ]);

    // Set up project person finder
    mockProject.findPerson = vi.fn().mockImplementation((name: string) => {
      if (name === "Awi_Heole") return mockPerson;
      return null;
    });

    // Add comprehensive LDAC access choices for access tests
    (mockProject as any).authorityLists.accessChoicesOfCurrentProtocol = [
      {
        id: "F",
        label: "F: Free to All",
        description: "access is Free to all",
        ldacAccessCategory: "ldac:OpenAccess"
      } as any,
      {
        id: "U",
        label: "U: All Registered Users",
        description: "all Users can access (requires registration)",
        ldacAccessCategory: "ldac:AuthorizedAccess"
      } as any,
      {
        id: "C",
        label: "C: Community members only",
        description: "only Community members are allowed access",
        ldacAccessCategory: "ldac:AuthorizedAccess"
      } as any
    ];

    // Set up archive configuration for license tests - use non-null assertion
    (mockProject.metadataFile as any).getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Edolo Language Documentation";
        if (key === "description") return "Documentation of the Edolo language";
        if (key === "archiveConfigurationName") return "TestArchive";
        return "";
      });

    // Set up the correct prototypes for instanceof checks
    Object.setPrototypeOf(mockProject, Project.prototype);
    Object.setPrototypeOf(mockSession, Session.prototype);
    Object.setPrototypeOf(mockPerson, Person.prototype);
  });

  describe("LDAC Event Structure", () => {
    it("should create a Session Event entity as the central hub", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/ETR009/" && item["@type"].includes("Event")
      );

      expect(sessionEvent).toBeDefined();
      expect(sessionEvent["@type"]).toEqual([
        "Dataset",
        "pcdm:RepositoryObject",
        "Event"
      ]);
      expect(sessionEvent.name).toBe(
        "The story behind how we catch fish with poison bark"
      );
      expect(sessionEvent.description).toBe("Some guys talking");
      expect(sessionEvent.startDate).toBe("2010-06-06");
    });

    it("should link Session Event to participants via LDAC role properties", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/ETR009/" && item["@type"].includes("Event")
      );

      // Should NOT use generic participant property
      expect(sessionEvent.participant).toBeUndefined();

      // Should use specific LDAC role properties
      expect(sessionEvent["ldac:speaker"]).toEqual([
        {
          "@id": "People/Awi_Heole/"
        }
      ]);
    });

    it("should link Session Event to all its files", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/ETR009/" && item["@type"].includes("Event")
      );

      expect(sessionEvent.hasPart).toBeDefined();
      expect(Array.isArray(sessionEvent.hasPart)).toBe(true);
    });

    it("should establish bidirectional pcdm:memberOf relationship between sessions and root collection", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      // Verify root dataset has pcdm:hasMember pointing to sessions
      const rootDataset = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );
      expect(rootDataset["pcdm:hasMember"]).toContainEqual({
        "@id": "Sessions/ETR009/"
      });

      // Verify session has pcdm:memberOf pointing back to root collection
      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/ETR009/" && item["@type"].includes("Event")
      );
      expect(sessionEvent["pcdm:memberOf"]).toEqual({ "@id": "./" });
    });
  });

  describe("LDAC Person and Place Entities", () => {
    it("should use proper Person IDs with folder paths", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const personEntity = result["@graph"].find(
        (item: any) =>
          item["@id"] === "People/Awi_Heole/" && item["@type"] === "Person"
      );

      expect(personEntity).toBeDefined();
    });

    it("should create Place entity when location is specified", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const placeEntity = result["@graph"].find(
        (item: any) => item["@id"] === "#huya" && item["@type"] === "Place"
      );

      expect(placeEntity).toBeDefined();
      expect(placeEntity.name).toBe("huya");

      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/ETR009/" && item["@type"].includes("Event")
      );
      expect(sessionEvent.location).toEqual({ "@id": "#huya" });
    });
  });

  describe("LDAC Material Types", () => {
    it("should include LDAC material type definitions in the graph", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      // Check that MaterialTypes term set exists
      const materialTypesSet = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:MaterialTypes"
      );
      expect(materialTypesSet).toBeDefined();
      expect(materialTypesSet["@type"]).toBe("DefinedTermSet");
      expect(materialTypesSet.name).toBe("Material Types");

      // Check that PrimaryMaterial definition exists
      const primaryMaterial = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:PrimaryMaterial"
      );
      expect(primaryMaterial).toBeDefined();
      expect(primaryMaterial["@type"]).toBe("DefinedTerm");
      expect(primaryMaterial.name).toBe("Primary Material");
      expect(primaryMaterial.description).toBe(
        "The object of study, such as a literary work, film, or recording of natural discourse."
      );
      expect(primaryMaterial.inDefinedTermSet).toEqual({
        "@id": "ldac:MaterialTypes"
      });

      // Check that Annotation definition exists
      const annotation = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:Annotation"
      );
      expect(annotation).toBeDefined();
      expect(annotation["@type"]).toBe("DefinedTerm");
      expect(annotation.name).toBe("Annotation");
      expect(annotation.description).toBe(
        "The resource includes material that adds information to some other linguistic record."
      );
      expect(annotation.inDefinedTermSet).toEqual({
        "@id": "ldac:MaterialTypes"
      });
    });

    it("should include LDAC material type definitions in standalone session export", async () => {
      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Check that material type definitions are present even in standalone session export
      const materialTypesSet = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:MaterialTypes"
      );
      expect(materialTypesSet).toBeDefined();
      expect(materialTypesSet["@type"]).toBe("DefinedTermSet");
      expect(materialTypesSet.name).toBe("Material Types");

      const primaryMaterial = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:PrimaryMaterial"
      );
      expect(primaryMaterial).toBeDefined();

      const annotation = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:Annotation"
      );
      expect(annotation).toBeDefined();
    });

    it("should use proper materialType structure with @id for files", async () => {
      // Add mock files to the session
      const audioFile = {
        getActualFilePath: () => "/sessions/ETR009/ETR009_Careful.mp3",
        getModifiedDate: () => new Date("2023-01-01"),
        pathInFolderToLinkFileOrLocalCopy: "ETR009_Careful.mp3"
      } as any;

      const xmlFile = {
        getActualFilePath: () => "/sessions/ETR009/ETR009.xml",
        getModifiedDate: () => new Date("2023-01-01"),
        pathInFolderToLinkFileOrLocalCopy: "ETR009.xml"
      } as any;

      // Add files to the session
      mockSession.files = [audioFile, xmlFile];

      const result = (await getRoCrate(mockProject, mockProject)) as any;

      // Find the audio file entity
      const audioFileEntity = result["@graph"].find(
        (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Careful.mp3"
      );
      expect(audioFileEntity).toBeDefined();
      expect(audioFileEntity["ldac:materialType"]).toEqual({
        "@id": "ldac:PrimaryMaterial"
      });

      // Find the XML file entity
      const xmlFileEntity = result["@graph"].find(
        (item: any) => item["@id"] === "Sessions/ETR009/ETR009.xml"
      );
      expect(xmlFileEntity).toBeDefined();
      expect(xmlFileEntity["ldac:materialType"]).toEqual({
        "@id": "ldac:Annotation"
      });

      // Verify that the material type definitions are referenced by the files
      const primaryMaterialDef = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:PrimaryMaterial"
      );
      expect(primaryMaterialDef).toBeDefined();

      const annotationDef = result["@graph"].find(
        (item: any) =>
          item["@id"] === "ldac:Annotation" && item["@type"] === "DefinedTerm"
      );
      expect(annotationDef).toBeDefined();
    });
  });

  describe("LDAC Access Control", () => {
    it("should create LDAC-compliant license with OpenAccess for open access", async () => {
      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Find the license entry (normalized)
      const license = result["@graph"].find(
        (item: any) => item["@id"] === "#license-testarchive-f"
      );

      expect(license).toBeDefined();
      expect(license["@type"]).toBe("ldac:DataReuseLicense");
      expect(license["ldac:access"]).toEqual({ "@id": "ldac:OpenAccess" });
      expect(license.description).toContain("TestArchive-specific term");
      expect(license.description).toContain("'F: Free to All'");
      expect(license.description).toContain("'access is Free to all'");
    });

    it("should create LDAC-compliant license with AuthorizedAccess for restricted access", async () => {
      // Change the access to restricted
      (mockSession.metadataFile as any).getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title")
            return "The story behind how we catch fish with poison bark";
          if (key === "description") return "Some guys talking";
          if (key === "date") return "2010-06-06";
          if (key === "location") return "huya";
          if (key === "keyword") return "fishing, poison";
          if (key === "access") return "U: All Registered Users";
          if (key === "languages") return "etr: Edolo;tpi: Tok Pisin";
          return "";
        });

      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Find the license entry (normalized)
      const license = result["@graph"].find(
        (item: any) => item["@id"] === "#license-testarchive-u"
      );

      expect(license).toBeDefined();
      expect(license["@type"]).toBe("ldac:DataReuseLicense");
      expect(license["ldac:access"]).toEqual({
        "@id": "ldac:AuthorizedAccess"
      });
      expect(license.description).toContain("TestArchive-specific term");
      expect(license.description).toContain("'U: All Registered Users'");
      expect(license.description).toContain(
        "'all Users can access (requires registration)'"
      );
    });

    it("should include LDAC access type definitions in the graph", async () => {
      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Check for LDAC access type definitions
      const accessTypes = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:AccessTypes"
      );
      expect(accessTypes).toBeDefined();
      expect(accessTypes["@type"]).toBe("DefinedTermSet");
      expect(accessTypes.name).toBe("Access Types");

      const openAccess = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:OpenAccess"
      );
      expect(openAccess).toBeDefined();
      expect(openAccess["@type"]).toBe("DefinedTerm");
      expect(openAccess.name).toBe("Open Access");
      expect(openAccess.inDefinedTermSet).toEqual({
        "@id": "ldac:AccessTypes"
      });

      const authorizedAccess = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:AuthorizedAccess"
      );
      expect(authorizedAccess).toBeDefined();
      expect(authorizedAccess["@type"]).toBe("DefinedTerm");
      expect(authorizedAccess.name).toBe("Authorized Access");

      const dataReuseLicense = result["@graph"].find(
        (item: any) => item["@id"] === "ldac:DataReuseLicense"
      );
      expect(dataReuseLicense).toBeDefined();
      expect(dataReuseLicense["@type"]).toBe("Class");
      expect(dataReuseLicense.subClassOf).toEqual({
        "@id": "http://schema.org/CreativeWork"
      });
    });

    it("should default to OpenAccess for unspecified access", async () => {
      // Set access to unspecified
      (mockSession.metadataFile as any).getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title")
            return "The story behind how we catch fish with poison bark";
          if (key === "description") return "Some guys talking";
          if (key === "date") return "2010-06-06";
          if (key === "location") return "huya";
          if (key === "keyword") return "fishing, poison";
          if (key === "access") return "";
          if (key === "languages") return "etr: Edolo;tpi: Tok Pisin";
          return "";
        });

      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Find the license entry (normalized - unspecified becomes "public")
      const license = result["@graph"].find(
        (item: any) => item["@id"] === "#license-testarchive-public"
      );

      expect(license).toBeDefined();
      expect(license["ldac:access"]).toEqual({ "@id": "ldac:OpenAccess" });
    });

    it("should fall back to AuthorizedAccess if ldacAccessCategory is missing", async () => {
      // Update mock to not have ldacAccessCategory
      (mockProject as any).authorityLists.accessChoicesOfCurrentProtocol = [
        {
          id: "X",
          label: "X: Unknown Access",
          description: "some access without ldacAccessCategory"
        }
      ];

      (mockSession.metadataFile as any).getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title")
            return "The story behind how we catch fish with poison bark";
          if (key === "description") return "Some guys talking";
          if (key === "date") return "2010-06-06";
          if (key === "location") return "huya";
          if (key === "keyword") return "fishing, poison";
          if (key === "access") return "X: Unknown Access";
          if (key === "languages") return "etr: Edolo;tpi: Tok Pisin";
          return "";
        });

      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Find the license entry (normalized)
      const license = result["@graph"].find(
        (item: any) => item["@id"] === "#license-testarchive-x"
      );

      expect(license).toBeDefined();
      expect(license["ldac:access"]).toEqual({
        "@id": "ldac:AuthorizedAccess"
      });
    });
  });

  describe("LDAC Subject Language Formatting", () => {
    it("should format ldac:subjectLanguage as array of objects with @id properties", async () => {
      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Find the main session entry
      const sessionEntry = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );

      expect(sessionEntry["ldac:subjectLanguage"]).toBeDefined();
      expect(Array.isArray(sessionEntry["ldac:subjectLanguage"])).toBe(true);

      // Check that each value is an object with @id property, not a bare string
      sessionEntry["ldac:subjectLanguage"].forEach((item: any) => {
        expect(typeof item).toBe("object");
        expect(item).toHaveProperty("@id");
        expect(typeof item["@id"]).toBe("string");
        expect(item["@id"]).toMatch(/^#language_/);
      });

      // Should have references to both languages
      const languageIds = sessionEntry["ldac:subjectLanguage"].map(
        (item: any) => item["@id"]
      );
      expect(languageIds).toContain("#language_etr");
      expect(languageIds).toContain("#language_tpi");
    });

    it("should not have unreferenced language entities", async () => {
      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Find all language entities
      const languageEntities = result["@graph"].filter(
        (item: any) =>
          item["@type"] === "Language" && item["@id"]?.startsWith("#language_")
      );

      // Find all referenced language IDs
      const referencedLanguageIds = new Set<string>();
      result["@graph"].forEach((item: any) => {
        if (item["ldac:subjectLanguage"]) {
          item["ldac:subjectLanguage"].forEach((ref: any) => {
            if (typeof ref === "string") {
              referencedLanguageIds.add(ref);
            } else if (ref && ref["@id"]) {
              referencedLanguageIds.add(ref["@id"]);
            }
          });
        }
      });

      // Check that all language entities are referenced
      languageEntities.forEach((entity: any) => {
        expect(referencedLanguageIds.has(entity["@id"])).toBe(true);
      });
    });

    it("should handle template-based language fields correctly", async () => {
      // Test a field that uses template instead of handler
      mockSession.knownFields = [
        {
          key: "workingLanguages",
          persist: true,
          type: "languageChoices",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          englishLabel: "Working Languages",
          rocrate: {
            key: "contentLanguages",
            handler: "languages",
            array: true,
            template: { "@id": "#language_[v]" }
          }
        } as any
      ];

      (mockSession.metadataFile as any).getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title")
            return "The story behind how we catch fish with poison bark";
          if (key === "description") return "Some guys talking";
          if (key === "date") return "2010-06-06";
          if (key === "location") return "huya";
          if (key === "keyword") return "fishing, poison";
          if (key === "access") return "F: Free to All";
          if (key === "workingLanguages") return "etr: Edolo;tpi: Tok Pisin";
          return "";
        });

      (mockSession.metadataFile as any).properties.getHasValue = vi
        .fn()
        .mockImplementation((key: string) => {
          return key === "workingLanguages" || key === "languages";
        });

      (mockSession.metadataFile as any).properties.getTextStringOrEmpty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "workingLanguages") return "etr: Edolo;tpi: Tok Pisin";
          if (key === "languages") return "etr: Edolo;tpi: Tok Pisin";
          return "";
        });

      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Find the main session entry
      const sessionEntry = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );

      // The contentLanguages should be properly formatted as objects with @id
      if (sessionEntry["contentLanguages"]) {
        expect(Array.isArray(sessionEntry["contentLanguages"])).toBe(true);
        sessionEntry["contentLanguages"].forEach((item: any) => {
          expect(typeof item).toBe("object");
          expect(item).toHaveProperty("@id");
          expect(typeof item["@id"]).toBe("string");
        });
      }
    });

    it("should format ldac:subjectLanguage as array of objects for template-only fields", async () => {
      // Test a field that uses ONLY template, no handler (reproduces the original issue)
      mockSession.knownFields = [
        {
          key: "testLanguages",
          persist: true,
          type: "languageChoices",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          englishLabel: "Test Languages",
          rocrate: {
            key: "ldac:subjectLanguage",
            // No handler! Only template - this was the problematic case
            array: true,
            template: {
              "@id": "#language_[v]",
              "@type": "Language",
              name: "[languageName]"
            }
          }
        } as any
      ];

      (mockSession.metadataFile as any).getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title")
            return "The story behind how we catch fish with poison bark";
          if (key === "description") return "Some guys talking";
          if (key === "date") return "2010-06-06";
          if (key === "location") return "huya";
          if (key === "keyword") return "fishing, poison";
          if (key === "access") return "F: Free to All";
          if (key === "testLanguages") return "etr: Edolo;tpi: Tok Pisin";
          return "";
        });

      (mockSession.metadataFile as any).properties.getHasValue = vi
        .fn()
        .mockImplementation((key: string) => {
          return key === "testLanguages";
        });

      (mockSession.metadataFile as any).properties.getTextStringOrEmpty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "testLanguages") return "etr: Edolo;tpi: Tok Pisin";
          return "";
        });

      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Find the main session entry
      const sessionEntry = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );

      // This should be fixed now: values should be objects with proper @id references
      if (sessionEntry["ldac:subjectLanguage"]) {
        expect(Array.isArray(sessionEntry["ldac:subjectLanguage"])).toBe(true);

        // Check the format - should be objects with @id properties
        sessionEntry["ldac:subjectLanguage"].forEach((item: any) => {
          expect(typeof item).toBe("object");
          expect(item).toHaveProperty("@id");
          expect(typeof item["@id"]).toBe("string");
          // The @id should be clean language codes, not include the description
          expect(item["@id"]).toMatch(/^#language_[a-z]+$/);
        });

        // Should have separate entries for each language
        expect(sessionEntry["ldac:subjectLanguage"]).toHaveLength(2);
        const languageIds = sessionEntry["ldac:subjectLanguage"].map(
          (item: any) => item["@id"]
        );
        expect(languageIds).toContain("#language_etr");
        expect(languageIds).toContain("#language_tpi");
      }

      // Check that language entities are created and referenced correctly
      const languageEntities = result["@graph"].filter(
        (item: any) =>
          item["@type"] === "Language" && item["@id"]?.startsWith("#language_")
      );

      expect(languageEntities).toHaveLength(2);

      // All language entities should be referenced (no unreferenced entities)
      const referencedLanguageIds = new Set<string>();
      result["@graph"].forEach((item: any) => {
        if (item["ldac:subjectLanguage"]) {
          item["ldac:subjectLanguage"].forEach((ref: any) => {
            if (ref && ref["@id"]) {
              referencedLanguageIds.add(ref["@id"]);
            }
          });
        }
      });

      languageEntities.forEach((entity: any) => {
        expect(referencedLanguageIds.has(entity["@id"])).toBe(true);
      });
    });
  });
});
