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
import { fi } from "date-fns/locale";

temp.track(); // cleanup on exit: doesn't work

let project: Project;
let projectDir: string;

describe("Imdi generation Funding Project", () => {
  beforeEach(() => {
    projectDir = temp.mkdirSync("lameta imdi funding  project test");
    project = Project.fromDirectory(projectDir);
  });

  afterAll(() => {
    fs.emptyDirSync(projectDir);
    fs.removeSync(projectDir);
  });

  it("should export collection and funding project data correctly", () => {
    TestFields([
      { key: "collectionTitle", xpath: "Corpus/MDGroup/Title" },
      {
        key: "collectionKey",
        xpath: "Corpus/MDGroup/Keys/Key[@Name='CorpusId']"
      },
      {
        key: "collectionDescription",
        xpath: "Corpus/MDGroup/Description[@Name='short_description']"
      },
      {
        key: "collectionSteward",
        xpath: "Corpus/MDGroup/Actors/Actor[@Role='Collection Steward']/Name"
      },
      {
        key: "collectionDeputySteward",
        xpath:
          "Corpus/MDGroup/Actors/Actor[@Role='Deputy Collection Steward']/Name"
      },
      {
        key: "collectionDepositor",
        xpath: "Corpus/MDGroup/Actors/Actor[@Role='Depositor']/Name",
        value: "Jane"
      },
      // {
      //   key: "collectionDepositor",
      //   xpath: "Corpus/MDGroup/Actors/Actor[@Role='Depositor']/Name",
      //   value: "JOE"
      // TODO: test multiple. Would need to make toMatch() match any
      // },
      { key: "fundingProjectId", xpath: "Corpus/MDGroup/Project/Id" },
      { key: "fundingProjectTitle", xpath: "Corpus/MDGroup/Project/Title" },
      {
        key: "fundingProjectFunder",
        xpath: "Corpus/MDGroup/Keys/Key[@Name='Funding Body']"
      },
      {
        key: "fundingProjectAffiliation",
        xpath: "Corpus/MDGroup/Project/Contact/Organisation"
      },
      {
        key: "fundingProjectLead",
        xpath: "Corpus/MDGroup/Project/Contact/Name"
      },
      { key: "contactPerson", xpath: "Project/Contact/Name" }
    ]);
  });
});

// use value when you will be adding multiple fields with the same xpath
function TestFields(fields: { key: string; xpath: string; value?: string }[]) {
  fields.forEach((f) =>
    project.properties.setText(f.key, f.value || "a value for " + f.key)
  );
  const x = ImdiGenerator.generateCorpus(IMDIMode.RAW_IMDI, project, [], true);
  setResultXml(x);

  // TODO: test multiple. Would need to make toMatch() match any so that we can test
  // for multiple depositors

  fields.forEach((f) =>
    expect(f.xpath).toMatch(f.value || "a value for " + f.key)
  );
}
