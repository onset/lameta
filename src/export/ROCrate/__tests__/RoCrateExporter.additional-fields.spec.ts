import { vi, describe, it, expect, beforeEach } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Session } from "../../../model/Project/Session/Session";
import { Project } from "../../../model/Project/Project";
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
      .mockImplementation((code: string) => `Language ${code}`)
  }
}));

/**
 * Test that "additional" fields (isAdditional=true) that don't have
 * schema.org or LDaC context definitions are excluded from RO-Crate export.
 *
 * Fields like involvement, planningType, and socialContext are IMDI-specific
 * fields that lack proper JSON-LD context definitions. Per LAM-52, these should
 * be omitted from RO-Crate exports until they are properly defined in LDaC or
 * another recognized vocabulary.
 */
describe("RoCrateExporter additional fields without context", () => {
  let mockProject: Project;
  let mockSession: Session;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock field definitions - these additional fields have NO rocrate definitions
    vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
      [
        {
          key: "title",
          persist: true,
          englishLabel: "Session Title",
          rocrate: {
            key: "name",
            template: { name: "[v]" }
          }
        } as FieldDefinition,
        {
          key: "involvement",
          persist: true,
          englishLabel: "Researcher Involvement",
          isAdditional: true
          // NO rocrate definition - this field should be excluded
        } as FieldDefinition,
        {
          key: "planningType",
          persist: true,
          englishLabel: "Planning Type",
          isAdditional: true
          // NO rocrate definition - this field should be excluded
        } as FieldDefinition,
        {
          key: "socialContext",
          persist: true,
          englishLabel: "Social Context",
          isAdditional: true
          // NO rocrate definition - this field should be excluded
        } as FieldDefinition
      ]
    );

    vi.spyOn(fieldDefinitionsOfCurrentConfig, "common", "get").mockReturnValue(
      []
    );

    // Create mock session
    mockSession = {
      filePrefix: "test-session",
      directory: "/sessions/test-session",
      knownFields: [
        { key: "title", englishLabel: "Session Title", persist: true },
        {
          key: "involvement",
          englishLabel: "Researcher Involvement",
          persist: true,
          isAdditional: true
        },
        {
          key: "planningType",
          englishLabel: "Planning Type",
          persist: true,
          isAdditional: true
        },
        {
          key: "socialContext",
          englishLabel: "Social Context",
          persist: true,
          isAdditional: true
        }
      ],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Session";
          if (key === "involvement") return "non-elicited";
          if (key === "planningType") return "spontaneous";
          if (key === "socialContext") return "public";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(true),
          forEach: vi.fn(),
          getFieldDefinition: vi.fn().mockImplementation((key: string) => {
            if (key === "involvement")
              return { key: "involvement", isAdditional: true };
            if (key === "planningType")
              return { key: "planningType", isAdditional: true };
            if (key === "socialContext")
              return { key: "socialContext", isAdditional: true };
            return undefined;
          })
        }
      },
      files: [],
      getAllContributionsToAllFiles: vi.fn().mockReturnValue([])
    } as any;

    mockProject = {
      directory: "/project",
      getIdToUseForReferences: () => ".",
      sessions: { items: [mockSession] },
      people: [],
      files: [],
      knownFields: [
        { key: "title", englishLabel: "Project Title", persist: true },
        {
          key: "archiveConfigurationName",
          englishLabel: "Archive",
          persist: true
        }
      ],
      metadataFile: {
        getTextProperty: vi.fn().mockImplementation((key: string) => {
          if (key === "title") return "Test Project";
          if (key === "archiveConfigurationName") return "lameta";
          return "";
        }),
        properties: {
          getHasValue: vi.fn().mockReturnValue(true),
          forEach: vi.fn(),
          getFieldDefinition: vi.fn().mockReturnValue(undefined)
        }
      },
      findPerson: vi.fn().mockReturnValue(null),
      authorityLists: {
        accessChoicesOfCurrentProtocol: []
      }
    } as any;
  });

  it("should NOT export involvement field (isAdditional, no rocrate definition)", async () => {
    // The mock already has involvement set to "non-elicited"

    const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
    const graph = roCrateData["@graph"];

    // Find the session entity in the graph
    const sessionEntity = graph.find((entity: any) =>
      entity["@type"]?.includes("RepositoryObject")
    );

    expect(sessionEntity).toBeDefined();

    // involvement should NOT be in the output since it lacks context definition
    expect(sessionEntity).not.toHaveProperty("involvement");
  });

  it("should NOT export planningType field (isAdditional, no rocrate definition)", async () => {
    // The mock already has planningType set to "spontaneous"

    const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
    const graph = roCrateData["@graph"];

    // Find the session entity in the graph
    const sessionEntity = graph.find((entity: any) =>
      entity["@type"]?.includes("RepositoryObject")
    );

    expect(sessionEntity).toBeDefined();

    // planningType should NOT be in the output since it lacks context definition
    expect(sessionEntity).not.toHaveProperty("planningType");
  });

  it("should NOT export socialContext field (isAdditional, no rocrate definition)", async () => {
    // The mock already has socialContext set to "public"

    const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
    const graph = roCrateData["@graph"];

    // Find the session entity in the graph
    const sessionEntity = graph.find((entity: any) =>
      entity["@type"]?.includes("RepositoryObject")
    );

    expect(sessionEntity).toBeDefined();

    // socialContext should NOT be in the output since it lacks context definition
    expect(sessionEntity).not.toHaveProperty("socialContext");
  });

  it("should NOT export any isAdditional fields without rocrate definitions", async () => {
    // The mock already has all three fields set

    const roCrateData = (await getRoCrate(mockProject, mockSession)) as any;
    const graph = roCrateData["@graph"];

    // Find the session entity in the graph
    const sessionEntity = graph.find((entity: any) =>
      entity["@type"]?.includes("RepositoryObject")
    );

    expect(sessionEntity).toBeDefined();

    // None of these additional fields should be in the output
    expect(sessionEntity).not.toHaveProperty("involvement");
    expect(sessionEntity).not.toHaveProperty("planningType");
    expect(sessionEntity).not.toHaveProperty("socialContext");
  });
});
