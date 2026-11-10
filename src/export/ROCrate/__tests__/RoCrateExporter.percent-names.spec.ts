import { describe, it, expect, beforeAll } from "vite-plus/test";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { Project } from "../../../model/Project/Project";
import { getRoCrate } from "../RoCrateExporter";

describe("RO-Crate export of names that hold a percent sign", () => {
  const folderName = "Percent %20 name";
  let graph: any[];

  beforeAll(async () => {
    const dir = Path.join(temp.mkdirSync("rocrate percent names"), "Edolo sample");
    fs.copySync("sample data/Edolo sample", dir);
    const sessionDir = Path.join(dir, "Sessions", folderName);
    fs.renameSync(Path.join(dir, "Sessions", "ETR009"), sessionDir);
    fs.renameSync(
      Path.join(sessionDir, "ETR009.session"),
      Path.join(sessionDir, `${folderName}.session`),
    );
    fs.writeFileSync(Path.join(sessionDir, "a b.wav"), "space");
    fs.writeFileSync(Path.join(sessionDir, "a%20b.wav"), "percent");

    const project = Project.fromDirectory(dir);
    const crate: any = await getRoCrate(project, project);
    graph = crate["@graph"];
  });

  const decodedIds = () =>
    graph
      .map((e) => e["@id"])
      .filter((id): id is string => typeof id === "string")
      .map(decodeURIComponent);

  it("lists both files whose names differ only by a space and a literal %20", () => {
    expect(decodedIds()).toEqual(
      expect.arrayContaining([
        `Sessions/${folderName}/a b.wav`,
        `Sessions/${folderName}/a%20b.wav`,
      ]),
    );
  });

  it("gives the session's metadata file an id that decodes to its real path", () => {
    expect(decodedIds()).toContain(`Sessions/${folderName}/${folderName}.session`);
  });
});
