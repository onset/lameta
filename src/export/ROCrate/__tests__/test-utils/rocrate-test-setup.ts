import { vi } from "vitest";
import { Project } from "../../../../model/Project/Project";
import { Session } from "../../../../model/Project/Session/Session";
import { Person } from "../../../../model/Project/Person/Person";
import { FieldDefinition } from "../../../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../../../model/field/ConfiguredFieldDefinitions";

/**
 * Common mock for staticLanguageFinder used across multiple test files
 */
export const createStaticLanguageFinderMock = () => {
  return vi.mock("../../../../languageFinder/LanguageFinder", () => ({
    staticLanguageFinder: {
      findOneLanguageNameFromCode_Or_ReturnCode: vi
        .fn()
        .mockImplementation((code: string) => {
          const languageMap: { [key: string]: string } = {
            eng: "English",
            en: "English",
            fra: "French", 
            fr: "French",
            deu: "German",
            de: "German",
            etr: "Edolo",
            spa: "Spanish",
            es: "Spanish",
            ita: "Italian",
            it: "Italian"
          };
          return languageMap[code] || code;
        })
    }
  }));
};

/**
 * Common mock for fs-extra used in file-related tests
 */
export const createFsExtraMock = () => {
  return vi.mock("fs-extra", () => ({
    default: {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue("mock file content"),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      statSync: vi.fn().mockReturnValue({ 
        size: 1024,
        birthtime: new Date("2024-01-01T00:00:00.000Z")
      }),
      readdirSync: vi.fn().mockReturnValue([])
    },
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue("mock file content"),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    statSync: vi.fn().mockReturnValue({ 
      size: 1024,
      birthtime: new Date("2024-01-01T00:00:00.000Z")
    }),
    readdirSync: vi.fn().mockReturnValue([])
  }));
};

/**
 * Common field definitions used across tests
 */
export const getCommonFieldDefinitions = (): FieldDefinition[] => [
  {
    key: "id",
    englishLabel: "ID",
    persist: true,
    rocrate: {
      template: {
        "@id": "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "title",
    englishLabel: "Title", 
    persist: true,
    rocrate: {
      template: {
        "name": "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "description",
    englishLabel: "Description",
    persist: true,
    rocrate: {
      template: {
        "description": "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "language",
    englishLabel: "Language",
    persist: true,
    rocrate: {
      template: {
        "@id": "#language_[code]",
        "@type": "Language",
        "code": "[code]",
        "name": "[languageName]"
      }
    }
  } as FieldDefinition,
  {
    key: "person", 
    englishLabel: "Person",
    persist: true,
    rocrate: {
      template: {
        "@id": "[v]",
        "@type": "Person"
      }
    }
  } as FieldDefinition,
  {
    key: "genre",
    englishLabel: "Genre",
    persist: true,
    rocrate: {
      template: {
        "genre": "[v]"
      }
    }
  } as FieldDefinition
];

/**
 * Session-specific field definitions
 */
export const getSessionFieldDefinitions = (): FieldDefinition[] => [
  {
    key: "id", 
    englishLabel: "Session ID",
    persist: true,
    rocrate: {
      template: {
        "@id": "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "title",
    englishLabel: "Session Title",
    persist: true,
    rocrate: {
      template: {
        "name": "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "date",
    englishLabel: "Date",
    persist: true,
    rocrate: {
      template: {
        "dateCreated": "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "genre",
    englishLabel: "Genre", 
    persist: true,
    rocrate: {
      template: {
        "genre": "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "subjectLanguages",
    englishLabel: "Subject Languages",
    persist: true,
    rocrate: {
      template: {
        "ldac:subjectLanguage": "[languageObject]"
      }
    }
  } as FieldDefinition
];

/**
 * Setup field definition mocks
 */
export const setupFieldDefinitionMocks = () => {
  vi.spyOn(fieldDefinitionsOfCurrentConfig, "common", "get").mockReturnValue(
    getCommonFieldDefinitions()
  );
  
  vi.spyOn(fieldDefinitionsOfCurrentConfig, "session", "get").mockReturnValue(
    getSessionFieldDefinitions()
  );
  
  vi.spyOn(fieldDefinitionsOfCurrentConfig, "person", "get").mockReturnValue([
    {
      key: "fullName",
      englishLabel: "Full Name", 
      persist: true,
      rocrate: {
        template: {
          "name": "[v]"
        }
      }
    } as FieldDefinition,
    {
      key: "nickname",
      englishLabel: "Nickname",
      persist: true
    } as FieldDefinition
  ]);
};

/**
 * Create a mock Project with common properties
 */
export const createMockProject = (overrides: Partial<any> = {}): Project => {
  const mockProject = {
    displayName: "Test Project",
    directory: "/test/project",
    knownFields: new Map(),
    authorityLists: {
      accessChoicesOfCurrentProtocol: [
        { label: "CC BY 4.0", value: "CC BY 4.0" },
        { label: "CC BY-SA 4.0", value: "CC BY-SA 4.0" }
      ]
    },
    metadataFile: {
      getTextStringOrEmpty: vi.fn().mockImplementation((key: string) => {
        const defaults: { [key: string]: string } = {
          title: "Test Project Title",
          description: "Test project description", 
          id: "test-project-001",
          archiveConfigurationName: "lameta",
          ...overrides.metadata
        };
        return defaults[key] || "";
      }),
      getValue: vi.fn().mockImplementation((key: string) => {
        const defaults: { [key: string]: any } = {
          title: "Test Project Title",
          description: "Test project description",
          id: "test-project-001", 
          archiveConfigurationName: "lameta",
          ...overrides.metadata
        };
        return defaults[key];
      }),
      getTextProperty: vi.fn().mockImplementation((key: string) => {
        const defaults: { [key: string]: any } = {
          title: "Test Project Title",
          description: "Test project description",
          id: "test-project-001", 
          archiveConfigurationName: "lameta",
          ...overrides.metadata
        };
        return defaults[key];
      }),
      setTextStringProperty: vi.fn(),
      hasValue: vi.fn().mockReturnValue(true)
    },
    sessions: [],
    persons: [],
    ...overrides
  } as unknown as Project;

  return mockProject;
};

/**
 * Create a mock Session with common properties
 */
export const createMockSession = (overrides: Partial<any> = {}): Session => {
  const mockProperties = new Map();
  
  const mockSession = {
    displayName: "Test Session",
    directory: "/test/project/sessions/test-session",
    filePrefix: "test-session",
    knownFields: [], // Make it iterable for the forEach loop
    metadataFile: {
      properties: mockProperties, // Add the Map for properties
      getTextStringOrEmpty: vi.fn().mockImplementation((key: string) => {
        const defaults: { [key: string]: string } = {
          id: "test-session-001",
          title: "Test Session Title",
          description: "Test session description",
          date: "2024-01-01",
          genre: "Conversation",
          ...overrides.metadata
        };
        return defaults[key] || "";
      }),
      getValue: vi.fn().mockImplementation((key: string) => {
        const defaults: { [key: string]: any } = {
          id: "test-session-001", 
          title: "Test Session Title",
          description: "Test session description",
          date: "2024-01-01",
          genre: "Conversation",
          subjectLanguages: "eng",
          ...overrides.metadata
        };
        return defaults[key];
      }),
      getTextProperty: vi.fn().mockImplementation((key: string) => {
        const defaults: { [key: string]: any } = {
          id: "test-session-001", 
          title: "Test Session Title",
          description: "Test session description",
          date: "2024-01-01",
          genre: "Conversation",
          access: "CC BY 4.0",
          ...overrides.metadata
        };
        return defaults[key];
      }),
      setTextStringProperty: vi.fn(),
      hasValue: vi.fn().mockReturnValue(true)
    },
    files: [],
    participants: [],
    getAllContributionsToAllFiles: vi.fn().mockReturnValue([]),
    ...overrides
  } as unknown as Session;

  return mockSession;
};

/**
 * Create a mock Person with common properties
 */
export const createMockPerson = (overrides: Partial<any> = {}): Person => {
  const mockPerson = {
    displayName: "Test Person",
    directory: "/test/project/people/test-person",
    metadataFile: {
      getTextStringOrEmpty: vi.fn().mockImplementation((key: string) => {
        const defaults: { [key: string]: string } = {
          fullName: "John Doe",
          nickname: "John",
          howToContact: "john@example.com",
          ...overrides.metadata
        };
        return defaults[key] || "";
      }),
      getValue: vi.fn().mockImplementation((key: string) => {
        const defaults: { [key: string]: any } = {
          fullName: "John Doe",
          nickname: "John", 
          howToContact: "john@example.com",
          ...overrides.metadata
        };
        return defaults[key];
      }),
      setTextStringProperty: vi.fn(),
      hasValue: vi.fn().mockReturnValue(true)
    },
    ...overrides
  } as unknown as Person;

  return mockPerson;
};

/**
 * Setup all common mocks used across RO-Crate tests
 */
export const setupCommonMocks = () => {
  createStaticLanguageFinderMock();
  setupFieldDefinitionMocks();
  
  // Mock other common dependencies
  vi.mock("../../../../localization/LocalizationManager", () => ({
    default: {
      getLocalizedText: vi.fn().mockImplementation((key: string) => key)
    }
  }));
};

/**
 * Common RO-Crate exporter mocks
 */
export const setupExporterMocks = () => {
  vi.mock("../LanguageManager", () => ({
    languageManager: {
      clear: vi.fn(),
      getLanguageEntity: vi.fn(),
      getLanguageReference: vi.fn(),
      trackUsage: vi.fn(),
      getUsedLanguageEntities: vi.fn().mockReturnValue([]),
      getUnusedLanguageEntities: vi.fn().mockReturnValue([])
    },
    LanguageManager: vi.fn()
  }));

  vi.mock("../LicenseManager", () => ({
    LicenseManager: vi.fn().mockImplementation(() => ({
      setDefaultLicense: vi.fn(),
      setFileLicense: vi.fn(),
      getFileLicense: vi.fn(),
      getFileLicenseReference: vi.fn(), 
      ensureFileLicense: vi.fn(),
      clear: vi.fn(),
      getAllFileLicenses: vi.fn()
    })),
    getSessionLicenseId: vi
      .fn()
      .mockReturnValue("https://creativecommons.org/licenses/by/4.0/")
  }));

  vi.mock("../RoCrateValidator", () => ({
    RoCrateValidator: vi.fn().mockImplementation(() => ({
      validate: vi
        .fn()
        .mockReturnValue({ isValid: true, errors: [], warnings: [] })
    })),
    ensureSubjectLanguage: vi.fn()
  }));
};
