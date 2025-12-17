import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import {
  setResultXml,
  xexpect as expect,
  count,
  printResultXml
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
import {
  SetOtherConfigurationSettings,
  resetOtherConfigurationSettings
} from "../model/Project/OtherConfigurationSettings";
import { setupLanguageFinderForTests } from "../languageFinder/LanguageFinder";

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
      { key: "title", xpath: "Corpus/Title" },
      {
        key: "collectionDescription",
        xpath: "Corpus/Description[@Name='short_description']"
      },
      {
        key: "collectionKey",
        xpath: "Corpus/MDGroup/Keys/Key[@Name='CorpusId']"
      },

      {
        key: "collectionSteward",
        xpath: "Corpus/MDGroup/Actors/Actor[Role='Collection Steward']/Name"
      },
      {
        key: "collectionDeputySteward",
        xpath:
          "Corpus/MDGroup/Actors/Actor[Role='Deputy Collection Steward']/Name"
      },
      {
        key: "depositor",
        xpath: "Corpus/MDGroup/Actors/Actor[Role='Depositor']/Name",
        value: "Jane"
      },
      // TODO: if the DeputySteward or Depositor has a comma-delimited list, then multiple Actors are emitted
      // We don't have a way to test that yet.

      { key: "grantId", xpath: "Corpus/MDGroup/Project/Id" },
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
        key: "contactPerson",
        xpath: "Corpus/MDGroup/Project/Contact/Name"
      }
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
    expect("METATRANSCRIPT/" + f.xpath).toMatch(
      f.value || "a value for " + f.key
    )
  );
}

// Set up staticLanguageFinder for ISO639-3 code lookups
setupLanguageFinderForTests();

describe("IMDI corpus multilingual field export", () => {
  let project: Project;
  let projectDir: string;

  beforeEach(() => {
    resetOtherConfigurationSettings();
    projectDir = temp.mkdirSync("lameta imdi corpus multilingual test");
    project = Project.fromDirectory(projectDir);
  });

  afterEach(() => {
    resetOtherConfigurationSettings();
    fs.emptyDirSync(projectDir);
    fs.removeSync(projectDir);
  });

  it("should export multilingual Corpus/Title with LanguageId attributes when using ELAR schema", () => {
    // Configure for ELAR schema which supports multilingual fields
    SetOtherConfigurationSettings({
      configurationFullName: "ELAR",
      archiveUsesImdi: true,
      archiveUsesParadisec: false,
      showRoCrate: false,
      fileNameRules: "ASCII",
      imdiSchema: "IMDI_3.0_elar.xsd"
    });

    // Set multilingual title
    const titleField = project.properties.getTextField("title");
    titleField.setTextAxis("en", "English Title");
    titleField.setTextAxis("es", "Título en Español");

    const xml = ImdiGenerator.generateCorpus(
      IMDIMode.RAW_IMDI,
      project,
      [],
      true
    );
    setResultXml(xml);
    // printResultXml();

    // Should have two Title elements with LanguageId attributes
    expect("METATRANSCRIPT/Corpus/Title[@LanguageId]").toHaveCount(2);
    expect("METATRANSCRIPT/Corpus/Title[@LanguageId='ISO639-3:eng']").toMatch(
      "English Title"
    );
    expect("METATRANSCRIPT/Corpus/Title[@LanguageId='ISO639-3:spa']").toMatch(
      "Título en Español"
    );
  });

  it("should export multilingual Corpus/Description with LanguageId attributes when using ELAR schema", () => {
    // Configure for ELAR schema
    SetOtherConfigurationSettings({
      configurationFullName: "ELAR",
      archiveUsesImdi: true,
      archiveUsesParadisec: false,
      showRoCrate: false,
      fileNameRules: "ASCII",
      imdiSchema: "IMDI_3.0_elar.xsd"
    });

    // Set multilingual description
    const descField = project.properties.getTextField("collectionDescription");
    descField.setTextAxis("en", "English description of collection");
    descField.setTextAxis("es", "Descripción en español");

    const xml = ImdiGenerator.generateCorpus(
      IMDIMode.RAW_IMDI,
      project,
      [],
      true
    );
    setResultXml(xml);
    // printResultXml();

    // Should have two Description elements with LanguageId attributes
    expect(
      "METATRANSCRIPT/Corpus/Description[@LanguageId][@Name='short_description']"
    ).toHaveCount(2);
    expect(
      "METATRANSCRIPT/Corpus/Description[@LanguageId='ISO639-3:eng'][@Name='short_description']"
    ).toMatch("English description of collection");
    expect(
      "METATRANSCRIPT/Corpus/Description[@LanguageId='ISO639-3:spa'][@Name='short_description']"
    ).toMatch("Descripción en español");
  });

  it("should export single Corpus/Title without LanguageId when using standard IMDI schema", () => {
    // Standard IMDI schema (default)
    resetOtherConfigurationSettings();

    // Set multilingual title (but standard schema should only use first language)
    const titleField = project.properties.getTextField("title");
    titleField.setTextAxis("en", "English Title");
    titleField.setTextAxis("es", "Título en Español");

    const xml = ImdiGenerator.generateCorpus(
      IMDIMode.RAW_IMDI,
      project,
      [],
      true
    );
    setResultXml(xml);

    // Should have one Title element without LanguageId
    expect("METATRANSCRIPT/Corpus/Title").toHaveCount(1);
    expect("METATRANSCRIPT/Corpus/Title[@LanguageId]").toHaveCount(0);
    expect("METATRANSCRIPT/Corpus/Title").toMatch("English Title");
  });

  it("should NOT export raw multilingual format like [[en]]text[[es]]text in Corpus/Title", () => {
    // Configure for ELAR schema
    SetOtherConfigurationSettings({
      configurationFullName: "ELAR",
      archiveUsesImdi: true,
      archiveUsesParadisec: false,
      showRoCrate: false,
      fileNameRules: "ASCII",
      imdiSchema: "IMDI_3.0_elar.xsd"
    });

    // Set multilingual title
    const titleField = project.properties.getTextField("title");
    titleField.setTextAxis("en", "English Title");
    titleField.setTextAxis("es", "Título en Español");

    const xml = ImdiGenerator.generateCorpus(
      IMDIMode.RAW_IMDI,
      project,
      [],
      true
    );
    setResultXml(xml);

    // The raw format should NOT appear anywhere in the XML
    expect(xml.indexOf("[[en]]") === -1).toBe(true);
    expect(xml.indexOf("[[es]]") === -1).toBe(true);
  });
});
