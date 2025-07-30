import { vi, describe, it, beforeEach, expect } from "vitest";
import { getRoCrate } from "./RoCrateExporter";
import { Session } from "../../model/Project/Session/Session";
import { Project } from "../../model/Project/Project";
import { Person } from "../../model/Project/Person/Person";
import { FieldDefinition } from "../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../model/field/ConfiguredFieldDefinitions";

// Mock fs-extra module
vi.mock("fs-extra", () => ({
  statSync: vi.fn().mockReturnValue({
    size: 2048,
    birthtime: new Date("2010-06-06")
  })
}));

describe("RoCrateExporter LDAC Profile Full Integration", () => {
  let mockProject: Project;
  let mockSession: Session;
  let mockPerson1: Person;
  let mockPerson2: Person;

  beforeEach(() => {
    // Mock field definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      []
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
      } as FieldDefinition
    ]);

    // Create mock files representing the ETR009 session from the report
    const mockAudioFile = {
      getActualFilePath: () => "/sessions/ETR009/ETR009_Careful.mp3",
      getModifiedDate: () => new Date("2010-06-06"),
      pathInFolderToLinkFileOrLocalCopy: "ETR009_Careful.mp3"
    } as any;

    const mockVideoFile = {
      getActualFilePath: () => "/sessions/ETR009/ETR009_Tiny.mp4",
      getModifiedDate: () => new Date("2010-06-06"),
      pathInFolderToLinkFileOrLocalCopy: "ETR009_Tiny.mp4"
    } as any;

    const mockSessionXml = {
      getActualFilePath: () => "/sessions/ETR009/ETR009.xml",
      getModifiedDate: () => new Date("2010-06-06"),
      pathInFolderToLinkFileOrLocalCopy: "ETR009.xml"
    } as any;

    const mockPhoto1 = {
      getActualFilePath: () => "/people/Awi_Heole/Awi_Heole_Photo.JPG",
      getModifiedDate: () => new Date("2010-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "Awi_Heole_Photo.JPG"
    } as any;

    const mockPersonFile1 = {
      getActualFilePath: () => "/people/Awi_Heole/Awi_Heole.person",
      getModifiedDate: () => new Date("2010-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "Awi_Heole.person"
    } as any;

    const mockPhoto2 = {
      getActualFilePath: () => "/people/Ilawi_Amosa/Ilawi_Amosa_Photo.JPG",
      getModifiedDate: () => new Date("2010-01-01"),
      pathInFolderToLinkFileOrLocalCopy: "Ilawi_Amosa_Photo.JPG"
    } as any;

    // Mock persons from the report
    mockPerson1 = {
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
      files: [mockPhoto1, mockPersonFile1]
    } as any;

    mockPerson2 = {
      filePrefix: "Ilawi_Amosa",
      directory: "/people/Ilawi_Amosa",
      getIdToUseForReferences: () => "Ilawi_Amosa",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "name") return "Ilawi Amosa";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [mockPhoto2]
    } as any;

    // Mock session ETR009 from the report
    mockSession = {
      filePrefix: "ETR009",
      directory: "/sessions/ETR009",
      knownFields: [],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title")
            return "The story behind how we catch fish with poison bark";
          if (key === "description") return "Some guys talking";
          if (key === "date") return "2010-06-06";
          if (key === "location") return "huya";
          if (key === "keyword") return "fishing, poison";
          if (key === "access") return "public";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [mockAudioFile, mockVideoFile, mockSessionXml],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([
        { personReference: "Awi_Heole", role: "speaker" },
        { personReference: "Ilawi_Amosa", role: "speaker" } // Both are speakers for the test
      ])
    } as any;

    // Mock project
    mockProject = {
      filePrefix: "Edolo_sample",
      sessions: { items: [mockSession] },
      findPerson: vi.fn().mockImplementation((name: string) => {
        if (name === "Awi_Heole") return mockPerson1;
        if (name === "Ilawi_Amosa") return mockPerson2;
        return null;
      }),
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Edolo Language Documentation";
          if (key === "description")
            return "Documentation of the Edolo language";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(false),
          forEach: vi.fn()
        }
      },
      files: [],
      knownFields: [],
      authorityLists: { accessChoicesOfCurrentProtocol: [] }
    } as any;

    // Set up prototypes for instanceof checks
    Object.setPrototypeOf(mockProject, Project.prototype);
    Object.setPrototypeOf(mockSession, Session.prototype);
    Object.setPrototypeOf(mockPerson1, Person.prototype);
    Object.setPrototypeOf(mockPerson2, Person.prototype);
  });

  it("should generate a complete LDAC-compliant RO-Crate structure", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // Verify root dataset structure
    const rootDataset = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );
    expect(rootDataset).toBeDefined();
    expect(rootDataset["@type"]).toEqual(["Dataset", "RepositoryCollection"]);
    expect(rootDataset.name).toBe("Edolo Language Documentation");
    expect(rootDataset.description).toBe("Documentation of the Edolo language");

    // Verify root dataset uses pcdm:hasMember for sessions
    expect(rootDataset["pcdm:hasMember"]).toContainEqual({
      "@id": "Sessions/ETR009/"
    });
    // And hasPart for people
    expect(rootDataset.hasPart).toContainEqual({ "@id": "People/Awi_Heole/" });
    expect(rootDataset.hasPart).toContainEqual({
      "@id": "People/Ilawi_Amosa/"
    });

    // Verify session event entity (central hub)
    const sessionEvent = result["@graph"].find(
      (item: any) =>
        item["@id"] === "Sessions/ETR009/" && item["@type"].includes("Event")
    );
    expect(sessionEvent).toBeDefined();
    expect(sessionEvent["@type"]).toEqual([
      "Event",
      "Object",
      "RepositoryObject"
    ]);
    expect(sessionEvent.name).toBe(
      "The story behind how we catch fish with poison bark"
    );
    expect(sessionEvent.description).toBe("Some guys talking");
    expect(sessionEvent.startDate).toBe("2010-06-06");
    expect(sessionEvent.keywords).toBe("fishing, poison");

    // Verify session uses LDAC-specific role properties instead of generic participant
    expect(sessionEvent["ldac:speaker"]).toBeDefined();
    expect(sessionEvent.participant).toBeUndefined(); // Should not use generic participant

    // Check that speakers are properly referenced
    const speakers = Array.isArray(sessionEvent["ldac:speaker"])
      ? sessionEvent["ldac:speaker"]
      : [sessionEvent["ldac:speaker"]];
    const speakerIds = speakers.map((s: any) => s["@id"]);
    expect(speakerIds).toContain("People/Awi_Heole/");
    expect(speakerIds).toContain("People/Ilawi_Amosa/");

    // Verify session links to its files
    expect(sessionEvent.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/ETR009_Careful.mp3"
    });
    expect(sessionEvent.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/ETR009_Tiny.mp4"
    });
    expect(sessionEvent.hasPart).toContainEqual({
      "@id": "Sessions/ETR009/ETR009.xml"
    });

    // Verify Place entity
    const placeEntity = result["@graph"].find(
      (item: any) => item["@id"] === "#huya" && item["@type"] === "Place"
    );
    expect(placeEntity).toBeDefined();
    expect(placeEntity.name).toBe("huya");
    expect(sessionEvent.location).toEqual({ "@id": "#huya" });

    // Verify Person entities with proper IDs
    const person1 = result["@graph"].find(
      (item: any) =>
        item["@id"] === "People/Awi_Heole/" && item["@type"] === "Person"
    );
    expect(person1).toBeDefined();

    const person2 = result["@graph"].find(
      (item: any) =>
        item["@id"] === "People/Ilawi_Amosa/" && item["@type"] === "Person"
    );
    expect(person2).toBeDefined();

    // Verify specific file types and roles
    const audioFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Careful.mp3"
    );
    expect(audioFile["@type"]).toBe("AudioObject");
    expect(audioFile.role).toBeUndefined();

    const videoFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009_Tiny.mp4"
    );
    expect(videoFile["@type"]).toBe("VideoObject");
    expect(videoFile.role).toBeUndefined();

    const xmlFile = result["@graph"].find(
      (item: any) => item["@id"] === "Sessions/ETR009/ETR009.xml"
    );
    expect(xmlFile["@type"]).toBe("DigitalDocument");
    expect(xmlFile.role).toBeUndefined();

    const photo1 = result["@graph"].find(
      (item: any) => item["@id"] === "People/Awi_Heole/Awi_Heole_Photo.JPG"
    );
    expect(photo1["@type"]).toBe("ImageObject");
    expect(photo1.role).toBeUndefined();

    const personFile = result["@graph"].find(
      (item: any) => item["@id"] === "People/Awi_Heole/Awi_Heole.person"
    );
    expect(personFile["@type"]).toBe("DigitalDocument");
    expect(personFile.role).toBeUndefined();

    // Verify that no separate Role entities are created (we use LDAC properties directly)
    const roleEntities = result["@graph"].filter(
      (item: any) => item["@type"] === "Role"
    );
    expect(roleEntities).toHaveLength(0); // No separate Role entities

    // Verify license entity (normalized)
    const license = result["@graph"].find(
      (item: any) =>
        item["@id"] === "#license-unknown-public" &&
        item["@type"] === "ldac:DataReuseLicense"
    );
    // If license is not defined, log the entire graph
    if (!license) {
      console.log("License not found in the graph, logging the entire graph:");
      console.log(JSON.stringify(result["@graph"], null, 2));
    }
    // If license is not defined, log the entire graph
    if (!license) {
      console.log("License not found in the graph, logging the entire graph:");
      console.log(JSON.stringify(result["@graph"], null, 2));
    }
    expect(license).toBeDefined();

    // Verify metadata file
    const metadataFile = result["@graph"].find(
      (item: any) => item["@id"] === "ro-crate-metadata.json"
    );
    expect(metadataFile).toBeDefined();
    expect(metadataFile["@type"]).toBe("CreativeWork");
    expect(metadataFile.about).toEqual({ "@id": "./" });
  });

  it("should create a connected graph, not a flat file list", async () => {
    const result = (await getRoCrate(mockProject, mockProject)) as any;

    // Count entities that have proper relationships
    const entitiesWithRelationships = result["@graph"].filter(
      (item: any) =>
        item.hasPart || item.participant || item.location || item.about
    );

    // Should have root dataset, session event, and possibly person entities with relationships
    expect(entitiesWithRelationships.length).toBeGreaterThan(1);

    // Verify the graph is connected - root links to sessions via pcdm:hasMember and people via hasPart
    const rootDataset = result["@graph"].find(
      (item: any) => item["@id"] === "./"
    );
    expect(
      rootDataset.hasPart.length + rootDataset["pcdm:hasMember"].length
    ).toBeGreaterThan(0);

    // Session event links to people via LDAC role properties and files
    const sessionEvent = result["@graph"].find(
      (item: any) =>
        item["@id"] === "Sessions/ETR009/" && item["@type"].includes("Event")
    );

    // Count LDAC role properties instead of generic participant
    const roleCount = Object.keys(sessionEvent).filter(
      (key) =>
        key.startsWith("ldac:") &&
        sessionEvent[key] &&
        (Array.isArray(sessionEvent[key]) || sessionEvent[key]["@id"])
    ).length;
    expect(roleCount).toBeGreaterThan(0);
    expect(sessionEvent.hasPart.length).toBeGreaterThan(0);
  });
});
