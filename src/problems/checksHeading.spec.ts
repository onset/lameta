import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import { Project } from "../model/Project/Project";
import { resetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { checksHeading, configurationChangesChecks } from "./checksHeading";

temp.track();

// the Edolo sample with this archive configuration
function loadEdolo(configuration: string): Project {
  const dir = Path.join(temp.mkdirSync("checks heading"), "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  const sprj = Path.join(dir, "Edolo sample.sprj");
  fs.writeFileSync(
    sprj,
    fs
      .readFileSync(sprj, "utf8")
      .replace(
        "<ArchiveConfigurationName>custom</ArchiveConfigurationName>",
        `<ArchiveConfigurationName>${configuration}</ArchiveConfigurationName>`,
      ),
  );
  return Project.fromDirectory(dir);
}

describe("configurationChangesChecks", () => {
  it("is true for checks of the configuration's own", () => {
    expect(
      configurationChangesChecks({ checks: { fileNameLength: {} } }, undefined, undefined),
    ).toBe(true);
    expect(configurationChangesChecks({ checks: {} }, undefined, undefined)).toBe(false);
  });

  it("is true for a field rule in the configuration's fields.json5", () => {
    expect(
      configurationChangesChecks({}, { session: [{ key: "title", required: true }] }, undefined),
    ).toBe(true);
    // a field that only changes how it looks adds no check
    expect(
      configurationChangesChecks(
        {},
        { session: [{ key: "title", multilingual: true }] },
        undefined,
      ),
    ).toBe(false);
  });

  it("counts a rule that is off only where lameta's own fields turn it on", () => {
    const off = { session: [{ key: "title", required: false }] };
    expect(configurationChangesChecks({}, off, undefined)).toBe(false);
    expect(configurationChangesChecks({}, off, { session: [{ key: "title" }] })).toBe(false);
    expect(
      configurationChangesChecks({}, off, { session: [{ key: "title", required: true }] }),
    ).toBe(true);
  });

  it("does not count a rule that is the same as lameta's own", () => {
    const rule = { session: [{ key: "id", maxLength: 20 }] };
    expect(configurationChangesChecks({}, rule, rule)).toBe(false);
    expect(configurationChangesChecks({}, rule, { session: [{ key: "id", maxLength: 30 }] })).toBe(
      true,
    );
  });

  it("is false with no settings and no fields", () => {
    expect(configurationChangesChecks(undefined, undefined, undefined)).toBe(false);
  });
});

describe("checksHeading", () => {
  afterAll(() => resetOtherConfigurationSettings());

  it("names the archive by its short name", () => {
    expect(checksHeading("ELAR")).toBe("ELAR Checks");
  });

  it("says Baseline when only lameta's own checks run", () => {
    expect(checksHeading(undefined)).toBe("Baseline Checks");
  });

  it("is the configuration's folder name when the configuration adds to lameta's checks", () => {
    expect(checksHeading(loadEdolo("ELAR").checksConfigurationName)).toBe("ELAR Checks");
  });

  it("is Baseline for a configuration that adds nothing to lameta's checks", () => {
    expect(checksHeading(loadEdolo("PARADISEC").checksConfigurationName)).toBe("Baseline Checks");
  });

  // every configuration that comes with lameta, decided by its own files
  it("names exactly the configurations that have checks or field rules of their own", () => {
    const named = fs
      .readdirSync("archive-configurations", { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== "lameta")
      .map((d) => d.name)
      .filter((name) => loadEdolo(name).checksConfigurationName === name);
    expect(named).toEqual(["ELAR"]);
  });

  it("is Baseline for a project with no archive, Other, or a configuration that lameta lacks", () => {
    for (const configuration of ["", "default", "custom", "NoSuchArchive", "lameta"])
      expect(checksHeading(loadEdolo(configuration).checksConfigurationName)).toBe(
        "Baseline Checks",
      );
  });
});
