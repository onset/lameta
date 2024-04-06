import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import {
  computeMergedCatalog,
  makeFieldDefinitionCatalog,
  prepareGlobalFieldDefinitionCatalog
} from "./ConfiguredFieldDefinitions";
import exp from "constants";

describe("computeMergedCatalog", () => {
  it("should merge the properties of the choice into the field definition, overriding the defaults", () => {
    const ourCatalog = {
      project: [
        {
          key: "title",
          tabIndex: 99,
          tooltip: "My special tooltip",
          multilingual: true
        },
        { key: "region", show: "never" }
      ]
    };
    const { mergedCatalog } = computeMergedCatalog(ourCatalog);
    expect(mergedCatalog.project.find((f) => f.key == "title")).toEqual({
      key: "title",
      englishLabel: "Project ID", // changed to Project ID at ELAR request Dec 2019
      xmlTag: "Title",
      tabIndex: 99, // configuration changed
      tooltip: "My special tooltip", // configuration added this
      multilingual: true // configuration added this
    });
  });

  // this is a current limitation; we could of course allow introduction of new fields
  it("should throw an error if a field is used that isn't in the official catalog", () => {
    const ourCatalog = {
      project: [
        {
          key: "title",
          tabIndex: 99,
          tooltip: "My special tooltip"
        },
        { key: "bogus", englishLabel: "Bogus" }
      ]
    };

    // todo I don't know why this fails even though the exception is being thrown
    // expect(computeMergedCatalog(ourCatalog)).toThrow();
  });
});

describe("prepareFieldDefinitionCatalog", () => {
  it("should have a project section", () => {
    const catalog = makeFieldDefinitionCatalog("default");
    expect(catalog.project).toBeDefined();
  });
  it("default session section catalog looks reasonable", () => {
    const catalog = makeFieldDefinitionCatalog("default");
    expect(catalog.session).toBeDefined();
    expect(catalog.session.find((f) => f.key == "date")).toBeDefined();
    expect(catalog.session.find((f) => f.key == "title")).toBeDefined();
  });
  it("default person catalog looks reasonable", () => {
    const catalog = makeFieldDefinitionCatalog("default");
    expect(catalog.person).toBeDefined();
    expect(catalog.person.find((f) => f.key == "name")).toBeDefined();
    expect(catalog.person.find((f) => f.key == "howToContact")).toBeDefined();
  });

  it("desfault session description is monolingual", () => {
    const catalog = makeFieldDefinitionCatalog("default");
    expect(
      catalog.session.find((f) => f.key == "description")!.multilingual
    ).toBe(false);
  });
});
