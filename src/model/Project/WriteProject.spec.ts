import { ProjectMetadataFile } from "./Project";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { EncounteredVocabularyRegistry } from "./EncounteredVocabularyRegistry";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  setResultXml,
  xexpect,
  count,
  value
} from "../../other/xmlUnitTestUtils";
let projectDirectory;
let projectName;

describe("Project Write", () => {
  beforeEach(async () => {
    projectDirectory = temp.mkdirSync("test");
    projectName = Path.basename(projectDirectory);
  });
  afterEach(async () => {
    temp.cleanupSync();
  });

  it("should round-trip AnalysisISO3CodeAndName", () => {
    AttemptRoundTripOfOneField(
      "analysisIso3CodeAndName",
      "AnalysisISO3CodeAndName",
      "foo: Foo"
    );
  });
  it("should round-trip ArchiveConfigurationName", () => {
    AttemptRoundTripOfOneField(
      "archiveConfigurationName",
      "ArchiveConfigurationName",
      "FooBar"
    );
  });
  it("should write vernacularIso3CodeAndName with same case as SayMore Windows Classic does", () => {
    const f = GetProjectFileWithOneField(
      "VernacularISO3CodeAndName",
      "foo: Foo"
    );
    f.properties.setText("vernacularIso3CodeAndName", "bar: Bar");
    f.save(true);
    expect(
      fs.readFileSync(f.metadataFilePath).indexOf("VernacularISO3CodeAndName")
    ).toBeGreaterThan(-1);

    //console.log("abc:" + fs.readFileSync(f.metadataFilePath));

    expect(
      fs
        .readFileSync(f.metadataFilePath)
        .indexOf(
          "<VernacularISO3CodeAndName>bar: Bar</VernacularISO3CodeAndName>"
        )
    ).toBeGreaterThan(-1);
  });
  it("should write languages", () => {
    const f = GetProjectFileWithOneField("unused", "x");
    f.properties.setText("collectionSubjectLanguages", "ab;cd;ef");
    f.properties.setText("collectionWorkingLanguages", "gh;ij");
    setResultXml(f.getXml());
    xexpect("Project/CollectionSubjectLanguages").toHaveCount(1);
    xexpect(
      "Project/CollectionSubjectLanguages[text()='ab;cd;ef']"
    ).toHaveCount(1);
    xexpect("Project/CollectionWorkingLanguages").toHaveCount(1);
    xexpect("Project/CollectionWorkingLanguages[text()='gh;ij']").toHaveCount(
      1
    );
    // and these we output for backwards compatibility
    xexpect("Project/VernacularISO3CodeAndName").toHaveCount(1);
    xexpect("Project/VernacularISO3CodeAndName[text()='ab']").toHaveCount(1);
    xexpect("Project/AnalysisISO3CodeAndName").toHaveCount(1);
    xexpect("Project/AnalysisISO3CodeAndName[text()='gh']").toHaveCount(1);
  });
});

function AttemptRoundTripOfOneField(
  key: string,
  xmlTag: string,
  content: string
) {
  const f = GetProjectFileWithOneField(xmlTag, content);
  f.save(true);
  let output = fs.readFileSync(f.metadataFilePath);
  let expected = `<${xmlTag}>${content}</${xmlTag}>`;
  if (output.indexOf(expected) < 0) {
    throw new Error(
      `Expected output to contain \r\n${expected}\r\n but got \r\n${output}`
    );
  }

  // now, can we change it and see it saved?
  const newValue = "something different";

  f.setTextProperty(key, newValue);

  f.save(true);
  output = fs.readFileSync(f.metadataFilePath);
  expected = `<${xmlTag}>${newValue}</${xmlTag}>`;
  if (output.indexOf(expected) < 0) {
    throw new Error(
      `Expected output to contain \r\n${expected}\r\n but got \r\n${output}`
    );
  }
}

export function GetProjectFileWithOneField(
  tag: string,
  content: string
): ProjectMetadataFile {
  fs.writeFileSync(
    Path.join(projectDirectory, projectName + ".sprj"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Project><${tag}>${content}</${tag}></Project>`
  );
  return new ProjectMetadataFile(
    projectDirectory,
    new EncounteredVocabularyRegistry()
  );
}
