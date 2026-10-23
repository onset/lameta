import { describe, it, expect, beforeAll } from "vite-plus/test";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { Project } from "../model/Project/Project";
import { getRoCrate } from "./ROCrate/RoCrateExporter";
import { makeParadisecSessionCsv } from "./ParadisecCsvExporter";

// lameta always writes a <role>, but a hand-edited file or one from another tool may not
describe("export of a session whose contributor has no role element", () => {
  let project: Project;

  beforeAll(() => {
    const dir = Path.join(temp.mkdirSync("contributor without role"), "Edolo sample");
    fs.copySync("sample data/Edolo sample", dir);
    const sessionPath = Path.join(dir, "Sessions", "ETR009", "ETR009.session");
    const xml = fs.readFileSync(sessionPath, "utf8");
    fs.writeFileSync(
      sessionPath,
      xml.replace(
        "</Session>",
        "<Contributions><contributor><name>Awi Heole</name></contributor></Contributions></Session>",
      ),
    );
    project = Project.fromDirectory(dir);
  });

  it("makes an RO-Crate", async () => {
    const crate: any = await getRoCrate(project, project);
    expect(crate["@graph"].length).toBeGreaterThan(0);
  });

  it("makes a PARADISEC session CSV", () => {
    expect(makeParadisecSessionCsv(project, () => true)).toContain("ETR009");
  });
});
