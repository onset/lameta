import { vi } from "vitest";
import { Project } from "../../../../model/Project/Project";
import { Session } from "../../../../model/Project/Session/Session";
import { Person } from "../../../../model/Project/Person/Person";
import { FieldDefinition } from "../../../../model/field/FieldDefinition";
import { fieldDefinitionsOfCurrentConfig } from "../../../../model/field/ConfiguredFieldDefinitions";

/**
 * RO-Crate Test Setup Utilities
 *
 * ## 🎯 Quick Start for New Tests:
 *
 * **For 90% of RO-Crate tests, use:**
 * ```typescript
 * setupCommonMocks(true); // Uses real fields.json5 with 40+ actual fields
 * ```
 *
 * **Only use mocks when testing error conditions:**
 * ```typescript
 * setupCommonMocks(false); // Uses ~10 mock fields for controlled testing
 * ```
 *
 * ## 📋 What's Available:
 * - `setupCommonMocks(true)` - Real field definitions (recommended)
 * - `setupCommonMocks(false)` - Mock field definitions (edge cases only)
 * - `setupRealFieldDefinitions()` - Direct real field loading
 * - `setupFieldDefinitionMocks()` - Direct mock field loading
 * - `createMockProject()` - Mock project objects
 * - `createMockSession()` - Mock session objects
 * - `createMockPerson()` - Mock person objects
 */

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
        name: "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "description",
    englishLabel: "Description",
    persist: true,
    rocrate: {
      template: {
        description: "[v]"
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
        code: "[code]",
        name: "[languageName]"
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
        genre: "[v]"
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
        name: "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "date",
    englishLabel: "Date",
    persist: true,
    rocrate: {
      template: {
        dateCreated: "[v]"
      }
    }
  } as FieldDefinition,
  {
    key: "genre",
    englishLabel: "Genre",
    persist: true,
    rocrate: {
      template: {
        genre: "[v]"
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
 *
 * ⚠️  WARNING: Use setupRealFieldDefinitions() instead for most tests!
 *
 * ## When to use Mock Field Definitions:
 * - Testing specific error conditions with malformed field data
 * - Testing edge cases that don't exist in real configuration
 * - Testing with intentionally broken or incomplete field definitions
 * - Unit tests that need precise control over field structure
 * - Performance-critical tests avoiding file system operations
 *
 * ## When NOT to use Mock Field Definitions:
 * - Integration testing (use real fields instead)
 * - Testing actual RO-Crate export functionality
 * - Validating field configuration works correctly
 * - Testing with production-like data
 *
 * Example of when mocks are appropriate:
 * ```typescript
 * // Testing error handling with missing RO-Crate template
 * setupFieldDefinitionMocks();
 * const brokenField = getSessionFieldDefinitions()[0];
 * delete brokenField.rocrate; // Intentionally break the field
 * ```
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
          name: "[v]"
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
 * Setup real field definitions from fields.json5
 *
 * ✅ RECOMMENDED: Use this for most RO-Crate tests!
 *
 * ## Why use Real Field Definitions:
 * - Integration testing - ensures field configuration works with actual data
 * - Catches issues when fields.json5 is broken or misconfigured
 * - Tests the actual RO-Crate templates defined in the configuration
 * - More accurate representation of production behavior
 * - Provides 40+ real fields vs ~10 mock stubs
 * - Validates actual RO-Crate mappings like ldac:linguisticGenre
 *
 * ## When to use Real Field Definitions:
 * - Testing RO-Crate export functionality (most common case)
 * - Integration tests validating complete workflows
 * - Tests that need realistic field data and RO-Crate templates
 * - Catching configuration issues in fields.json5
 *
 * Example usage:
 * ```typescript
 * // For most RO-Crate export tests
 * setupRealFieldDefinitions();
 * const genreField = fieldDefinitionsOfCurrentConfig.session.find(f => f.key === "genre");
 * expect(genreField?.rocrate?.key).toBe("ldac:linguisticGenre"); // Real mapping
 * ```
 *
 * This uses the actual field configuration that the app uses in production.
 */
export const setupRealFieldDefinitions = () => {
  // Import the real configuration loading function
  const {
    prepareGlobalFieldDefinitionCatalog
  } = require("../../../model/field/ConfiguredFieldDefinitions");

  // Load the default lameta configuration (same as production)
  prepareGlobalFieldDefinitionCatalog("lameta");

  // No mocking needed - the real fieldDefinitionsOfCurrentConfig is now populated
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
 *
 * @param useRealFieldDefinitions - if true, uses real fields.json5; if false, uses mocks
 *
 * ## 🎯 Quick Decision Guide:
 *
 * **For 90% of RO-Crate tests, use `setupCommonMocks(true)`**
 *
 * ## ✅ Use Real Field Definitions (`true`) when:
 * - Testing RO-Crate export functionality (most common)
 * - Integration testing complete workflows
 * - Validating actual field configuration works
 * - Testing with production-like data
 * - Catching issues in fields.json5 configuration
 *
 * ## ⚠️ Use Mock Field Definitions (`false`) only when:
 * - Testing specific error conditions with malformed fields
 * - Testing edge cases that don't exist in real configuration
 * - Unit testing that needs precise control over field structure
 * - Testing error handling with intentionally broken field definitions
 *
 * ## 📝 Examples:
 *
 * ```typescript
 * // ✅ RECOMMENDED: For typical RO-Crate export tests
 * setupCommonMocks(true);
 * // Gets 40+ real fields with actual RO-Crate templates
 *
 * // ⚠️ ONLY when testing error conditions:
 * setupCommonMocks(false);
 * const fields = getSessionFieldDefinitions();
 * delete fields[0].rocrate; // Break field to test error handling
 * ```
 *
 * ## 🔍 What you get:
 * - **Real fields**: 22 session + 19 project + 3 common = 44 fields with production RO-Crate templates
 * - **Mock fields**: ~10 basic stubs for controlled testing scenarios
 */
export const setupCommonMocks = (useRealFieldDefinitions: boolean = true) => {
  createStaticLanguageFinderMock();

  if (useRealFieldDefinitions) {
    setupRealFieldDefinitions();
  } else {
    setupFieldDefinitionMocks();
  }

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
