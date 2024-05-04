import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import {
  setResultXml,
  xexpect as expect,
  count,
  value,
  xexpect
} from "../other/xmlUnitTestUtils";
import temp from "temp";
import * as fs from "fs-extra";
import assert from "assert";
import {
  describe,
  it,
  vi,
  beforeAll,
  afterAll,
  test,
  afterEach,
  beforeEach
} from "vitest";
import { GetProjectFileWithOneField } from "../model/Project/WriteProject.spec";

temp.track(); // cleanup on exit: doesn't work

let project: Project;
let projectDir: string;

describe("Imdi generation for images", () => {
  beforeEach(() => {
    projectDir = temp.mkdirSync("lameta imdi actor generator test");
    project = Project.fromDirectory(projectDir);
  });

  afterEach(() => {
    fs.emptyDirSync(projectDir);
    fs.removeSync(projectDir);
  });

  test("fundingProjectTitle goes to the right place", () => {
    // NB: in ELAR, at least, this will appear as "Collection Title"
    project.properties.setText("fundingProjectTitle", "my title");
    project.properties.setText("projectDescription", "my description");
    project.properties.setText("collectionSteward", "my steward");
    const x = ImdiGenerator.generateCorpus(
      IMDIMode.RAW_IMDI,
      project,
      [],
      true
    );

    setResultXml(x);

    // From Hanna: Collection Title = Corpus/Title
    // From Hanna: Collection Key = Corpus/MDGroup/Keys/Key[@Name='CorpusId']
    // The ELAR fields.json renames the label for fundingProjectTitle to "Collection Title"
    expect("//Corpus/Title").toMatch("my title");

    // From Hanna: Collection Description= Corpus/Description[@Name='short_description']
    // The ELAR fields.json renames the label for projectDescription to "Collection Description"
    expect('//Corpus/Description[@Name="short_description"]').toMatch(
      "my description"
    );
    // From Hanna: Collection Steward = Corpus/MDGroup/Actors/Actor[@Role='Collection Steward']
  });
});
