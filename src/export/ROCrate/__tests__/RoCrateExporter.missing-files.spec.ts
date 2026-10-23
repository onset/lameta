import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { Project } from "../../../model/Project/Project";
import { getRoCrate } from "../RoCrateExporter";
import { startCollectingWarnings, stopCollectingWarnings } from "../../ExportWarningCollector";

// a listed file can be missing at export time: a link whose media folder is not on this
// machine, or a file deleted (in Explorer, or remotely by a sync service) after lameta loaded it
describe("RO-Crate export of listed files that are not on disk", () => {
  const missing = [
    "Sessions/ETR009/far away.wav",
    "Sessions/ETR009/ETR009_AText.txt",
    "DescriptionDocuments/pretend description.txt",
    "OtherDocuments/some other doc.txt",
  ];
  let tmpFolder: string;
  let ids: string[];
  let warnings: string[];

  beforeAll(async () => {
    tmpFolder = temp.mkdirSync("rocrate missing files");
    const dir = Path.join(tmpFolder, "Edolo sample");
    fs.copySync("sample data/Edolo sample", dir);
    fs.writeFileSync(
      Path.join(dir, "Sessions", "ETR009", "far away.wav.link"),
      "recordings/does-not-exist.wav",
    );
    const project = Project.fromDirectory(dir);
    missing
      .filter((p) => !p.endsWith("far away.wav"))
      .forEach((p) => fs.removeSync(Path.join(dir, p)));

    startCollectingWarnings();
    try {
      const crate: any = await getRoCrate(project, project);
      ids = crate["@graph"]
        .map((e: any) => e["@id"])
        .filter((id: unknown): id is string => typeof id === "string")
        .map(decodeURIComponent);
    } finally {
      warnings = stopCollectingWarnings();
    }
  });

  afterAll(() => {
    fs.removeSync(tmpFolder);
  });

  it("leaves the missing files out of the crate", () => {
    missing.forEach((p) => expect(ids).not.toContain(p));
  });

  it("still lists the files that are there", () => {
    expect(ids).toContain("Sessions/ETR009/ETR009_Careful.mp3");
  });

  it("warns once for each missing file", () => {
    expect(warnings.length).toBe(missing.length);
  });
});
