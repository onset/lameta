import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import { Project } from "../model/Project/Project";
import { resetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { checksHeading } from "./checksHeading";

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

describe("checksHeading", () => {
  afterAll(() => resetOtherConfigurationSettings());

  it("names the archive by its short name", () => {
    expect(checksHeading("ELAR")).toBe("ELAR Checks");
  });

  it("says Baseline when only lameta's own checks run", () => {
    expect(checksHeading(undefined)).toBe("Baseline Checks");
  });

  it("is the configuration's folder name for a project with an archive", () => {
    expect(checksHeading(loadEdolo("ELAR").checksConfigurationName)).toBe("ELAR Checks");
    expect(checksHeading(loadEdolo("PARADISEC").checksConfigurationName)).toBe("PARADISEC Checks");
  });

  it("is Baseline for a project with no archive, Other, or a configuration that lameta lacks", () => {
    for (const configuration of ["", "default", "custom", "NoSuchArchive", "lameta"])
      expect(checksHeading(loadEdolo(configuration).checksConfigurationName)).toBe(
        "Baseline Checks",
      );
  });
});
