import { describe, it, expect } from "vitest";
import * as fs from "fs";
import { makeFieldDefinitionCatalog } from "../model/field/ConfiguredFieldDefinitions";
import { kProjectTabOfForm } from "../components/project/projectTabOfForm";
import { getFileTabOfField } from "../components/fileTabOfField";

// "default" is the built-in configuration (lameta/fields.json5 alone)
const configurations = [
  "default",
  ...fs
    .readdirSync("archive-configurations", { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name),
];

// A field that is never shown has no tab, and navigateTo() reports that.
describe("every form used by an archive configuration has a tab", () => {
  it.each(configurations)("%s", (configuration) => {
    const catalog = makeFieldDefinitionCatalog(configuration);
    const withoutTab: string[] = [];
    for (const d of catalog.project) {
      if (d.visibility === "never") continue;
      if (!kProjectTabOfForm[d.form || "primary"])
        withoutTab.push(`project ${d.key} (form "${d.form || "primary"}")`);
    }
    for (const area of ["session", "person"] as const) {
      for (const d of catalog[area]) {
        if (d.visibility === "never") continue;
        if (!getFileTabOfField(area, d.key, d.form))
          withoutTab.push(`${area} ${d.key} (form "${d.form || "primary"}")`);
      }
    }
    expect(withoutTab).toEqual([]);
  });
});
