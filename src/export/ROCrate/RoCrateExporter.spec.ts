import { vi, describe, it, beforeEach, expect } from "vitest";
import { getRoCrate } from "./RoCrateExporter";
import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import { FieldDefinition } from "../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";

describe("RoCrateExporter genre handling", () => {
  let mockProject: Project;
  let mockSession: Session;

  beforeEach(() => {
    // Mock the field definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      [
        {
          key: "genre",
          englishLabel: "Genre",
          xmlTag: "Genre",
          vocabularyFile: "genres.json",
          tabIndex: 6,
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          rocrate: {
            key: "ldac:linguisticGenre",
            array: true,
            template: {
              "@id": "[v]",
              "@type": "DefinedTerm"
            }
          }
        } as FieldDefinition
      ]
    );

    // Mock common field definitions
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
            "@type": "Language"
          }
        }
      } as FieldDefinition
    ]);

    mockProject = {
      filePrefix: "project1",
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test-Project";
          return "";
        })
      } as any,
      authorityLists: {
        accessChoicesOfCurrentProtocol: [
          {
            label: "public",
            description: "Public access"
          }
        ]
      }
    } as any;

    mockSession = {
      filePrefix: "session1",
      knownFields: [
        {
          key: "genre",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          vocabularyFile: "genres.json",
          rocrate: {
            key: "ldac:linguisticGenre",
            array: true,
            template: {
              "@id": "[v]",
              "@type": "DefinedTerm"
            }
          }
        }
      ],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "description") return "Test Description";
          if (key === "access") return "public";
          if (key === "genre") return "dialog"; // This maps to ldac:Dialogue
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockImplementation((key: string) => {
            if (key === "genre") return true;
            return false;
          }),
          forEach: vi.fn().mockImplementation(() => {
            // Mock forEach to do nothing for custom fields
          })
        }
      },
      files: [],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as any;
  });

  it("should convert LDAC-mappable genre to ldac:linguisticGenre with proper structure", async () => {
    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Check that genre is converted to ldac:linguisticGenre
    expect(sessionEntry).toHaveProperty("ldac:linguisticGenre");
    expect(sessionEntry["ldac:linguisticGenre"]).toEqual([
      { "@id": "ldac:Dialogue" }
    ]);

    // Check that the genre definition is in the graph
    const genreDefinition = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Dialogue"
    );
    expect(genreDefinition).toBeDefined();
    expect(genreDefinition["@type"]).toBe("DefinedTerm");
    expect(genreDefinition.name).toBe("Dialog");
    expect(genreDefinition.description).toContain("interactive discourse");
    expect(genreDefinition.inDefinedTermSet).toEqual({
      "@id": "ldac:LinguisticGenreTerms"
    });

    // Check that the term set is in the graph
    const termSet = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:LinguisticGenreTerms"
    );
    expect(termSet).toBeDefined();
    expect(termSet["@type"]).toBe("DefinedTermSet");
    expect(termSet.name).toBe("Linguistic Genre Terms");
  });

  it("should handle custom genre that doesn't map to LDAC", async () => {
    // Mock a custom genre
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "custom_genre_not_in_ldac";
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Check that genre is converted to ldac:linguisticGenre with custom ID
    expect(sessionEntry).toHaveProperty("ldac:linguisticGenre");
    expect(sessionEntry["ldac:linguisticGenre"]).toEqual([
      { "@id": "tag:lameta,Test-Project:genre/custom_genre_not_in_ldac" }
    ]);

    // Check that the custom genre definition is in the graph
    const genreDefinition = result["@graph"].find(
      (item: any) =>
        item["@id"] === "tag:lameta,Test-Project:genre/custom_genre_not_in_ldac"
    );
    expect(genreDefinition).toBeDefined();
    expect(genreDefinition["@type"]).toBe("DefinedTerm");
    expect(genreDefinition.name).toBe("custom_genre_not_in_ldac");
    expect(genreDefinition.inDefinedTermSet).toEqual({
      "@id": "#CustomGenreTerms"
    });

    // Check that the custom term set is in the graph
    const termSet = result["@graph"].find(
      (item: any) => item["@id"] === "#CustomGenreTerms"
    );
    expect(termSet).toBeDefined();
    expect(termSet["@type"]).toBe("DefinedTermSet");
    expect(termSet.name).toBe("Custom Project Genres");
  });

  it("should handle multiple genres", async () => {
    // Mock multiple genres
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "dialog,narrative"; // Multiple genres
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Check that both genres are present
    expect(sessionEntry["ldac:linguisticGenre"]).toEqual([
      { "@id": "ldac:Dialogue" },
      { "@id": "ldac:Narrative" }
    ]);

    // Check that both genre definitions are in the graph
    const dialogueDefinition = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Dialogue"
    );
    expect(dialogueDefinition).toBeDefined();

    const narrativeDefinition = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Narrative"
    );
    expect(narrativeDefinition).toBeDefined();
  });

  it("should handle mix of LDAC and custom genres", async () => {
    // Mock mix of LDAC and custom genres
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "dialog,avoidance_language"; // One LDAC, one custom
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Check that both genres are present with correct IDs
    expect(sessionEntry["ldac:linguisticGenre"]).toEqual([
      { "@id": "ldac:Dialogue" },
      { "@id": "tag:lameta,Test-Project:genre/avoidance_language" }
    ]);

    // Check that LDAC genre definition is in the graph
    const dialogueDefinition = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Dialogue"
    );
    expect(dialogueDefinition).toBeDefined();
    expect(dialogueDefinition.inDefinedTermSet).toEqual({
      "@id": "ldac:LinguisticGenreTerms"
    });

    // Check that custom genre definition is in the graph
    const customDefinition = result["@graph"].find(
      (item: any) =>
        item["@id"] === "tag:lameta,Test-Project:genre/avoidance_language"
    );
    expect(customDefinition).toBeDefined();
    expect(customDefinition.inDefinedTermSet).toEqual({
      "@id": "#CustomGenreTerms"
    });

    // Check that both term sets are in the graph
    const ldacTermSet = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:LinguisticGenreTerms"
    );
    expect(ldacTermSet).toBeDefined();

    const customTermSet = result["@graph"].find(
      (item: any) => item["@id"] === "#CustomGenreTerms"
    );
    expect(customTermSet).toBeDefined();
  });

  it("should handle empty or unspecified genre", async () => {
    // Mock empty genre
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "";
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return false;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Check that ldac:linguisticGenre is not present
    expect(sessionEntry).not.toHaveProperty("ldac:linguisticGenre");
  });

  it("should handle unspecified genre value", async () => {
    // Mock unspecified genre
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "unspecified";
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Check that ldac:linguisticGenre is not present
    expect(sessionEntry).not.toHaveProperty("ldac:linguisticGenre");
  });

  it("should validate that LDAC-mapped genres have proper structure in the graph", async () => {
    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Check that the LDAC genre definition has all required properties
    const genreDefinition = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Dialogue"
    );
    expect(genreDefinition).toMatchObject({
      "@id": "ldac:Dialogue",
      "@type": "DefinedTerm",
      name: expect.any(String),
      description: expect.any(String),
      inDefinedTermSet: { "@id": "ldac:LinguisticGenreTerms" }
    });

    // Check that the LDAC term set is properly defined
    const termSet = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:LinguisticGenreTerms"
    );
    expect(termSet).toMatchObject({
      "@id": "ldac:LinguisticGenreTerms",
      "@type": "DefinedTermSet",
      name: "Linguistic Genre Terms"
    });
  });

  it("should create unique genre definitions even when same genre appears multiple times", async () => {
    // Mock the same genre appearing multiple times (this could happen with multiple values)
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "dialog,dialog"; // Duplicate genres
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Count how many genre definitions exist
    const genreDefinitions = result["@graph"].filter(
      (item: any) =>
        item["@id"] === "ldac:Dialogue" && item["@type"] === "DefinedTerm"
    );

    // Should only have one definition even though genre was duplicated
    expect(genreDefinitions).toHaveLength(1);

    // The ldac:linguisticGenre array should have both references though
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );
    expect(sessionEntry["ldac:linguisticGenre"]).toEqual([
      { "@id": "ldac:Dialogue" },
      { "@id": "ldac:Dialogue" }
    ]);
  });

  it("should handle complex genre IDs with special characters correctly", async () => {
    // Mock a genre with special characters
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "some-complex_genre.with!special@chars";
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Check that the custom genre ID is properly formatted with the new tag format
    expect(sessionEntry["ldac:linguisticGenre"]).toHaveLength(1);
    const genreId = sessionEntry["ldac:linguisticGenre"][0]["@id"];
    expect(genreId).toBe(
      "tag:lameta,Test-Project:genre/some-complex_genre.with!special@chars"
    );

    // Check that the genre definition exists
    const genreDefinition = result["@graph"].find(
      (item: any) => item["@id"] === genreId
    );
    expect(genreDefinition).toBeDefined();
    expect(genreDefinition["@type"]).toBe("DefinedTerm");
    expect(genreDefinition.name).toBe("some-complex_genre.with!special@chars");
  });

  it("should produce output that matches the expected ro-crate structure for mixed genres", async () => {
    // Test the exact structure from the user's example
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Fishing";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "dialog"; // LDAC-mapped genre
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Verify the session has the correct structure
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );
    expect(sessionEntry).toMatchObject({
      "@id": "./",
      "@type": ["Dataset", "Object", "RepositoryObject"],
      name: "Fishing",
      "ldac:linguisticGenre": [{ "@id": "ldac:Dialogue" }]
    });

    // Verify the genre definition exists with correct structure
    const dialogueGenre = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Dialogue"
    );
    expect(dialogueGenre).toMatchObject({
      "@id": "ldac:Dialogue",
      "@type": "DefinedTerm",
      name: "Dialog",
      description: expect.stringContaining("interactive discourse"),
      inDefinedTermSet: { "@id": "ldac:LinguisticGenreTerms" }
    });

    // Verify the LDAC term set exists
    const ldacTermSet = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:LinguisticGenreTerms"
    );
    expect(ldacTermSet).toMatchObject({
      "@id": "ldac:LinguisticGenreTerms",
      "@type": "DefinedTermSet",
      name: "Linguistic Genre Terms"
    });

    // Verify context includes LDAC
    expect(result["@context"]).toContain("https://w3id.org/ldac/context");
  });

  it("should correctly map other LDAC genres like narrative and drama", async () => {
    // Test other LDAC-mapped genres
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "narrative,drama"; // Multiple LDAC genres
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Verify both genres are mapped to LDAC terms
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );
    expect(sessionEntry["ldac:linguisticGenre"]).toContainEqual({
      "@id": "ldac:Narrative"
    });
    expect(sessionEntry["ldac:linguisticGenre"]).toContainEqual({
      "@id": "ldac:Drama"
    });

    // Verify both genre definitions exist
    const narrativeGenre = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Narrative"
    );
    expect(narrativeGenre).toBeDefined();
    expect(narrativeGenre["@type"]).toBe("DefinedTerm");

    const dramaGenre = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Drama"
    );
    expect(dramaGenre).toBeDefined();
    expect(dramaGenre["@type"]).toBe("DefinedTerm");
  });

  it("should map genres by label when UI passes label instead of id", async () => {
    // Test the case where the UI passes "Dialog" (the label) instead of "dialog" (the id)
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "Dialog"; // UI passes label, not id
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Should map to LDAC term, not custom genre
    expect(sessionEntry["ldac:linguisticGenre"]).toEqual([
      { "@id": "ldac:Dialogue" }
    ]);

    // Should have the LDAC genre definition, not custom
    const genreDefinition = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Dialogue"
    );
    expect(genreDefinition).toBeDefined();
    expect(genreDefinition["@type"]).toBe("DefinedTerm");
    expect(genreDefinition.name).toBe("Dialog");
    expect(genreDefinition.inDefinedTermSet).toEqual({
      "@id": "ldac:LinguisticGenreTerms"
    });

    // Should NOT have a custom genre definition
    const customGenreDefinition = result["@graph"].find(
      (item: any) => item["@id"] === "#Dialog"
    );
    expect(customGenreDefinition).toBeUndefined();
  });

  it("should also map Narrative by label", async () => {
    // Test another common case where UI passes "Narrative" (label) instead of "narrative" (id)
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "Narrative"; // UI passes label
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Should map to LDAC term
    expect(sessionEntry["ldac:linguisticGenre"]).toEqual([
      { "@id": "ldac:Narrative" }
    ]);

    // Should have the LDAC genre definition
    const genreDefinition = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Narrative"
    );
    expect(genreDefinition).toBeDefined();
    expect(genreDefinition.name).toBe("Narrative");
    expect(genreDefinition.inDefinedTermSet).toEqual({
      "@id": "ldac:LinguisticGenreTerms"
    });
  });

  it("should handle case insensitive label matching", async () => {
    // Test that "DIALOG" or "dialog" still maps correctly
    mockSession.metadataFile!.getTextProperty = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "title") return "Test Session";
        if (key === "description") return "Test Description";
        if (key === "access") return "public";
        if (key === "genre") return "DIALOG"; // All caps
        return "";
      });
    mockSession.metadataFile!.properties.getHasValue = vi
      .fn()
      .mockImplementation((key: string) => {
        if (key === "genre") return true;
        return false;
      });

    const result = (await getRoCrate(mockProject, mockSession)) as any;

    // Find the main session entry
    const sessionEntry = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );

    // Should still map to LDAC term despite case mismatch
    expect(sessionEntry["ldac:linguisticGenre"]).toEqual([
      { "@id": "ldac:Dialogue" }
    ]);

    // Should have the LDAC genre definition
    const genreDefinition = result["@graph"].find(
      (item: any) => item["@id"] === "ldac:Dialogue"
    );
    expect(genreDefinition).toBeDefined();
    expect(genreDefinition.inDefinedTermSet).toEqual({
      "@id": "ldac:LinguisticGenreTerms"
    });
  });
});

describe("RoCrateExporter LDAC Profile Compliance", () => {
  let mockProject: Project;
  let mockSession: any;
  let mockPerson: any;

  beforeEach(() => {
    // Mock session as a plain object that looks like Session
    mockSession = {
      filePrefix: "test_session",
      knownFields: [
        {
          key: "genre",
          persist: true,
          type: "Text",
          multilingual: false,
          isCustom: false,
          showOnAutoForm: true,
          vocabularyFile: "genres.json",
          rocrate: {
            key: "ldac:linguisticGenre",
            array: true,
            template: {
              "@id": "[v]",
              "@type": "DefinedTerm"
            }
          }
        }
      ],
      files: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          switch (key) {
            case "title":
              return "Test Session";
            case "description":
              return "Test Session Description";
            case "date":
              return "2024-01-01";
            case "location":
              return "Test Location";
            case "access":
              return "open";
            default:
              return "";
          }
        }),
        properties: {
          getHasValue: vi.fn(() => false),
          forEach: vi.fn()
        }
      },
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([
        {
          personReference: "Awi Heole",
          role: "speaker",
          comments: "",
          sessionName: "test"
        },
        {
          personReference: "Hatton",
          role: "recorder",
          comments: "",
          sessionName: "test"
        }
      ])
    };

    // Mock project
    mockProject = {
      filePrefix: "project1",
      sessions: { items: [mockSession] },
      findPerson: vi.fn(),
      authorityLists: {
        accessChoicesOfCurrentProtocol: [
          {
            label: "open",
            description: "Open access"
          }
        ]
      },
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Project";
          if (key === "description") return "Test Project Description";
          return "";
        }),
        properties: {
          forEach: vi.fn()
        }
      },
      knownFields: [],
      files: []
    } as any;

    // Mock person
    mockPerson = {
      filePrefix: "Awi_Heole",
      metadataFile: {
        getTextProperty: vi.fn(() => ""),
        properties: {
          forEach: vi.fn()
        }
      },
      knownFields: [],
      files: []
    };

    mockProject.findPerson = vi.fn().mockImplementation((name: string) => {
      if (name === "Awi Heole") return mockPerson;
      return null;
    });
  });

  describe("conformsTo Profile URI", () => {
    it("should use correct LDAC profile URI for project collections", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const rootDataset = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );
      // For project collections, should use the Collection profile URI
      expect(rootDataset.conformsTo["@id"]).toBe(
        "https://w3id.org/ldac/profile#Collection"
      );
      // And should be typed as RepositoryCollection
      expect(rootDataset["@type"]).toEqual(["Dataset", "RepositoryCollection"]);
    });

    it("should use correct LDAC profile URI for session", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      // When exporting a project, sessions should be Event entities with correct conformsTo
      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/test_session/" &&
          item["@type"] &&
          item["@type"].includes("Event")
      );
      expect(sessionEvent).toBeDefined();
      expect(sessionEvent.conformsTo["@id"]).toBe(
        "https://w3id.org/ldac/profile#Object"
      );
      // And should be typed as RepositoryObject
      expect(sessionEvent["@type"]).toEqual([
        "Event",
        "Object",
        "RepositoryObject"
      ]);
    });

    it("should use correct LDAC profile URI for standalone session", async () => {
      const result = (await getRoCrate(mockProject, mockSession)) as any;

      const rootDataset = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );
      // For single session crates, should use the Object profile URI
      expect(rootDataset.conformsTo["@id"]).toBe(
        "https://w3id.org/ldac/profile#Object"
      );
    });
  });

  describe("collection vs object relationships", () => {
    it("should use pcdm:hasMember to link sessions to collection", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const rootDataset = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );

      // Collection should use pcdm:hasMember to link to sessions, not hasPart
      expect(rootDataset["pcdm:hasMember"]).toBeDefined();
      expect(rootDataset["pcdm:hasMember"]).toContainEqual({
        "@id": "Sessions/test_session/"
      });

      // Collection should still use hasPart for people
      expect(rootDataset.hasPart).toBeDefined();
      expect(rootDataset.hasPart).toContainEqual({
        "@id": "People/Awi_Heole/"
      });
    });

    it("should ensure sessions use hasPart for their files, not pcdm:hasMember", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/test_session/" &&
          item["@type"].includes("Event")
      );

      // Sessions should use hasPart for files, not pcdm:hasMember
      expect(sessionEvent.hasPart).toBeDefined();
      expect(Array.isArray(sessionEvent.hasPart)).toBe(true);
      // Should NOT have pcdm:hasMember on sessions
      expect(sessionEvent["pcdm:hasMember"]).toBeUndefined();
    });

    it("should include pcdm context for collection membership", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      // Verify context includes pcdm namespace
      expect(result["@context"]).toContain("https://w3id.org/ldac/context");
    });

    it("should follow complete LDAC collection-object hierarchy correctly", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      // Root collection should conform to Collection profile
      const rootDataset = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );
      expect(rootDataset.conformsTo["@id"]).toBe(
        "https://w3id.org/ldac/profile#Collection"
      );
      expect(rootDataset["@type"]).toEqual(["Dataset", "RepositoryCollection"]);

      // Sessions should conform to Object profile
      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/test_session/" &&
          item["@type"].includes("Event")
      );
      expect(sessionEvent.conformsTo["@id"]).toBe(
        "https://w3id.org/ldac/profile#Object"
      );
      expect(sessionEvent["@type"]).toEqual([
        "Event",
        "Object",
        "RepositoryObject"
      ]);

      // Collection uses pcdm:hasMember for sessions
      expect(rootDataset["pcdm:hasMember"]).toContainEqual({
        "@id": "Sessions/test_session/"
      });

      // Collection uses hasPart for people (supporting entities)
      expect(rootDataset.hasPart).toContainEqual({
        "@id": "People/Awi_Heole/"
      });

      // Sessions use hasPart for their files, not pcdm:hasMember
      expect(sessionEvent.hasPart).toBeDefined();
      expect(sessionEvent["pcdm:hasMember"]).toBeUndefined();

      // Context should include pcdm namespace
      const contextObj = result["@context"].find(
        (ctx: any) => typeof ctx === "object" && ctx.pcdm
      );
      expect(contextObj).toBeDefined();
      expect(contextObj.pcdm).toBe("http://pcdm.org/models#");
    });
  });

  describe("participant roles modeling", () => {
    it("should use specific LDAC role properties instead of generic participant", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/test_session/" &&
          item["@type"].includes("Event")
      );

      // Should NOT have generic participant property
      expect(sessionEvent.participant).toBeUndefined();

      // Should have specific LDAC role properties
      expect(sessionEvent["ldac:speaker"]).toBeDefined();
      expect(sessionEvent["ldac:recorder"]).toBeDefined();

      // Values should be direct references to Person objects, not Role objects
      expect(sessionEvent["ldac:speaker"]).toEqual({
        "@id": "People/Awi_Heole/"
      });
      expect(sessionEvent["ldac:recorder"]).toEqual({ "@id": "Hatton" });
    });

    it("should use correct LDAC role URIs with ldac: namespace", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/test_session/" &&
          item["@type"].includes("Event")
      );

      // Check that we're using ldac:speaker and ldac:recorder properties
      // instead of generic participant with roleAction URIs
      expect(sessionEvent["ldac:speaker"]).toBeDefined();
      expect(sessionEvent["ldac:recorder"]).toBeDefined();

      // The context should define ldac: namespace
      expect(result["@context"]).toContain("https://w3id.org/ldac/context");
    });

    it("should not have role property on Person entities", async () => {
      const result = (await getRoCrate(mockProject, mockSession)) as any;

      const personEntities = result["@graph"].filter(
        (item: any) =>
          item["@type"] &&
          (item["@type"].includes("Person") ||
            (Array.isArray(item["@type"]) && item["@type"].includes("Person")))
      );

      personEntities.forEach((person: any) => {
        expect(person.role).toBeUndefined();
      });
    });

    it("should handle multiple people with same role correctly", async () => {
      // Add another speaker to test multiple people with same role
      mockSession.getAllContributionsToAllFiles = vi.fn().mockReturnValue([
        {
          personReference: "Awi Heole",
          role: "speaker",
          comments: "",
          sessionName: "test"
        },
        {
          personReference: "John Doe",
          role: "speaker",
          comments: "",
          sessionName: "test"
        },
        {
          personReference: "Hatton",
          role: "recorder",
          comments: "",
          sessionName: "test"
        }
      ]);

      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/test_session/" &&
          item["@type"].includes("Event")
      );

      // Should have array of speakers when multiple people have same role
      expect(Array.isArray(sessionEvent["ldac:speaker"])).toBe(true);
      expect(sessionEvent["ldac:speaker"]).toHaveLength(2);
      expect(sessionEvent["ldac:speaker"]).toContainEqual({
        "@id": "People/Awi_Heole/"
      });
      expect(sessionEvent["ldac:speaker"]).toContainEqual({
        "@id": "John Doe"
      });
    });
  });

  describe("entity properties cleanup", () => {
    it("should not have redundant id and title properties on Event", async () => {
      const result = (await getRoCrate(mockProject, mockProject)) as any;

      const sessionEvent = result["@graph"].find(
        (item: any) =>
          item["@id"] === "Sessions/test_session/" &&
          item["@type"].includes("Event")
      );

      expect(sessionEvent.id).toBeUndefined();
      expect(sessionEvent.title).toBeUndefined();
      expect(sessionEvent.name).toBeDefined();
    });

    it("should generate custom genre IDs with lameta and project name", async () => {
      // Mock project with title
      mockProject.metadataFile = {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Edolo-Research";
          return "";
        })
      } as any;

      // Mock a custom genre that doesn't map to LDAC
      mockSession.metadataFile!.getTextProperty = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "description") return "Test Description";
          if (key === "access") return "public";
          if (key === "genre") return "crazy-talk";
          return "";
        });
      mockSession.metadataFile!.properties.getHasValue = vi
        .fn()
        .mockImplementation((key: string) => {
          if (key === "genre") return true;
          return false;
        });

      const result = (await getRoCrate(mockProject, mockSession)) as any;

      // Find the main session entry
      const sessionEntry = result["@graph"].find(
        (item: any) => item["@id"] === "./"
      );

      // Check that genre is converted to ldac:linguisticGenre with custom ID including project name
      expect(sessionEntry).toHaveProperty("ldac:linguisticGenre");
      expect(sessionEntry["ldac:linguisticGenre"]).toEqual([
        { "@id": "tag:lameta,Edolo-Research:genre/crazy-talk" }
      ]);

      // Check that the custom genre definition is in the graph with the new ID format
      const genreDefinition = result["@graph"].find(
        (item: any) =>
          item["@id"] === "tag:lameta,Edolo-Research:genre/crazy-talk"
      );
      expect(genreDefinition).toBeDefined();
      expect(genreDefinition["@type"]).toBe("DefinedTerm");
      expect(genreDefinition.name).toBe("crazy-talk");
      expect(genreDefinition.description).toBe("Custom term: crazy-talk");
    });
  });
});
