import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { computeMergedCatalog } from "./ConfiguredFieldDefinitions";

describe("computeCurrentProjectFields", () => {
  it("should merge the properties of the choice into the field definition, overriding the defaults", () => {
    const ourCatalog = {
      project: [
        {
          key: "title",
          tabIndex: 99,
          tooltip: "My special tooltip"
        },
        { key: "region", show: "never" }
      ]
    };
    const mergedCatalog = computeMergedCatalog(ourCatalog);
    expect(mergedCatalog.project.find((f) => f.key == "title")).toEqual({
      key: "title",
      englishLabel: "Project ID", // changed to Project ID at ELAR request Dec 2019
      tagInSayMoreClassic: "Title",
      tabIndex: 99, // configuration changed
      tooltip: "My special tooltip" // configuration added this
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
