import { describe, it, expect } from "vitest";
import {
  fieldDefinitionsOfCurrentConfig,
  prepareGlobalFieldDefinitionCatalog
} from "../../../model/field/ConfiguredFieldDefinitions";

describe("Field Definition Approach Comparison", () => {
  it("should test setupRealFieldDefinitions directly", () => {
    // Use the imported function directly
    prepareGlobalFieldDefinitionCatalog("lameta");

    // Check that fields were loaded
    const sessionFields = fieldDefinitionsOfCurrentConfig.session;
    const commonFields = fieldDefinitionsOfCurrentConfig.common;

    console.log(
      `Loaded ${sessionFields.length} session fields and ${commonFields.length} common fields`
    );

    // Verify we have more than just empty arrays
    expect(sessionFields.length).toBeGreaterThan(0);
    expect(commonFields.length).toBeGreaterThan(0);

    // Verify specific fields exist from the real configuration
    const genreField = sessionFields.find((f) => f.key === "genre");
    expect(genreField).toBeDefined();

    const languageField = commonFields.find((f) => f.key === "language");
    expect(languageField).toBeDefined();
  });

  it("should validate RO-Crate mappings from real config", () => {
    // Load real config
    prepareGlobalFieldDefinitionCatalog("lameta");

    // Test that genre field has proper RO-Crate mapping
    const genreField = fieldDefinitionsOfCurrentConfig.session.find(
      (f) => f.key === "genre"
    );
    expect(genreField?.rocrate).toBeDefined();
    expect(genreField?.rocrate?.key).toBe("ldac:linguisticGenre");

    // Test that language field has proper RO-Crate template
    const languageField = fieldDefinitionsOfCurrentConfig.common.find(
      (f) => f.key === "language"
    );
    expect(languageField?.rocrate).toBeDefined();
    expect(languageField?.rocrate?.template?.["@type"]).toBe("Language");
  });
});
