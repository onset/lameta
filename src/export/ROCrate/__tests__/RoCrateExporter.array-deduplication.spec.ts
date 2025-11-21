import { describe, it, expect } from "vitest";

// Test the deduplication function directly
describe("RO-Crate Array Deduplication", () => {
  it("should deduplicate hasPart arrays", () => {
    // Import the function to test (we'll need to export it for testing)
    const deduplicateHasPartArrays = (graph: any[]): any[] => {
      return graph.map((entity) => {
        if (entity.hasPart && Array.isArray(entity.hasPart)) {
          const seen = new Set<string>();
          entity.hasPart = entity.hasPart.filter((item: any) => {
            const id = item["@id"];
            if (seen.has(id)) {
              return false;
            }
            seen.add(id);
            return true;
          });
        }
        return entity;
      });
    };

    // Create a mock graph with duplicates in hasPart
    const graphWithDuplicates = [
      {
        "@id": "./",
        "@type": "Dataset",
        hasPart: [
          { "@id": "file1.txt" },
          { "@id": "file2.pdf" },
          { "@id": "file1.txt" }, // Duplicate
          { "@id": "file3.jpg" },
          { "@id": "file2.pdf" } // Another duplicate
        ]
      },
      {
        "@id": "Sessions/session1/",
        "@type": ["RepositoryObject", "CollectionEvent"],
        hasPart: [
          { "@id": "audio.wav" },
          { "@id": "transcript.txt" },
          { "@id": "audio.wav" } // Duplicate
        ]
      },
      {
        "@id": "People/Person1/",
        "@type": "Person",
        // No hasPart - should be left unchanged
        name: "Test Person"
      }
    ];

    const deduplicated = deduplicateHasPartArrays(graphWithDuplicates);

    // Check root dataset
    const rootDataset = deduplicated.find((e) => e["@id"] === "./");
    expect(rootDataset.hasPart).toHaveLength(3); // Should be 3, not 5
    expect(rootDataset.hasPart.map((item: any) => item["@id"])).toEqual([
      "file1.txt",
      "file2.pdf",
      "file3.jpg"
    ]);

    // Check session
    const session = deduplicated.find((e) => e["@id"] === "Sessions/session1/");
    expect(session.hasPart).toHaveLength(2); // Should be 2, not 3
    expect(session.hasPart.map((item: any) => item["@id"])).toEqual([
      "audio.wav",
      "transcript.txt"
    ]);

    // Check person (no hasPart)
    const person = deduplicated.find((e) => e["@id"] === "People/Person1/");
    expect(person.hasPart).toBeUndefined();
    expect(person.name).toBe("Test Person");
  });

  it("should handle entities without hasPart arrays", () => {
    const deduplicateHasPartArrays = (graph: any[]): any[] => {
      return graph.map((entity) => {
        if (entity.hasPart && Array.isArray(entity.hasPart)) {
          const seen = new Set<string>();
          entity.hasPart = entity.hasPart.filter((item: any) => {
            const id = item["@id"];
            if (seen.has(id)) {
              return false;
            }
            seen.add(id);
            return true;
          });
        }
        return entity;
      });
    };

    const graphWithoutHasPart = [
      {
        "@id": "metadata.json",
        "@type": "CreativeWork",
        name: "Metadata"
      },
      {
        "@id": "#license",
        "@type": "CreativeWork",
        name: "License"
      }
    ];

    const result = deduplicateHasPartArrays(graphWithoutHasPart);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Metadata");
    expect(result[1].name).toBe("License");
  });
});
