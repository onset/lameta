import ImdiGenerator from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import {
  setResultXml,
  xexpect as expect,
  count,
  value,
} from "../other/xmlUnitTestUtils";
import ImdiBundler from "./ImdiBundler";
import temp from "temp";
import * as fs from "fs-extra";
import * as Path from "path";
import * as glob from "glob";

temp.track(); // cleanup on exit: doesn't work
let project: Project;
let rootDir = "";
beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
});
beforeEach(() => {
  rootDir = temp.mkdirSync("ImdiBundlerTests");
  ImdiBundler.saveImdiBundleToFolder(project, rootDir, true, (f) => true, true);
});

describe("Consent Form Inclusion", () => {
  it("The consent form dummy session to look reasonable", () => {
    const xml = fs.readFileSync(
      Path.join(rootDir, "Edolo sample", "ConsentDocuments.imdi"),
      "utf8"
    );
    expect(xml).toBeTruthy();
    setResultXml(xml);
    expect(count("METATRANSCRIPT")).toBe(1);
    expect("METATRANSCRIPT/Session/Name").toMatch(
      "Edolo Sample consent documents"
    );
  });

  it("should contain Content", () => {
    expect("METATRANSCRIPT/Session/MDGroup/Content/Genre").toMatch(
      "Secondary Document"
    );
    expect("METATRANSCRIPT/Session/MDGroup/Content/SubGenre").toMatch(
      "Consent Forms"
    );
  });

  it("There should be some consent files int the Consent folder", () => {
    const paths = glob.sync(Path.join(rootDir, "**/ConsentDocuments/*.*"));
    expect(paths.length).toBe(2);
  });
});
