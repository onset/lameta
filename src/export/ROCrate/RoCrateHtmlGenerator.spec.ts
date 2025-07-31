import { describe, it, expect } from "vitest";
import { generateRoCrateHtml } from "./RoCrateHtmlGenerator";

describe("RoCrateHtmlGenerator", () => {
  it("should include description and other docs sections in project HTML", () => {
    const mockRoCrateData = {
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          description: "A test project for HTML generation"
        },
        {
          "@id": "Description/README.md",
          "@type": "DigitalDocument",
          name: "README.md",
          contentSize: 1024
        },
        {
          "@id": "Description/GUIDE.pdf",
          "@type": "DigitalDocument",
          name: "GUIDE.pdf",
          contentSize: 2048
        },
        {
          "@id": "OtherDocs/notes.txt",
          "@type": "DigitalDocument",
          name: "notes.txt",
          contentSize: 512
        },
        {
          "@id": "Sessions/TEST001/",
          "@type": "Event",
          name: "Test Session"
        },
        {
          "@id": "People/TestPerson/",
          "@type": "Person",
          name: "Test Person"
        }
      ]
    };

    const html = generateRoCrateHtml(mockRoCrateData);

    // Check that the HTML contains description documents section
    expect(html).toContain("Description Documents:");
    expect(html).toContain("README.md");
    expect(html).toContain("GUIDE.pdf");

    // Check that the HTML contains other documents section
    expect(html).toContain("Other Documents:");
    expect(html).toContain("notes.txt");

    // Check that existing sessions and people sections still work
    expect(html).toContain("Sessions:");
    expect(html).toContain("Test Session");
    expect(html).toContain("People:");
    expect(html).toContain("Test Person");

    // Check that links are properly formed
    expect(html).toContain('href="#entity_Description_README_md"');
    expect(html).toContain('href="#entity_OtherDocs_notes_txt"');
  });

  it("should handle projects without description or other docs", () => {
    const mockRoCrateData = {
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          description: "A test project without docs"
        },
        {
          "@id": "Sessions/TEST001/",
          "@type": "Event",
          name: "Test Session"
        }
      ]
    };

    const html = generateRoCrateHtml(mockRoCrateData);

    // Should not contain description or other docs sections
    expect(html).not.toContain("Description Documents:");
    expect(html).not.toContain("Other Documents:");

    // Should still contain sessions section
    expect(html).toContain("Sessions:");
    expect(html).toContain("Test Session");
  });

  it("should handle empty document folders gracefully", () => {
    const mockRoCrateData = {
      "@graph": [
        {
          "@id": "./",
          "@type": ["Dataset", "RepositoryCollection"],
          name: "Test Project",
          description: "A test project"
        }
      ]
    };

    const html = generateRoCrateHtml(mockRoCrateData);

    // Should not contain any document sections when no documents exist
    expect(html).not.toContain("Description Documents:");
    expect(html).not.toContain("Other Documents:");
    expect(html).not.toContain("Sessions:");
    expect(html).not.toContain("People:");
  });
});
