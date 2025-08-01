import { describe, it, expect } from "vitest";
import {
  fieldDefinitionsOfCurrentConfig,
  prepareGlobalFieldDefinitionCatalog
} from "../../../model/field/ConfiguredFieldDefinitions";

describe("RO-Crate Field Integration Tests", () => {
  it("should load and validate real field definitions from fields.json5", () => {
    // Load the real field configuration directly
    prepareGlobalFieldDefinitionCatalog("lameta");

    // Verify we have the actual field definitions
    const sessionFields = fieldDefinitionsOfCurrentConfig.session;
    const projectFields = fieldDefinitionsOfCurrentConfig.project;
    const commonFields = fieldDefinitionsOfCurrentConfig.common;

    // These are actual fields from the real fields.json5
    expect(sessionFields.find((f) => f.key === "genre")).toBeDefined();
    expect(sessionFields.find((f) => f.key === "languages")).toBeDefined();
    expect(sessionFields.find((f) => f.key === "participants")).toBeDefined();
    expect(sessionFields.find((f) => f.key === "keyword")).toBeDefined();

    expect(projectFields.find((f) => f.key === "title")).toBeDefined();
    expect(
      projectFields.find((f) => f.key === "collectionDescription")
    ).toBeDefined();
    expect(projectFields.find((f) => f.key === "grantId")).toBeDefined();

    expect(commonFields.find((f) => f.key === "language")).toBeDefined();
    expect(commonFields.find((f) => f.key === "person")).toBeDefined();

    console.log(
      `Loaded ${sessionFields.length} session fields, ${projectFields.length} project fields, ${commonFields.length} common fields`
    );
  });

  it("should have proper RO-Crate templates from real fields.json5", () => {
    // Load real configuration
    prepareGlobalFieldDefinitionCatalog("lameta");

    const genreField = fieldDefinitionsOfCurrentConfig.session.find(
      (f) => f.key === "genre"
    );
    const languageField = fieldDefinitionsOfCurrentConfig.common.find(
      (f) => f.key === "language"
    );
    const keywordField = fieldDefinitionsOfCurrentConfig.session.find(
      (f) => f.key === "keyword"
    );

    // Verify these have the actual RO-Crate configuration from fields.json5
    expect(genreField?.rocrate).toBeDefined();
    expect(genreField?.rocrate?.key).toBe("ldac:linguisticGenre");
    expect(genreField?.rocrate?.array).toBe(true);
    expect(genreField?.rocrate?.template).toEqual({
      "@id": "[v]",
      "@type": "DefinedTerm"
    });

    expect(languageField?.rocrate).toBeDefined();
    expect(languageField?.rocrate?.template).toEqual({
      "@id": "#language_[code]",
      "@type": "Language",
      code: "[code]",
      name: "[languageName]"
    });

    expect(keywordField?.rocrate).toBeDefined();
    expect(keywordField?.rocrate?.key).toBe("keywords");
  });
});
